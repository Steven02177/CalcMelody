/**
 * ============================================================
 *  CalcMelody · procedimientos.js
 *  Generador DINÁMICO de procedimientos matemáticos.
 *
 *  · pasosDerivada(ast, v)         → desarrollo completo de ∂f/∂v
 *                                    (reglas identificadas, operaciones
 *                                     intermedias, simplificación)
 *  · resolverIntegral(ast, orden, limites, ctx)
 *                                  → integral doble resuelta con
 *                                    procedimiento paso a paso
 *  · aHTML(pasos)                  → HTML listo para pintar
 *
 *  Todos los pasos se construyen a partir del árbol sintáctico real:
 *  no hay textos preescritos ni resultados "a mano".
 *  Las fórmulas se envuelven en <span class="tex">…</span> y las
 *  renderiza KaTeX (ver latex.js).
 * ============================================================
 */
(function (global) {
  'use strict';

  const CM = global.CalcMelody;
  const EXP = CM.expresiones;
  const SIM = CM.simbolico;

  const procedimientos = {};

  /* ----------------------------------------------------------
   *  Utilidades de HTML / LaTeX
   * ---------------------------------------------------------- */
  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /** Fórmula en bloque. */
  function bloque(tex) {
    return '<div class="formula"><span class="tex">' + tex + '</span></div>';
  }

  /** Fórmula en línea (dentro de un texto). */
  function enTex(tex) {
    return '<span class="tex">' + tex + '</span>';
  }

  /**
   * Convierte las fórmulas marcadas como \(…\) dentro de un texto
   * (notas de los pasos) en <span class="tex">…</span> para KaTeX.
   * El texto sin marcadores se devuelve tal cual.
   */
  function prosaTex(txt) {
    const s = String(txt);
    const partes = s.split('\\(');
    if (partes.length === 1) return s;
    let out = partes[0];
    for (let i = 1; i < partes.length; i++) {
      const fin = partes[i].indexOf('\\)');
      if (fin === -1) { out += '\\(' + partes[i]; continue; }
      out += enTex(partes[i].slice(0, fin)) + partes[i].slice(fin + 2);
    }
    return out;
  }

  /**
   * Convierte la lista de pasos [{titulo, cuerpo}] en HTML
   * de la lista numerada que usa la hoja de estilos.
   */
  function aHTML(pasos) {
    return '<ol class="pasos-lista">' + pasos.map((p, i) => {
      const titulo = '<strong>Paso ' + (i + 1) + ' · ' + esc(p.titulo) + '.</strong>';
      return '<li>' + titulo + (p.cuerpo || '') + '</li>';
    }).join('') + '</ol>';
  }

  /* ==========================================================
   *  DERIVADAS PARCIALES
   * ========================================================== */

  /** Regla aplicada a un nodo, con su fórmula y notas. */
  function infoRegla(n, v) {
    switch (n.t) {
      case 'bin':
        if (n.op === '+' || n.op === '-') {
          return {
            regla: 'Regla de la suma y la resta',
            nota: enTex('\\frac{\\partial}{\\partial ' + v + '}(u \\pm w) = ' +
              '\\frac{\\partial u}{\\partial ' + v + '} \\pm \\frac{\\partial w}{\\partial ' + v + '}') +
              ' — se deriva término a término.'
          };
        }
        if (n.op === '*') {
          return {
            regla: 'Regla del producto',
            nota: enTex('\\frac{\\partial}{\\partial ' + v + '}(u\\cdot w) = ' +
              '\\frac{\\partial u}{\\partial ' + v + '}\\cdot w + u\\cdot\\frac{\\partial w}{\\partial ' + v + '}') +
              ' — factores constantes (si los hay) derivan 0.'
          };
        }
        if (n.op === '/') {
          return {
            regla: 'Regla del cociente',
            nota: enTex('\\frac{\\partial}{\\partial ' + v + '}\\left(\\frac{u}{w}\\right) = ' +
              '\\frac{\\frac{\\partial u}{\\partial ' + v + '}\\cdot w - u\\cdot\\frac{\\partial w}{\\partial ' + v + '}}{w^{2}}')
          };
        }
        if (n.op === '^') {
          const expConsta = !EXP.depende(n.b, v);
          const baseConsta = !EXP.depende(n.a, v);
          if (expConsta) {
            return {
              regla: 'Regla de la potencia',
              nota: enTex('\\frac{\\partial}{\\partial ' + v + '}(u^{n}) = n\\,u^{n-1}\\cdot' +
                '\\frac{\\partial u}{\\partial ' + v + '}') +
                ' — el exponente ' + enTex(SIM.aLatex(n.b)) + ' no depende de ' + v + '.'
            };
          }
          if (baseConsta) {
            return {
              regla: 'Regla de la potencia para base constante (exponencial)',
              nota: enTex('\\frac{\\partial}{\\partial ' + v + '}(c^{u}) = c^{u}\\ln(c)\\cdot' +
                '\\frac{\\partial u}{\\partial ' + v + '}')
            };
          }
          return {
            regla: 'Regla de la potencia general',
            nota: enTex('\\frac{\\partial}{\\partial ' + v + '}(u^{w}) = u^{w}\\left(' +
              '\\frac{\\partial w}{\\partial ' + v + '}\\ln u + ' +
              'w\\frac{\\partial u}{\\partial ' + v + '}\\cdot\\frac{1}{u}\\right)')
          };
        }
        break;
      case 'call': {
        const u = n.args[0];
        let fprima = '';
        try {
          fprima = SIM.aLatex(EXP.derivadaFuncion(n.name, u));
        } catch (e) { fprima = ''; }
        return {
          regla: 'Regla de la cadena',
          nota: enTex('\\frac{\\partial}{\\partial ' + v + '}F(u) = F\'(u)\\cdot' +
            '\\frac{\\partial u}{\\partial ' + v + '}') +
            ' con ' + enTex('u = ' + SIM.aLatex(u)) +
            (fprima ? ' y ' + enTex('F\'(u) = ' + fprima) : '') + '.'
        };
      }
      case 'neg':
        return {
          regla: 'Propiedad del signo',
          nota: 'La derivada de −u es −(∂u/∂' + v + ').'
        };
    }
    return { regla: 'Regla de derivación', nota: '' };
  }

  /** Nota automática cuando un factor NO depende de la variable. */
  function notaConstante(nodo, v) {
    if (EXP.depende(nodo, v)) return '';
    return ' ' + enTex(SIM.aLatex(nodo)) + ' no depende de ' + v +
      ', por lo que su derivada parcial vale 0.';
  }

  /**
   * Desarrolla la derivada parcial de `ast` respecto de `v`
   * registrando cada regla aplicada y cada operación intermedia.
   *
   * @returns {{pasos:Array, resultado:object, resultadoTex:string, texto:string}}
   */
  function pasosDerivada(ast, v) {
    const pasos = [];
    const etiqueta = v === 'x' ? '\\partial x' : '\\partial y';

    /* ---- Paso de planteamiento + clasificación de términos ---- */
    const terminos = SIM.terminos(ast);
    const clasif = terminos.map((t) => {
      const esConst = !EXP.depende(t.nodo, v);
      return enTex(SIM.aLatex(t.nodo)) + ' → ' +
        (esConst
          ? '<em>constante respecto a ' + v + '</em> (deriva 0)'
          : '<em>depende de ' + v + '</em>');
    });
    pasos.push({
      titulo: 'Función original y variable de derivación',
      cuerpo: bloque('f(x,y) = ' + SIM.aLatex(ast)) +
        '<p class="nota-tecnica">Se deriva respecto de <b>' + v + '</b>; ' +
        (v === 'x' ? 'y' : 'x') + ' se trata como constante. ' +
        'Términos de la suma: ' + clasif.join(' · ') + '.</p>'
    });

    /* ---- Recursión por reglas ---- */
    function derivarPaso(n) {
      if (!n) return;
      const antes = '\\frac{\\partial}{\\partial ' + v + '}\\left(' + SIM.aLatex(n) + '\\right)';

      if (n.t === 'num' || n.t === 'const') {
        pasos.push({
          titulo: 'Derivada de una constante',
          cuerpo: bloque(antes + ' = 0') +
            '<p class="nota-tecnica">Las constantes (números, ' +
            enTex('\\pi') + ', ' + enTex('e') + ') tienen derivada cero.</p>'
        });
        return;
      }
      if (n.t === 'var') {
        const esVar = n.name === v;
        pasos.push({
          titulo: esVar ? 'Derivada de la variable de derivación'
                        : 'Variable distinta: se trata como constante',
          cuerpo: bloque(antes + ' = ' + (esVar ? '1' : '0')) +
            '<p class="nota-tecnica">' +
            (esVar
              ? 'La derivada de ' + n.name + ' respecto de sí mismo vale 1.'
              : n.name + ' no es la variable de derivación, así que su derivada parcial vale 0.') +
            '</p>'
        });
        return;
      }

      const crudo = EXP.derivar(n, v);
      const simpl = SIM.simplificar(crudo);
      const tCrudo = SIM.aLatex(crudo);
      const tSimpl = SIM.aLatex(simpl);

      const info = infoRegla(n, v);
      const lineas = [antes + ' = ' + tCrudo];
      if (tCrudo !== tSimpl) lineas.push('= ' + tSimpl);

      let nota = info.nota;
      if (n.t === 'bin' && n.op === '*') {
        nota += notaConstante(n.a, v) + notaConstante(n.b, v);
      } else if (n.t === 'bin' && n.op === '/') {
        nota += notaConstante(n.a, v) + notaConstante(n.b, v);
      } else if (n.t === 'bin' && n.op === '^') {
        // El exponente constante ya se menciona en la nota de la regla de la potencia.
        if (!EXP.depende(n.a, v) && EXP.depende(n.b, v)) nota += notaConstante(n.a, v);
      }

      pasos.push({
        titulo: info.regla,
        cuerpo: lineas.map(bloque).join('') +
          (nota ? '<p class="nota-tecnica">' + nota + '</p>' : '')
      });

      /* Recursión sobre los factores que aportan a la derivada */
      if (n.t === 'bin' && (n.op === '+' || n.op === '-')) {
        derivarPaso(n.a);
        derivarPaso(n.b);
      } else if (n.t === 'bin' && (n.op === '*' || n.op === '/')) {
        if (EXP.depende(n.a, v)) derivarPaso(n.a);
        if (EXP.depende(n.b, v)) derivarPaso(n.b);
      } else if (n.t === 'bin' && n.op === '^') {
        if (EXP.depende(n.a, v)) derivarPaso(n.a);
        if (EXP.depende(n.b, v)) derivarPaso(n.b);
      } else if (n.t === 'call') {
        if (EXP.depende(n.args[0], v)) derivarPaso(n.args[0]);
      } else if (n.t === 'neg') {
        derivarPaso(n.a);
      }
    }

    derivarPaso(ast);

    /* ---- Simplificación final y resultado ---- */
    const crudoFinal = EXP.derivar(ast, v);
    const final = SIM.simplificar(crudoFinal);
    const tCrudo = SIM.aLatex(crudoFinal);
    const tFinal = SIM.aLatex(final);

    if (tCrudo !== tFinal) {
      pasos.push({
        titulo: 'Simplificación',
        cuerpo: bloque(tCrudo) + bloque('= ' + tFinal) +
          '<p class="nota-tecnica">Se agrupan términos semejantes, se factorizan ' +
          'constantes y se cancelan factores comunes.</p>'
      });
    }

    pasos.push({
      titulo: 'Resultado final',
      cuerpo: bloque('\\frac{\\partial f}{\\partial ' + v + '} = ' + tFinal)
    });

    return {
      pasos: pasos,
      resultado: final,
      resultadoTex: tFinal,
      html: aHTML(pasos),
      texto: '\\frac{\\partial f}{\\partial ' + v + '} = ' + tFinal
    };
  }

  /* ==========================================================
   *  INTEGRALES DOBLES
   * ========================================================== */

  /** Convierte los subpasos {regla, antes, despues, nota} en pasos HTML. */
  function pasosDeReglas(reglas) {
    return reglas.map((r) => ({
      titulo: r.regla,
      cuerpo: bloque(r.antes + ' = ' + r.despues) +
        (r.nota ? '<p class="nota-tecnica">' + prosaTex(r.nota) + '</p>' : '')
    }));
  }

  /** Pasos del método numérico (Simpson anidado) cuando falta primitiva. */
  function pasosNumericos(ctx, orden, interno, externo, motivo) {
    const f = ctx.funcion;
    const n = ctx.n || 60;
    const limI = ctx.limitesNum[interno];   // [c, d] (número o función del otro)
    const limE = ctx.limitesNum[externo];   // [a, b] constantes
    const esFn = (z) => typeof z === 'function';
    const valI = (t) => (esFn(limI[0]) ? limI[0](t) : limI[0]);
    const valI1 = (t) => (esFn(limI[1]) ? limI[1](t) : limI[1]);
    const valE = (t) => (esFn(limE[0]) ? limE[0](t) : limE[0]);
    const valE1 = (t) => (esFn(limE[1]) ? limE[1](t) : limE[1]);

    const g = (t) => CM.calculo.simpsonUnico(
      (s) => (externo === 'x' ? f(t, s) : f(s, t)),
      valI(t), valI1(t), n
    );
    const total = CM.calculo.simpsonUnico(g, valE(0), valE1(0), n);

    const fmt = (z) => CM.calculo.formatear(z, 6);
    const a = valE(0), b = valE1(0);
    const xm = (a + b) / 2;
    const N = (z) => ({ t: 'num', v: z });

    const filas = [
      '<div class="subpaso">' + enTex('g\\left(' + SIM.aLatex(N(a)) + '\\right)') + ' ≈ <b>' + fmt(g(a)) + '</b></div>',
      '<div class="subpaso">' + enTex('g\\left(' + SIM.aLatex(N(xm)) + '\\right)') + ' ≈ <b>' + fmt(g(xm)) + '</b> (punto medio)</div>',
      '<div class="subpaso">' + enTex('g\\left(' + SIM.aLatex(N(b)) + '\\right)') + ' ≈ <b>' + fmt(g(b)) + '</b></div>'
    ].join('');

    return [
      {
        titulo: '¿Por qué se usa un método numérico?',
        cuerpo: '<p class="nota-tecnica">' + prosaTex(esc(motivo)) +
          '. CalcMelody no inventa una primitiva inexistente: aplica integración ' +
          'numérica y lo indica claramente.</p>'
      },
      {
        titulo: 'Integral interna (' + 'd' + interno + ') numérica',
        cuerpo: '<p>Para cada valor de ' + externo + ' se calcula</p>' +
          bloque('\\int g\\,d' + interno + ' \\approx \\text{Simpson compuesto con } n = ' + n) +
          '<p class="nota-tecnica">Valores de la función reducida:</p>' + filas
      },
      {
        titulo: 'Integral externa (d' + externo + ') numérica',
        cuerpo: bloque('\\int_{' + SIM.aLatex(a) + '}^{' + SIM.aLatex(b) +
          '} g\\,' + 'd' + externo + ' \\approx \\text{Simpson compuesto con } n = ' + n)
      },
      {
        titulo: 'Resultado numérico',
        cuerpo: bloque('\\iint_R f\\,dA \\approx ' + fmt(total)) +
          '<p class="nota-tecnica">Se evalúan ' + ((n + 1) * (n + 1)) +
          ' puntos de la malla (' + n + ' × ' + n + ' subdivisiones).</p>'
      }
    ];
  }

  /**
   * Resuelve una integral doble y construye su procedimiento completo.
   *
   * @param {object} ast      AST del integrando f(x,y)
   * @param {string} orden    'dydx' | 'dxdy'
   * @param {object} limites  {x:[AST,AST], y:[AST,AST]}
   * @param {object} ctx      {texto, funcion, limitesNum, numerico, n, exactoStr}
   * @returns {object} {pasos, symbolic, resultadoTex, resultado, motivo, html}
   */
  function resolverIntegral(ast, orden, limites, ctx) {
    const interno = orden === 'dydx' ? 'y' : 'x';
    const externo = orden === 'dydx' ? 'x' : 'y';
    const limI = orden === 'dydx' ? limites.y : limites.x;
    const limE = orden === 'dydx' ? limites.x : limites.y;
    const n = (ctx && ctx.n) || 60;
    const pasos = [];

    const texIntegral =
      '\\int_{' + SIM.aLatex(limE[0]) + '}^{' + SIM.aLatex(limE[1]) + '}' +
      '\\int_{' + SIM.aLatex(limI[0]) + '}^{' + SIM.aLatex(limI[1]) + '}' +
      '\\left(' + SIM.aLatex(ast) + '\\right)\\,d' + interno + '\\,d' + externo;

    /* --- 1) Integral original e identificación --- */
    pasos.push({
      titulo: 'Integral original e identificación de datos',
      cuerpo: bloque(texIntegral) +
        '<p class="nota-tecnica">Integrando: ' + enTex(SIM.aLatex(ast)) +
        ' · variables: ' + enTex('x') + ' y ' + enTex('y') +
        ' · límites: ' +
        enTex(SIM.aLatex(limE[0]) + '\\le ' + externo + '\\le ' + SIM.aLatex(limE[1])) + ', ' +
        enTex(SIM.aLatex(limI[0]) + '\\le ' + interno + '\\le ' + SIM.aLatex(limI[1])) +
        ' · orden de integración: <b>d' + interno + ' d' + externo + '</b> ' +
        '(primero se integra respecto a <b>' + interno + '</b>, dejando ' +
        externo + ' como constante).</p>'
    });

    /* --- 2) Constantes y variables del integrando (respecto a d(interno)) --- */
    const clasifInt = SIM.terminos(ast).map((t) => {
      const esConst = !EXP.depende(t.nodo, interno);
      return enTex(SIM.aLatex(t.nodo)) + ' → ' +
        (esConst
          ? '<em>constante respecto a d' + interno + '</em> (se saca de la integral)'
          : '<em>depende de ' + interno + '</em> (se integra)');
    });
    pasos.push({
      titulo: 'Identificación de constantes y variables',
      cuerpo: bloque(SIM.aLatex(ast)) +
        '<p class="nota-tecnica">Al integrar primero respecto a <b>' + interno +
        '</b>, ' + (externo === 'x' ? 'x' : 'y') + ' actúa como constante. ' +
        'Términos: ' + clasifInt.join(' · ') + '.</p>'
    });

    /* --- 3) Región de integración --- */
    pasos.push({
      titulo: 'Región de integración R',
      cuerpo: bloque('R = \\left\\{\\left(' + enTex('x,y') + '\\right) : ' +
        SIM.aLatex(limE[0]) + '\\le ' + externo + '\\le ' + SIM.aLatex(limE[1]) +
        ',\\ ' + SIM.aLatex(limI[0]) + '\\le ' + interno + '\\le ' + SIM.aLatex(limI[1]) +
        '\\right\\}') +
        '<p class="nota-tecnica">Esta es la misma región que se dibuja en la gráfica: ' +
        'los límites de <b>' + externo + '</b> son constantes y los de <b>' + interno +
        '</b> pueden depender de ' + externo + '.</p>'
    });

    /* --- 4) Integral interna --- */
    const estado = { motivo: '' };
    const reglasInt = [];
    const rInt = SIM.integralDefinida(ast, interno, limI[0], limI[1], reglasInt, estado);

    if (!rInt.ok) {
      const extra = pasosNumericos(ctx, orden, interno, externo, rInt.motivo);
      return {
        pasos: pasos.concat(extra),
        symbolic: false,
        motivo: rInt.motivo,
        resultadoTex: null,
        resultado: null,
        html: aHTML(pasos.concat(extra))
      };
    }

    const g = rInt.ast;
    pasos.push({
      titulo: 'Integral interna (d' + interno + ') con ' + externo + ' como constante',
      cuerpo: '<p class="nota-tecnica">Se integra respecto a <b>' + interno +
        '</b> dejando <b>' + externo + '</b> como constante. A continuación, cada regla ' +
        'de integración aplicada y sus operaciones intermedias.</p>'
    });
    for (const r of reglasInt) {
      pasos.push({
        titulo: r.regla,
        cuerpo: bloque(r.antes + ' = ' + r.despues) +
          (r.nota ? '<p class="nota-tecnica">' + prosaTex(r.nota) + '</p>' : '')
      });
    }

    /* --- 3) Integral externa --- */
    const estado2 = { motivo: '' };
    const reglasExt = [];
    const rExt = SIM.integralDefinida(g, externo, limE[0], limE[1], reglasExt, estado2);

    if (!rExt.ok) {
      // La interna salió simbólica: la mostramos y cerramos la externa en numérico
      const extra = pasosNumericos(ctx, orden, interno, externo, rExt.motivo);
      return {
        pasos: pasos.concat(extra),
        symbolic: false,
        parcial: SIM.aLatex(g),
        motivo: rExt.motivo,
        resultadoTex: null,
        resultado: null,
        html: aHTML(pasos.concat(extra))
      };
    }

    pasos.push({
      titulo: 'Integral externa (d' + externo + ') usando el resultado anterior',
      cuerpo: '<p class="nota-tecnica">El resultado de la integral interna es una ' +
        'función de <b>' + externo + '</b>: ' + enTex('g(' + externo + ') = ' + SIM.aLatex(g)) +
        '. Ahora se integra respecto a <b>' + externo + '</b>:</p>'
    });
    for (const r of reglasExt) {
      pasos.push({
        titulo: r.regla,
        cuerpo: bloque(r.antes + ' = ' + r.despues) +
          (r.nota ? '<p class="nota-tecnica">' + prosaTex(r.nota) + '</p>' : '')
      });
    }

    /* --- 4) Resultado --- */
    const resultado = rExt.ast;
    const valor = SIM.valorNumerico(resultado);
    const exactoTex = SIM.aLatex(resultado);

    pasos.push({
      titulo: 'Resultado exacto',
      cuerpo: bloque(texIntegral + ' = ' + exactoTex) +
        (valor !== null
          ? '<p class="nota-tecnica">Valor decimal: <b>' + CM.calculo.formatear(valor, 6) + '</b></p>'
          : '<p class="nota-tecnica">La expresión queda en forma exacta (contiene radicales u otras ' +
            'funciones no evaluables a decimal exacto).</p>')
    });

    if (valor !== null && typeof ctx.numerico === 'number' && Number.isFinite(ctx.numerico)) {
      const delta = Math.abs(valor - ctx.numerico);
      pasos.push({
        titulo: 'Comprobación numérica (Simpson ' + n + ' × ' + n + ')',
        cuerpo: '<p class="nota-tecnica">Simpson anidado obtiene <b>' +
          CM.calculo.formatear(ctx.numerico, 6) + '</b>; la diferencia con el resultado exacto es ' +
          'Δ = ' + delta.toExponential(2) + '. ' +
          (delta < 1e-4 ? 'Ambos valores coinciden. ✓' : 'Revisa los límites si la diferencia es grande.') +
          '</p>'
      });
    }

    return {
      pasos: pasos,
      symbolic: true,
      resultado: resultado,
      resultadoValor: valor,
      resultadoTex: exactoTex,
      motivo: '',
      html: aHTML(pasos)
    };
  }

  /* ----------------------------------------------------------
   *  API pública
   * ---------------------------------------------------------- */
  procedimientos.aHTML = aHTML;
  procedimientos.esc = esc;
  procedimientos.enTex = enTex;
  procedimientos.prosaTex = prosaTex;
  procedimientos.bloque = bloque;
  procedimientos.pasosDerivada = pasosDerivada;
  procedimientos.resolverIntegral = resolverIntegral;

  global.CalcMelody = global.CalcMelody || {};
  global.CalcMelody.procedimientos = procedimientos;
})(window);
