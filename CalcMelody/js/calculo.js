/**
 * ============================================================
 *  CalcMelody · calculo.js
 *  Lógica matemática: integral doble numérica (Simpson 2D)
 *  y selección de derivadas parciales.
 * ============================================================
 */
(function (global) {
  'use strict';

  const calculo = {};

  /**
   * Regla de Simpson compuesta en una dimensión.
   * Requiere un número PAR de subintervalos (se corrige si no).
   * Error típico: O(h⁴), muy preciso para funciones suaves.
   *
   * @param {(t:number)=>number} f  función a integrar
   * @param {number} a              límite inferior
   * @param {number} b              límite superior
   * @param {number} n              número de subintervalos (par)
   * @returns {number} aproximación de ∫[a,b] f(t) dt
   */
  function simpsonUnico(f, a, b, n) {
    if (!Number.isFinite(a) || !Number.isFinite(b)) return NaN;
    if (n % 2 !== 0) n += 1;                 // Simpson exige n par
    const h = (b - a) / n;
    let suma = f(a) + f(b);                  // extremos
    for (let i = 1; i < n; i++) {
      const peso = i % 2 === 0 ? 2 : 4;      // 4 en posiciones impares, 2 en pares
      suma += peso * f(a + i * h);
    }
    const valor = (h / 3) * suma;
    return Number.isFinite(valor) ? valor : NaN;
  }

  /**
   * Integral doble iterada de f sobre los límites indicados.
   * Soporta AMBOS órdenes y límites variables:
   *
   *   orden 'dydx' → ∫[x0,x1] ∫[y0(x), y1(x)] f dy dx
   *   orden 'dxdy' → ∫[y0,y1] ∫[x0(y), x1(y)] f dx dy
   *
   * Cada límite puede ser un número o una función del valor de la
   * variable EXTERNA (p. ej. y1 = x para ∫₀¹∫₀ˣ …).
   *
   * @param {(x:number,y:number)=>number} f
   * @param {string} orden      'dydx' | 'dxdy'
   * @param {[*,*]} xlim        límites de x (número o función de y)
   * @param {[*,*]} ylim        límites de y (número o función de x)
   * @param {number} n          subintervalos por eje (par)
   * @returns {number}
   */
  function integralNumerica(f, orden, xlim, ylim, n = 60) {
    const val = (lim, otra) => (typeof lim === 'function' ? lim(otra) : lim);

    if (orden === 'dxdy') {
      // interna en x (límites pueden depender de y), externa en y
      const g = (y) => simpsonUnico((x) => f(x, y), val(xlim[0], y), val(xlim[1], y), n);
      const valor = simpsonUnico(g, val(ylim[0]), val(ylim[1]), n);
      return Number.isFinite(valor) ? valor : NaN;
    }
    // por defecto 'dydx': interna en y, externa en x
    const g = (x) => simpsonUnico((y) => f(x, y), val(ylim[0], x), val(ylim[1], x), n);
    const valor = simpsonUnico(g, val(xlim[0]), val(xlim[1]), n);
    return Number.isFinite(valor) ? valor : NaN;
  }

  /**
   * Integral doble ∬ f(x,y) dA sobre el rectángulo xlim × ylim
   * en el orden dy dx (compatibilidad con la API original).
   */
  function integralDoble(f, xlim, ylim, n = 60) {
    return integralNumerica(f, 'dydx', xlim, ylim, n);
  }

  /**
   * Devuelve la derivada parcial elegida por el usuario.
   * @param {object} ejemplo    entrada de EJEMPLOS
   * @param {'dx'|'dy'} variable
   * @returns {{etiqueta:string, funcion:Function, expresion:string, interpretacion:string}|null}
   */
  function derivar(ejemplo, variable) {
    if (variable === 'dx') {
      return {
        etiqueta: '∂f/∂x',
        funcion: ejemplo.df_dx,
        expresion: ejemplo.df_dx_str,
        interpretacion: ejemplo.interpretacionDx
      };
    }
    if (variable === 'dy') {
      return {
        etiqueta: '∂f/∂y',
        funcion: ejemplo.df_dy,
        expresion: ejemplo.df_dy_str,
        interpretacion: ejemplo.interpretacionDy
      };
    }
    return null; // 'integral' → no hay derivada
  }

  /**
   * Formatea un número para mostrar en pantalla.
   * Usa notación exponencial cuando el valor es muy grande o muy pequeño.
   */
  function formatear(v, decimales = 4) {
    if (v === null || v === undefined || Number.isNaN(v)) return '—';
    if (!Number.isFinite(v)) return v > 0 ? '∞' : '−∞';
    const abs = Math.abs(v);
    if (abs !== 0 && (abs < 1e-4 || abs >= 1e6)) return v.toExponential(3);
    // "−" tipográfico solo para lectura; se usa el guion normal para no confundir
    return String(Number(v.toFixed(decimales)));
  }

  /** Error absoluto entre el valor numérico y el exacto (si existe). */
  function errorVsExacto(num, exacto) {
    if (exacto === undefined || exacto === null || Number.isNaN(exacto)) return null;
    return Math.abs(num - exacto);
  }

  /**
   * Genera el procedimiento paso a paso de la integral doble para una
   * FUNCIÓN PERSONALIZADA (no tenemos fórmula cerrada, así que se
   * muestra el método numérico con valores concretos).
   *
   * @param {Function} funcion  f(x,y) evaluadora
   * @param {string} texto      expresión tal como la escribió el usuario
   * @param {[number,number]} xlim
   * @param {[number,number]} ylim
   * @returns {string} HTML del procedimiento
   */
  function pasosPersonalizados(funcion, texto, xlim, ylim) {
    const [x0, x1] = xlim;
    const [y0, y1] = ylim;
    const n = 60;

    // Función reducida g(x) = ∫ f(x,y) dy (integral interna numérica)
    const g = (x) => simpsonUnico((y) => funcion(x, y), y0, y1, n);
    const xm = (x0 + x1) / 2;

    const total = integralDoble(funcion, xlim, ylim, n);
    const f1 = (v) => (Number.isFinite(v) ? formatear(v, 6) : 'no definida');

    // Formato de números con menos tipográfico (−1 en lugar de -1)
    const conLim = (v) => formatear(v, 4).replace('-', '−');

    return `
        <ol class="pasos-lista">
          <li><strong>Paso 1 · Dominio.</strong> El rectángulo de integración es
              R = [${conLim(x0)}, ${conLim(x1)}] × [${conLim(y0)}, ${conLim(y1)}], es decir
              x₀ = ${conLim(x0)}, x₁ = ${conLim(x1)}, y₀ = ${conLim(y0)}, y₁ = ${conLim(y1)}.</li>

          <li><strong>Paso 2 · Integral iterada.</strong> Aplicamos el método general
              ∬ f dA = ∫[x₀,x₁] ( ∫[y₀,y₁] f(x,y) dy ) dx con f(x,y) = <strong>${texto}</strong>:<br>
              ∬ f dA = ∫<sub>x = ${conLim(x0)}</sub><sup>${conLim(x1)}</sup> [ ∫<sub>y = ${conLim(y0)}</sub><sup>${conLim(y1)}</sup>
              (${texto}) dy ] dx</li>

          <li><strong>Paso 3 · Integral interna (dy), dejando x fijo.</strong> Para cada valor de x se calcula<br>
              g(x) = ∫<sub>${conLim(y0)}</sub><sup>${conLim(y1)}</sup> (${texto}) dy<br>
              con la regla de Simpson compuesto (n = ${n} subintervalos). Ejemplos de esa función reducida:<br>
              · g(${conLim(x0)}) ≈ <strong>${f1(g(x0))}</strong><br>
              · g(${conLim(xm)}) ≈ <strong>${f1(g(xm))}</strong> &nbsp;(punto medio del intervalo de x)<br>
              · g(${conLim(x1)}) ≈ <strong>${f1(g(x1))}</strong></li>

          <li><strong>Paso 4 · Integral externa (dx).</strong> Se integra ahora el resultado anterior:<br>
              ∬ f dA = ∫<sub>${conLim(x0)}</sub><sup>${conLim(x1)}</sup> g(x) dx ≈ Simpson compuesto de g con
              n = ${n} → <strong>${f1(total)}</strong></li>

          <li><strong>Paso 5 · ¿Por qué es numérico?</strong> Para funciones arbitrarias escritas a mano no
              siempre existe una primitiva elemental (como ocurre con e<sup>−x²</sup>), así que CalcMelody usa
              integración numérica en lugar de detenerse. El error del método de Simpson disminuye como
              h⁴, con ${n} subdivisiones por eje se evalúan ${(n + 1) * (n + 1)} puntos de la malla.</li>

          <li><strong>Paso 6 · Resultado.</strong> ∬ f(x,y) dA ≈ <strong>${f1(total)}</strong>
              &nbsp;(${texto} sobre [${conLim(x0)}, ${conLim(x1)}] × [${conLim(y0)}, ${conLim(y1)}]).</li>
        </ol>`;
  }

  // Exportar en el espacio de nombres global
  global.CalcMelody = global.CalcMelody || {};
  global.CalcMelody.calculo = {
    simpsonUnico,
    integralNumerica,
    integralDoble,
    derivar,
    formatear,
    errorVsExacto,
    pasosPersonalizados
  };
})(window);
