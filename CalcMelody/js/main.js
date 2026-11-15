/**
 * ============================================================
 *  CalcMelody · main.js
 *  Punto de entrada de la aplicación.
 *  Espera a que el DOM esté listo y arranca la interfaz.
 *
 *  Orden de carga de los scripts (ver index.html):
 *    ejemplos.js → calculo.js → grafica.js → melodia.js
 *    → ui.js → main.js
 *  Todos comparten el espacio de nombres global `CalcMelody`.
 * ============================================================
 */
(function (global) {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    try {
      if (!global.CalcMelody || !global.CalcMelody.ui) {
        throw new Error('No se cargaron los módulos de CalcMelody.');
      }
      global.CalcMelody.ui.init();
      console.log('%c[CalcMelody] ▶ aplicación iniciada', 'color:#22d3ee');
    } catch (err) {
      console.error('[CalcMelody] Error al iniciar:', err);
      const estado = document.getElementById('estado');
      if (estado) {
        estado.textContent = '⚠ Error al iniciar la aplicación: ' + err.message;
        estado.className = 'estado estado--error';
      }
    }
  });
})(window);
