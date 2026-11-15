/**
 * ============================================================
 *  CalcMelody · melodia.js
 *  Sonificación de la superficie con la Web Audio API.
 *
 *  Flujo:
 *    1. muestrearDominio()  → 24 puntos sobre las dos diagonales
 *    2. puntosANotas()      → normaliza z ∈ [0,1] y mapea a la
 *                             escala pentatónica mayor (C4…A5)
 *    3. reproducir()        → osciladores sine con envolvente
 * ============================================================
 */
(function (global) {
  'use strict';

  const melodia = {};

  /** Escala pentatónica mayor de Do (frecuencias en Hz). */
  const ESCALA = [
    261.63, // C4
    293.66, // D4
    329.63, // E4
    392.0, // G4
    440.0, // A4
    523.25, // C5
    587.33, // D5
    659.25, // E5
    784.0, // G5
    880.0 // A5
  ];

  /** Nombres de las notas, en el mismo orden que ESCALA. */
  const NOMBRES = ['C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'D5', 'E5', 'G5', 'A5'];

  /* ------------------------- AUDIO ------------------------- */
  let contexto = null; // AudioContext (se crea perezosamente)
  let osciladores = []; // osciladores activos, para poder detenerlos
  let temporizadorFin = null; // temporizador de fin de melodía
  let reproduciendo = false;

  /** Devuelve (y crea si hace falta) el AudioContext. */
  function obtenerContexto() {
    if (!contexto) {
      const AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) throw new Error('Este navegador no soporta Web Audio API.');
      contexto = new AC();
    }
    return contexto;
  }

  /**
   * Reproduce una secuencia de notas con un oscilador sine por nota
   * y una envolvente de volumen (ataque rápido + caída suave).
   *
   * @param {Array} notas      arreglo devuelto por puntosANotas()
   * @param {object} [opciones]
   * @param {number} [opciones.duracion] duración de cada nota (s)
   * @param {Function} [opciones.alTerminar] callback al finalizar
   */
  function reproducir(notas, opciones = {}) {
    const duracion = opciones.duracion || 0.28; // ~7 s para 24 notas
    const alTerminar = opciones.alTerminar || function () {};

    detener(); // corta cualquier reproducción anterior

    const ac = obtenerContexto();
    if (ac.state === 'suspended') ac.resume(); // política de autoplay

    let t = ac.currentTime + 0.08; // pequeño margen de arranque

    notas.forEach((nota) => {
      const osc = ac.createOscillator();
      const ganancia = ac.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(nota.frecuencia, t);

      // Envolvente: 0 → ataque (0.03 s) → sostenido → caída (hasta duración)
      ganancia.gain.setValueAtTime(0.0001, t);
      ganancia.gain.exponentialRampToValueAtTime(0.22, t + 0.03);
      ganancia.gain.setValueAtTime(0.22, t + duracion * 0.55);
      ganancia.gain.exponentialRampToValueAtTime(0.0001, t + duracion);

      osc.connect(ganancia);
      ganancia.connect(ac.destination);

      osc.start(t);
      osc.stop(t + duracion + 0.05);
      osciladores.push(osc);

      t += duracion;
    });

    reproduciendo = true;
    const totalMs = notas.length * duracion * 1000 + 150;
    temporizadorFin = global.setTimeout(() => {
      reproduciendo = false;
      osciladores = [];
      alTerminar();
    }, totalMs);
  }

  /** Detiene la melodía (si hay una en curso) y libera recursos. */
  function detener() {
    if (temporizadorFin) {
      global.clearTimeout(temporizadorFin);
      temporizadorFin = null;
    }
    osciladores.forEach((osc) => {
      try {
        osc.stop();
      } catch (e) {
        /* el oscilador ya estaba detenido */
      }
    });
    osciladores = [];
    const estaba = reproduciendo;
    reproduciendo = false;
    return estaba;
  }

  /* ------------------------ MUESTREO ------------------------ */

  /**
   * Genera ~24 puntos repartidos en las DOS DIAGONALES del dominio:
   *   diagonal 1: (x0,y0) → (x1,y1)
   *   diagonal 2: (x0,y1) → (x1,y0)
   * Se entrelazan para que la melodía "salte" entre ambas.
   *
   * @param {[number,number]} xlim
   * @param {[number,number]} ylim
   * @param {number} cantidad total de puntos (por defecto 24)
   * @returns {Array<{x:number,y:number}>}
   */
  function muestrearDominio(xlim, ylim, cantidad = 24) {
    const porDiagonal = Math.max(2, Math.floor(cantidad / 2));
    const d1 = [];
    const d2 = [];

    for (let i = 0; i < porDiagonal; i++) {
      const t = i / (porDiagonal - 1); // 0 … 1
      const x = xlim[0] + (xlim[1] - xlim[0]) * t;
      const y = ylim[0] + (ylim[1] - ylim[0]) * t;
      d1.push({ x: x, y: y }); // de (x0,y0) a (x1,y1)
      d2.push({ x: x, y: ylim[1] - (ylim[1] - ylim[0]) * t }); // de (x0,y1) a (x1,y0)
    }

    const puntos = [];
    for (let i = 0; i < porDiagonal; i++) {
      puntos.push(d1[i]);
      puntos.push(d2[i]);
    }
    return puntos;
  }

  /**
   * Evalúa f en cada punto, normaliza z ∈ [0,1] (min–max) y
   * mapea el valor a la escala pentatónica.
   *
   * Valores no finitos (asíntotas) → z = null y nota central.
   *
   * @param {Array<{x:number,y:number}>} puntos
   * @param {(x:number,y:number)=>number} funcion
   * @returns {Array} puntos enriquecidos con z, normalizado, nota y frecuencia
   */
  function puntosANotas(puntos, funcion) {
    // 1) Evaluar la función en cada punto
    const evaluados = puntos.map((p) => {
      let v;
      try {
        v = funcion(p.x, p.y);
      } catch (e) {
        v = NaN;
      }
      return Number.isFinite(v) ? v : null;
    });

    // 2) Rango de valores finitos (para normalizar)
    const finitos = evaluados.filter((v) => v !== null);
    const min = finitos.length ? Math.min.apply(null, finitos) : 0;
    const max = finitos.length ? Math.max.apply(null, finitos) : 1;
    const rango = max - min;

    // 3) Asignar nota
    return puntos.map((p, i) => {
      const z = evaluados[i];
      let norm;
      if (z === null || rango < 1e-9) {
        norm = 0.5; // sin rango utilizable → nota central
      } else {
        norm = (z - min) / rango; // 0 … 1
      }
      norm = Math.min(1, Math.max(0, norm));

      const indice = Math.round(norm * (ESCALA.length - 1));
      return {
        x: p.x,
        y: p.y,
        z: z,
        normalizado: norm,
        indice: i + 1,
        nota: NOMBRES[indice],
        indiceNota: indice,
        frecuencia: ESCALA[indice]
      };
    });
  }

  /* --------------------- EXPOSICIÓN --------------------- */
  melodia.ESCALA = ESCALA;
  melodia.NOMBRES = NOMBRES;
  melodia.muestrearDominio = muestrearDominio;
  melodia.puntosANotas = puntosANotas;
  melodia.reproducir = reproducir;
  melodia.detener = detener;
  melodia.estaReproduciendo = function () {
    return reproduciendo;
  };

  global.CalcMelody = global.CalcMelody || {};
  global.CalcMelody.melodia = melodia;
})(window);
