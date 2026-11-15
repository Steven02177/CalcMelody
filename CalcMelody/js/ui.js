/**
 * ============================================================
 *  CalcMelody · ui.js
 *  Manipulación del DOM: selección de ejemplo/operación/orden/
 *  vista, construcción del modelo matemático, render de
 *  resultados (integral, derivada, gráfica, tabla, melodía) y
 *  control de los botones de audio.
 *
 *  Sincronización: la expresión, la variable, los límites, el
 *  procedimiento, el resultado y la gráfica salen SIEMPRE del
 *  mismo árbol sintáctico (AST), de modo que no pueden divergir.
 * ============================================================
 */
(function (global) {
  'use strict';

  const CM = global.CalcMelody;
  const EXP = CM.expresiones;
  const SIM = CM.simbolico;
  const PROC = CM.procedimientos;
  const $ = (sel) => document.querySelector(sel);

  /** Referencias a elementos del DOM (se resuelven en init()). */
  const refs = {};
  /** Notas generadas en el último cálculo. */
  let notasActuales = [];

  const N = (v) => ({ t: 'num', v: v });

  /* ----------------------------------------------------------
   *  Inicialización
   * ---------------------------------------------------------- */
  function init() {
    refs.selectEjemplo = $('#select-ejemplo');
    refs.selectOperacion = $('#select-operacion');
    refs.selectVista = $('#select-vista');
    refs.selectOrden = $('#select-orden');
    refs.btnCalcular = $('#btn-calcular');
    refs.btnReproducir = $('#btn-reproducir');
    refs.btnDetener = $('#btn-detener');
    refs.estado = $('#estado');

    refs.panelDerivada = $('#panel-derivada');
    refs.integralValor = $('#integral-valor');
    refs.integralExacto = $('#integral-exacto');
    refs.integralNota = $('#integral-nota');
    refs.integralInterpretacion = $('#integral-interpretacion');
    refs.integralPasos = $('#integral-pasos');

    // Controles de la función personalizada
    refs.panelPersonalizada = $('#panel-personalizada');
    refs.inputFuncion = $('#input-funcion');
    refs.inputXlim = $('#input-xlim');
    refs.inputYlim = $('#input-ylim');

    refs.derivadaExpresion = $('#derivada-expresion');
    refs.derivadaPasos = $('#derivada-pasos');
    refs.derivadaInterpretacion = $('#derivada-interpretacion');

    refs.grafica = $('#grafica');
    refs.tituloGrafica = $('#titulo-funcion-grafica');
    refs.graficaNota = $('#grafica-nota');

    refs.tablaCuerpo = $('#tabla-valores');
    refs.secuencia = $('#secuencia-notas');
    refs.melodiaInfo = $('#melodia-info');

    rellenarSelectorEjemplos();

    // Eventos
    refs.btnCalcular.addEventListener('click', calcular);
    refs.btnReproducir.addEventListener('click', reproducir);
    refs.btnDetener.addEventListener('click', detener);

    // Mostrar/ocultar los campos de la función personalizada
    refs.selectEjemplo.addEventListener('change', alternarFuncionPersonalizada);
    alternarFuncionPersonalizada();

    // Enter dentro de cualquier control dispara el cálculo
    document.querySelectorAll('.control-input').forEach((el) => {
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          calcular();
        }
      });
    });

    // Fórmulas estáticas del HTML (recordatorio del método general)
    if (CM.latex) CM.latex.renderizar(document.body);

    setBotonesMelodia(false);
    setEstado('Elige un ejemplo y pulsa el botón para empezar.');
  }

  /** Llena el <select> de ejemplos con los datos de ejemplos.js */
  function rellenarSelectorEjemplos() {
    CM.EJEMPLOS.forEach((ej, i) => {
      const opcion = document.createElement('option');
      opcion.value = String(i);
      opcion.textContent = `${i + 1} · ${ej.nombre}`;
      refs.selectEjemplo.appendChild(opcion);
    });

    // Última opción: permitir al usuario digitar su propia función
    const propia = document.createElement('option');
    propia.value = 'custom';
    propia.textContent = '✎ Función personalizada (escribir la mía)';
    refs.selectEjemplo.appendChild(propia);
  }

  /** Muestra u oculta los campos f(x,y), límites de x e y. */
  function alternarFuncionPersonalizada() {
    const activo = refs.selectEjemplo.value === 'custom';
    refs.panelPersonalizada.hidden = !activo;
    if (activo) refs.inputFuncion.focus();
  }

  /* ----------------------------------------------------------
   *  Límites de integración (números o expresiones)
   * ---------------------------------------------------------- */
  /**
   * Convierte el texto de límites ("−1, 1", "0, x", "0, pi/2")
   * en un par de ASTs [inferior, superior].
   */
  function parsearLimites(texto, etiqueta) {
    const limpio = String(texto).replace(/−/g, '-').trim();
    const partes = limpio.split(/[,;:\s]+/).filter((p) => p !== '');
    if (partes.length !== 2) {
      throw new Error(`Escribe los límites de ${etiqueta} como: a, b (ejemplo: -1, 1).`);
    }
    const asts = partes.map((p) => {
      if (/^-?(\d+\.?\d*|\.\d+)$/.test(p)) return N(Number(p));
      // Expresión admisible (x, y, pi/2, 2*x+1 …): se analiza sin eval()
      return EXP.parsear(p);
    });

    // Compatibilidad con el comportamiento anterior: si ambos son
    // números se reordenan siempre como [inferior, superior].
    const a0 = asts[0], a1 = asts[1];
    const esNum = (n) => n.t === 'num';
    if (esNum(a0) && esNum(a1)) {
      if (a0.v === a1.v) {
        throw new Error(`Los límites de ${etiqueta} no pueden ser iguales (${a0.v} = ${a1.v}).`);
      }
      return a0.v < a1.v ? [a0, a1] : [a1, a0];
    }
    return [a0, a1];
  }

  /**
   * Comprueba que los límites sean válidos para el orden elegido:
   *  · la integral EXTERNA (sus límites) debe ser constante;
   *  · la integral INTERNA no puede depender de su propia variable,
   *    pero sí de la variable externa (límites variables).
   */
  function validarLimites(lims, orden) {
    const interno = orden === 'dydx' ? 'y' : 'x';
    const externo = orden === 'dydx' ? 'x' : 'y';
    const li = orden === 'dydx' ? lims.y : lims.x;
    const le = orden === 'dydx' ? lims.x : lims.y;

    li.forEach((n, i) => {
      if (EXP.depende(n, interno)) {
        throw new Error(
          `El límite ${i === 0 ? 'inferior' : 'superior'} de ${interno} no puede depender de ${interno}: ` +
          'los límites variables deben expresarse en la otra variable (ejemplo: 0, x para ∫₀ˣ).'
        );
      }
    });
    le.forEach((n, i) => {
      if (EXP.depende(n, externo) || EXP.depende(n, interno)) {
        throw new Error(
          `El límite ${i === 0 ? 'inferior' : 'superior'} de la integral externa (${externo}) ` +
          'debe ser una constante numérica (ejemplo: 0, 1).'
        );
      }
      const v = SIM.valorNumerico(n);
      if (v === null) {
        throw new Error(`El límite ${i === 0 ? 'inferior' : 'superior'} de ${externo} no es un número válido.`);
      }
    });
  }

  /**
   * Convierte los AST de límites en números o funciones del valor
   * de la variable externa (para la integración numérica).
   */
  function limitesNumericos(lims, orden) {
    const conv = (ast) => {
      if (!EXP.depende(ast, 'x') && !EXP.depende(ast, 'y')) {
        const v = EXP.evaluar(ast, 0, 0);
        if (!Number.isFinite(v)) throw new Error('Límite no válido: ' + SIM.aLatex(ast));
        return v;
      }
      // depende de la variable externa
      return orden === 'dydx'
        ? (x) => EXP.evaluar(ast, x, 0)
        : (y) => EXP.evaluar(ast, 0, y);
    };
    return {
      x: [conv(lims.x[0]), conv(lims.x[1])],
      y: [conv(lims.y[0]), conv(lims.y[1])]
    };
  }

  /** Dominio (rectángulo que contiene a la región) para graficar. */
  function dominioGrafica(limsNum, orden, muestras = 48) {
    const rango = (fn0, fn1, base0, base1, esFuncion) => {
      if (!esFuncion) return [Math.min(base0, base1), Math.max(base0, base1)];
      let lo = Infinity, hi = -Infinity;
      for (let i = 0; i <= muestras; i++) {
        const t = base0 + ((base1 - base0) * i) / muestras;
        for (const fn of [fn0, fn1]) {
          const v = typeof fn === 'function' ? fn(t) : fn;
          if (Number.isFinite(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
        }
      }
      return lo <= hi ? [lo, hi] : [base0, base1];
    };

    if (orden === 'dydx') {
      const x0 = limsNum.x[0], x1 = limsNum.x[1];
      const esFnY = typeof limsNum.y[0] === 'function' || typeof limsNum.y[1] === 'function';
      return { x: [Math.min(x0, x1), Math.max(x0, x1)], y: rango(limsNum.y[0], limsNum.y[1], x0, x1, esFnY) };
    }
    const y0 = limsNum.y[0], y1 = limsNum.y[1];
    const esFnX = typeof limsNum.x[0] === 'function' || typeof limsNum.x[1] === 'function';
    return { y: [Math.min(y0, y1), Math.max(y0, y1)], x: rango(limsNum.x[0], limsNum.x[1], y0, y1, esFnX) };
  }

  /** Contorno de la región de integración (para la gráfica). */
  function poligonoRegion(limsNum, orden, muestras = 60) {
    const pts = [];
    const push = (x, y) => {
      if (Number.isFinite(x) && Number.isFinite(y)) pts.push([x, y]);
    };
    const evaluar = (lim, t) => (typeof lim === 'function' ? lim(t) : lim);

    if (orden === 'dydx') {
      const [x0, x1] = [limsNum.x[0], limsNum.x[1]];
      for (let i = 0; i <= muestras; i++) {
        const x = x0 + ((x1 - x0) * i) / muestras;
        push(x, evaluar(limsNum.y[0], x));
      }
      for (let i = muestras; i >= 0; i--) {
        const x = x0 + ((x1 - x0) * i) / muestras;
        push(x, evaluar(limsNum.y[1], x));
      }
    } else {
      const [y0, y1] = [limsNum.y[0], limsNum.y[1]];
      for (let i = 0; i <= muestras; i++) {
        const y = y0 + ((y1 - y0) * i) / muestras;
        push(evaluar(limsNum.x[1], y), y);
      }
      for (let i = muestras; i >= 0; i--) {
        const y = y0 + ((y1 - y0) * i) / muestras;
        push(evaluar(limsNum.x[0], y), y);
      }
    }
    return pts.length >= 3 ? pts : null;
  }

  /* ----------------------------------------------------------
   *  Modelo matemático (ejemplo predefinido o personalizado)
   * ---------------------------------------------------------- */
  /** Analiza la expresión de un ejemplo predefinido (memoizado). */
  function prepararEjemplo(ej) {
    if (!ej.ast) {
      ej.ast = EXP.parsear(ej.expresion);
      ej.limsAst = { x: [N(ej.xlim[0]), N(ej.xlim[1])], y: [N(ej.ylim[0]), N(ej.ylim[1])] };
    }
    return ej;
  }

  /** Construye el modelo a partir de lo que escribió el usuario. */
  function construirModeloPersonalizado() {
    const texto = refs.inputFuncion.value.trim();
    const ast = EXP.parsear(texto); // sin eval(): análisis sintáctico
    const limsAst = {
      x: parsearLimites(refs.inputXlim.value, 'x'),
      y: parsearLimites(refs.inputYlim.value, 'y')
    };
    return {
      id: 'personalizada',
      nombre: 'f(x,y) = ' + texto,
      expresion: texto,
      ast: ast,
      funcion: (x, y) => EXP.evaluar(ast, x, y),
      limsAst: limsAst,
      valorExacto: null,
      valorExactoStr: null,
      interpretacion:
        'Valor numérico (Simpson ' + '60 × 60' + ') de ∬ (' + texto + ') dA sobre la región ' +
        'determinada por los límites ingresados. Al ser una función escrita a mano, ' +
        'CalcMelody muestra el resultado exacto cuando existe primitiva elemental ' +
        'y, si no, indica claramente que usa integración numérica.',
      pasos: null,
      personalizada: true
    };
  }

  /** Devuelve el modelo completo listo para calcular. */
  function obtenerModelo() {
    if (refs.selectEjemplo.value === 'custom') return construirModeloPersonalizado();
    const ej = CM.EJEMPLOS[Number(refs.selectEjemplo.value) || 0];
    prepararEjemplo(ej);
    return ej;
  }

  /* ----------------------------------------------------------
   *  Flujo principal: calcular → graficar → sonificar
   * ---------------------------------------------------------- */
  function calcular() {
    try {
      // --- 1) Modelo matemático ---
      const modelo = obtenerModelo();
      const operacion = refs.selectOperacion.value;
      const vista = refs.selectVista.value;
      const orden = refs.selectOrden ? refs.selectOrden.value : 'dydx';
      const interno = orden === 'dydx' ? 'y' : 'x';

      // --- 2) Límites y validación del orden ---
      const limsAst = modelo.limsAst;
      validarLimites(limsAst, orden);
      const limsNum = limitesNumericos(limsAst, orden);
      const dominio = dominioGrafica(limsNum, orden);

      setEstado('⏳ Calculando el procedimiento, la integral y la gráfica…');

      // --- 3) Derivada parcial pedida (paso a paso simbólico) ---
      let resDerivada = null;
      let fnActiva = modelo.funcion;
      let etiquetaActiva = 'f(x,y)';
      if (operacion !== 'integral') {
        const v = operacion === 'dx' ? 'x' : 'y';
        resDerivada = PROC.pasosDerivada(modelo.ast, v);
        fnActiva = (x, y) => EXP.evaluar(resDerivada.resultado, x, y);
        etiquetaActiva = v === 'x' ? '\\frac{\\partial f}{\\partial x}' : '\\frac{\\partial f}{\\partial y}';
      }

      // --- 4) Integral doble: simbólica + comprobación numérica ---
      const numerica = CM.calculo.integralNumerica(modelo.funcion, orden, limsNum.x, limsNum.y, 60);
      const ctx = {
        texto: modelo.expresion,
        funcion: modelo.funcion,
        limitesNum: limsNum,
        numerico: numerica,
        n: 60,
        exactoStr: modelo.valorExactoStr
      };
      const resIntegral = PROC.resolverIntegral(modelo.ast, orden, limsAst, ctx);
      const exacto = modelo.valorExacto;
      const error = CM.calculo.errorVsExacto(numerica, exacto);

      // --- 5) Muestreo: 24 puntos (dos diagonales) + notas ---
      const puntosDominio = CM.melodia.muestrearDominio(dominio.x, dominio.y, 24);
      const puntos = CM.melodia.puntosANotas(puntosDominio, fnActiva);

      // --- 6) Gráfica (superficie activa + región + referencia) ---
      const region = poligonoRegion(limsNum, orden);
      const comparacion = resDerivada
        ? { fn: modelo.funcion, etiqueta: 'f(x,y) (original)' }
        : null;

      CM.grafica.graficar(refs.grafica, {
        funcion: fnActiva,
        xlim: dominio.x,
        ylim: dominio.y,
        vista: vista,
        puntos: puntos,
        titulo: tituloGrafica(modelo, operacion, orden),
        region: region,
        comparacion: comparacion
      });

      // --- 7) Render de los resultados ---
      renderIntegral(modelo, resIntegral, numerica, error, orden, interno);
      renderNotaOperacion(operacion, modelo);
      renderDerivada(resDerivada, modelo, operacion);
      renderGraficaNota(modelo, operacion, orden, region, dominio);
      renderTabla(puntos);
      notasActuales = puntos;
      renderSecuencia(puntos);

      setBotonesMelodia(true);

      if (!Number.isFinite(numerica) && resIntegral.symbolic) {
        setEstado('✔ Procedimiento simbólico completado. La integración numérica no convergió en ese dominio (¿asíntotas dentro de la región?).', 'ok');
      } else if (!Number.isFinite(numerica)) {
        setEstado('⚠ La integral no converge en ese dominio (¿la función tiende a infinito o tiene asíntotas dentro de la región?). La gráfica y la melodía se muestran igual.', 'error');
      } else {
        setEstado(
          '✔ Listo: ' + (resIntegral.symbolic ? 'resultado exacto ' + resIntegral.resultadoTex.replace(/\\frac\{(\d+)\}\{(\d+)\}/, '$1/$2') + ' · ' : '') +
          'integral ≈ ' + CM.calculo.formatear(numerica) + ' · ' + puntos.length + ' notas pentatónicas listas.',
          'ok'
        );
      }
    } catch (err) {
      console.error('[CalcMelody]', err);
      setEstado('⚠ No se pudo completar el cálculo: ' + err.message, 'error');
    }
  }

  function tituloGrafica(modelo, operacion, orden) {
    const base = 'f(x,y) = ' + modelo.expresion;
    if (operacion === 'dx') return 'Derivada parcial ∂f/∂x de ' + base;
    if (operacion === 'dy') return 'Derivada parcial ∂f/∂y de ' + base;
    return 'Superficie de ' + base + ' · región R (d' + (orden === 'dydx' ? 'y dx' : 'x dy') + ')';
  }

  /* ----------------------------------------------------------
   *  Render de resultados
   * ---------------------------------------------------------- */

  /** Integral: valor, exacto, interpretación y procedimiento. */
  function renderIntegral(modelo, res, numerica, error, orden, interno) {
    const texR = (t) => '<span class="tex">' + t + '</span>';

    // Valor principal (exacto simbólico si existe; si no, numérico)
    if (res.symbolic) {
      refs.integralValor.innerHTML =
        texR('\\iint_R f(x,y)\\,dA = ' + res.resultadoTex);
    } else {
      refs.integralValor.innerHTML =
        texR('\\iint_R f(x,y)\\,dA \\approx ' + CM.calculo.formatear(numerica, 6));
    }

    // Valor exacto de referencia + comprobación numérica
    let linea;
    if (res.symbolic) {
      linea = 'Resultado exacto: ' + texR(res.resultadoTex);
      if (res.resultadoValor !== null && Number.isFinite(numerica)) {
        const d = Math.abs(res.resultadoValor - numerica);
        linea += ' <span class="comparacion">· decimal ' +
          CM.calculo.formatear(res.resultadoValor, 6) +
          ' · Simpson Δ = ' + d.toExponential(1) + '</span>';
      }
      if (modelo.valorExactoStr) {
        linea += '<br>Referencia del ejemplo: <b>' + PROC.esc(modelo.valorExactoStr) + '</b>';
      }
    } else {
      linea = 'Valor exacto: <b>no disponible</b> — ' + PROC.prosaTex(PROC.esc(res.motivo)) +
        '. Se usó integración numérica (Simpson 60 × 60).';
    }
    refs.integralExacto.innerHTML = linea;
    refs.integralInterpretacion.textContent = modelo.interpretacion;

    // Procedimiento paso a paso (dinámico)
    let html = res.html;
    if (modelo.pasos) {
      html += '<details class="notas-ejemplo"><summary>Notas y comprobación comentadas del ejemplo</summary>' +
        modelo.pasos + '</details>';
    }
    refs.integralPasos.innerHTML = html;
    CM.latex.renderizar(refs.integralPasos);
    CM.latex.renderizar(refs.integralValor);
    CM.latex.renderizar(refs.integralExacto);
  }

  /**
   * Nota aclaratoria: el selector Operación nunca cambia la función que se
   * integra. Afecta solo a la derivación, la gráfica, la tabla y la melodía.
   */
  function renderNotaOperacion(operacion, modelo) {
    const tex = (t) => '<span class="tex">' + t + '</span>';
    const fTex = SIM.aLatex(modelo.ast);
    let html;
    if (operacion === 'integral') {
      html = 'Selector <strong>Operación = Integral</strong>: la función integrada es ' +
        'siempre la original ' + tex('f(x,y) = ' + fTex) + '. ' +
        'El orden ' + tex('dy\\,dx') + ' / ' + tex('dx\\,dy') + ' solo ' +
        'cambia el orden de integración (teorema de Fubini), no el valor.';
    } else {
      const v = operacion === 'dx' ? 'x' : 'y';
      html = 'Selector <strong>Operación = ∂f/∂' + v + '</strong>: eso cambia solo el ' +
        'procedimiento de derivación y la gráfica, la tabla y la melodía. ' +
        'La integral doble de abajo <strong>siempre se calcula sobre la función original</strong> ' +
        tex('f(x,y) = ' + fTex) + ', sin importar el valor del selector.';
    }
    refs.integralNota.innerHTML = html;
    refs.integralNota.hidden = false;
    CM.latex.renderizar(refs.integralNota);
  }

  /** Panel de derivada: visible solo si el usuario la pidió. */
  function renderDerivada(res, modelo, operacion) {
    if (!res) {
      refs.panelDerivada.hidden = true;
      return;
    }
    refs.panelDerivada.hidden = false;

    refs.derivadaExpresion.innerHTML =
      '<span class="tex">' + res.texto + '</span>';

    refs.derivadaPasos.innerHTML = res.html;
    CM.latex.renderizar(refs.derivadaExpresion);
    CM.latex.renderizar(refs.derivadaPasos);

    const v = operacion === 'dx' ? 'x' : 'y';
    const propio = modelo.interpretacionDx && v === 'x'
      ? modelo.interpretacionDx
      : (modelo.interpretacionDy && v === 'y' ? modelo.interpretacionDy : null);
    refs.derivadaInterpretacion.innerHTML =
      (propio ? PROC.esc(propio) + ' ' : '') +
      'En cada punto (x, y) esta derivada mide la pendiente de la superficie al ' +
      'avanzar en la dirección de <b>' + v + '</b>, manteniendo la otra variable fija. ' +
      'La gráfica, la tabla y la melodía muestran ahora <span class="tex">' +
      res.resultadoTex + '</span>.';
    CM.latex.renderizar(refs.derivadaInterpretacion);
  }

  /** Nota bajo la gráfica: qué se está dibujando exactamente. */
  function renderGraficaNota(modelo, operacion, orden, region, dominio) {
    if (!refs.graficaNota) return;
    const tex = (t) => '<span class="tex">' + t + '</span>';
    let html = 'Gráfica de ';
    html += operacion === 'integral'
      ? tex('z = f(x,y) = ' + SIM.aLatex(modelo.ast))
      : tex('z = ' + (operacion === 'dx'
          ? '\\frac{\\partial f}{\\partial x}'
          : '\\frac{\\partial f}{\\partial y}'));
    html += ' sobre la región de integración R = [' +
      tex(SIM.aLatex(N(dominio.x[0])) + ',\\; ' + SIM.aLatex(N(dominio.x[1]))) + '] × [' +
      tex(SIM.aLatex(N(dominio.y[0])) + ',\\; ' + SIM.aLatex(N(dominio.y[1]))) + ']' +
      (region ? ' (línea violeta punteada)' : '') + '.';
    if (operacion !== 'integral') {
      html += ' En gris semitransparente se dibuja la función original f(x,y) para comparar.';
    }
    refs.graficaNota.innerHTML = html;
    CM.latex.renderizar(refs.graficaNota);
  }

  /** Tabla: # | x | y | z | Nota */
  function renderTabla(puntos) {
    const filas = puntos
      .map((p) => {
        const zTxt = Number.isFinite(p.z) ? CM.calculo.formatear(p.z, 4) : '—';
        return `
          <tr>
            <td class="col-num">${p.indice}</td>
            <td>${p.x.toFixed(3)}</td>
            <td>${p.y.toFixed(3)}</td>
            <td>${zTxt}</td>
            <td><span class="nota-chip">${p.nota}</span></td>
          </tr>`;
      })
      .join('');
    refs.tablaCuerpo.innerHTML = filas;
  }

  /** Secuencia de notas como "chips" visuales. */
  function renderSecuencia(puntos) {
    refs.secuencia.innerHTML = puntos
      .map(
        (p) =>
          `<span class="nota-chip nota-chip--grande" title="z = ${
            Number.isFinite(p.z) ? p.z.toFixed(4) : '—'
          } · normalizado ${p.normalizado.toFixed(2)}">${p.nota}</span>`
      )
      .join('');

    const f0 = puntos[0] ? puntos[0].nota : '—';
    const fN = puntos[puntos.length - 1] ? puntos[puntos.length - 1].nota : '—';
    refs.melodiaInfo.textContent = `${puntos.length} notas · escala pentatónica mayor de Do · de ${f0} a ${fN}`;
  }

  /* ----------------------------------------------------------
   *  Audio
   * ---------------------------------------------------------- */
  function reproducir() {
    if (!notasActuales.length) return;
    try {
      CM.melodia.reproducir(notasActuales, {
        duracion: 0.28,
        alTerminar: () => setBotonesMelodia(true)
      });
      setBotonesMelodia(false, true);
      setEstado('🔊 Reproduciendo la melodía…', 'ok');
    } catch (err) {
      setEstado('⚠ Error de audio: ' + err.message, 'error');
    }
  }

  function detener() {
    const estaba = CM.melodia.detener();
    setBotonesMelodia(true);
    if (estaba) setEstado('⏹ Melodía detenida.');
  }

  /** Activa/desactiva los botones de reproducción. */
  function setBotonesMelodia(hayMelodia, sonando = false) {
    refs.btnReproducir.disabled = !hayMelodia || sonando;
    refs.btnDetener.disabled = !sonando;
  }

  /* ----------------------------------------------------------
   *  Utilidades de UI
   * ---------------------------------------------------------- */
  function setEstado(texto, tipo) {
    refs.estado.textContent = texto;
    refs.estado.className = 'estado' + (tipo ? ' estado--' + tipo : '');
  }

  global.CalcMelody.ui = { init: init, calcular: calcular };
})(window);
