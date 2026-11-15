/**
 * ============================================================
 *  CalcMelody · latex.js
 *  Integración de KaTeX: convierte cualquier <span class="tex">
 *  (o elemento con data-tex) en una fórmula renderizada.
 *
 *  · latex.tex(str, display)  → HTML de KaTeX (o texto escapado
 *                               si la librería no cargó)
 *  · latex.renderizar(cont)   → recorre un contenedor y renderiza
 *                               todas las fórmulas pendientes
 * ============================================================
 */
(function (global) {
  'use strict';

  const latex = {};

  function escapar(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /** ¿KaTeX está disponible? */
  latex.disponible = function () {
    return typeof global.katex === 'object' && global.katex !== null;
  };

  /**
   * Renderiza una cadena LaTeX a HTML.
   * @param {string} str   fórmula LaTeX (sin delimitadores)
   * @param {boolean} [display] modo bloque (displayMode)
   * @returns {string} HTML seguro
   */
  latex.tex = function (str, display) {
    if (latex.disponible()) {
      try {
        return global.katex.renderToString(str, {
          displayMode: !!display,
          throwOnError: false,
          output: 'html',
          strict: false,
          trust: false
        });
      } catch (e) {
        // si KaTeX falla, se muestra el código fuente escapado
      }
    }
    return '<code class="tex-fallback">' + escapar(str) + '</code>';
  };

  /**
   * Renderiza todas las fórmulas pendientes de un contenedor.
   * Los elementos ya renderizados se marcan con data-ok para
   * no duplicar el trabajo.
   */
  latex.renderizar = function (contenedor) {
    if (!contenedor || !contenedor.querySelectorAll) return 0;
    const nodos = contenedor.querySelectorAll('.tex:not([data-ok])');
    let hechas = 0;
    nodos.forEach((el) => {
      const fuente = el.getAttribute('data-tex') || el.textContent;
      const display = el.hasAttribute('data-display');
      el.innerHTML = latex.tex(fuente, display);
      el.setAttribute('data-ok', '1');
      hechas++;
    });
    return hechas;
  };

  global.CalcMelody = global.CalcMelody || {};
  global.CalcMelody.latex = latex;
})(window);
