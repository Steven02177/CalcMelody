/**
 * ============================================================
 *  CalcMelody · grafica.js
 *  Gráficas con Plotly.js:
 *    - vista 3D → superficie + puntos de muestreo verdes
 *    - vista 2D → contorno (curvas de nivel) + puntos verdes
 *  La cámara3D se mantiene fija con `up: {x:0, y:0, z:1}` y
 *  `uirevision` para que la orientación no se reinicie.
 * ============================================================
 */
(function (global) {
  'use strict';

  const grafica = {};

  /** Resolución de la malla usada para dibujar (nodos por eje). */
  const RESOLUCION = 60;

  /** Colores compartidos con la hoja de estilos. */
  const COLORES = {
    verde: '#22c55e',        // puntos de muestreo
    bordePuntos: '#064e3b',
    texto: '#aeb6d4',
    rejilla: '#2a3150',
    titulo: '#e8ecfa'
  };

  /**
   * Construye la malla de evaluación (x, y) → z = f(x, y).
   * Devuelve x (columnas), y (filas) y z como matriz [filaY][colX],
   * que es el formato que espera Plotly para surface/contour.
   *
   * Los valores no finitos (asíntotas, divisiones entre cero)
   * se convierten en `null` para no romper la gráfica.
   */
  function crearMalla(funcion, xlim, ylim, res = RESOLUCION) {
    const x = [];
    const y = [];
    const z = [];

    for (let j = 0; j <= res; j++) {
      x.push(xlim[0] + ((xlim[1] - xlim[0]) * j) / res);
    }
    for (let i = 0; i <= res; i++) {
      y.push(ylim[0] + ((ylim[1] - ylim[0]) * i) / res);
    }

    for (let i = 0; i <= res; i++) {
      const fila = [];
      for (let j = 0; j <= res; j++) {
        let v;
        try {
          v = funcion(x[j], y[i]);
        } catch (e) {
          v = NaN;
        }
        fila.push(Number.isFinite(v) ? v : null);
      }
      z.push(fila);
    }
    return { x, y, z };
  }

  /** Reemplaza `null` por 0 (uso legacy; la superficie ahora usa nulls). */
  function mallaParaSuperficie(malla) {
    return malla.z.map((fila) => fila.map((v) => (v === null ? 0 : v)));
  }

  /**
   * Rango robusto del eje Z: si hay valores extremos (asíntotas,
   * picos de derivadas) se acota al percentil 1–99 para que la
   * superficie siga siendo legible. Devuelve null si no hace falta.
   */
  function rangoRobusto(z) {
    const vals = [];
    for (const fila of z) for (const v of fila) if (v !== null && Number.isFinite(v)) vals.push(v);
    if (vals.length < 20) return null;
    vals.sort((a, b) => a - b);
    const q = (p) => vals[Math.min(vals.length - 1, Math.floor(p * vals.length))];
    const min = vals[0];
    const max = vals[vals.length - 1];
    const p1 = q(0.01);
    const p99 = q(0.99);
    const spanTotal = max - min;
    const spanRobusto = p99 - p1;
    if (spanRobusto <= 0) return null;
    if (spanTotal > 6 * spanRobusto) {
      const pad = spanRobusto * 0.08;
      return [p1 - pad, p99 + pad];
    }
    return null;
  }

  /**
   * Construye la traza de la REGIÓN de integración.
   * @param {Array<[number,number]>} poligono  contorno cerrado
   * @param {'2d'|'3d'} vista
   */
  function trazaRegion(poligono, vista) {
    if (!poligono || poligono.length < 3) return null;
    const x = poligono.map((p) => p[0]);
    const y = poligono.map((p) => p[1]);
    const cierre = [poligono[0], ...poligono, poligono[0]];
    if (vista === '3d') {
      return {
        type: 'scatter3d',
        mode: 'lines',
        x: cierre.map((p) => p[0]),
        y: cierre.map((p) => p[1]),
        z: cierre.map(() => 0),
        line: { color: '#c4b5fd', width: 6 },
        fill: 'toself',
        fillcolor: 'rgba(124, 92, 255, 0.18)',
        name: 'región R (proyección en z = 0)',
        hovertemplate: 'x=%{x:.3f}<br>y=%{y:.3f}<br>región R<extra></extra>'
      };
    }
    return {
      type: 'scatter',
      mode: 'lines',
      x: x.concat([x[0]]),
      y: y.concat([y[0]]),
      fill: 'toself',
      fillcolor: 'rgba(124, 92, 255, 0.20)',
      line: { color: '#c4b5fd', width: 2, dash: 'dot' },
      name: 'región R',
      hovertemplate: 'x=%{x:.3f}<br>y=%{y:.3f}<br>región R<extra></extra>'
    };
  }

  /**
   * Dibuja (o actualiza) la gráfica dentro del contenedor indicado.
   *
   * @param {HTMLElement} contenedor  div donde Plotly monta la figura
   * @param {object} op               opciones:
   *   - funcion : función a graficar (f o su derivada parcial)
   *   - xlim/ylim: dominio
   *   - vista   : '3d' | '2d'
   *   - puntos  : [{x, y, z, nota}] puntos de muestreo
   *   - titulo  : título de la figura
   *   - region  : [[x,y], …] contorno de la región de integración
   *   - comparacion: {fn, etiqueta} función de referencia (f original)
   */
  function graficar(contenedor, op) {
    if (!global.Plotly) {
      throw new Error('No se cargó Plotly.js. Verifica tu conexión al CDN.');
    }

    const { funcion, xlim, ylim, vista, puntos, titulo, region, comparacion } = op;
    const malla = crearMalla(funcion, xlim, ylim);
    const traces = [];
    const rangoZ = rangoRobusto(malla.z);

    // Coordenadas comunes de los puntos de muestreo (24 en total)
    const px = puntos.map((p) => p.x);
    const py = puntos.map((p) => p.y);
    const pz = puntos.map((p) => (Number.isFinite(p.z) ? p.z : null));
    const etiquetas = puntos.map(
      (p) =>
        `#${p.indice ?? ''} · x=${p.x.toFixed(3)}, y=${p.y.toFixed(3)}, z=${
          Number.isFinite(p.z) ? p.z.toFixed(4) : '—'
        } · ${p.nota ?? ''}`
    );

    const layout = {
      title: { text: titulo, font: { size: 16, color: COLORES.titulo } },
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      font: { color: COLORES.texto, size: 12 },
      margin: { l: 50, r: 20, t: 50, b: 45 },
      showlegend: true,
      legend: { orientation: 'h', y: -0.18, font: { size: 11 } },
      // Mantiene la cámara/zoom entre actualizaciones (ejes fijos)
      uirevision: 'calcmelody'
    };

    if (vista === '3d') {
      /* ------------------------ VISTA 3D ------------------------ */
      // Superficie de referencia (f original) cuando se grafica una derivada
      if (comparacion && comparacion.fn) {
        const mallaRef = crearMalla(comparacion.fn, xlim, ylim);
        traces.push({
          type: 'surface',
          x: mallaRef.x,
          y: mallaRef.y,
          z: mallaRef.z,
          colorscale: 'Greys',
          opacity: 0.35,
          showscale: false,
          showlegend: true,
          name: comparacion.etiqueta || 'f(x,y)',
          hovertemplate: 'x=%{x:.3f}<br>y=%{y:.3f}<br>' +
            (comparacion.etiqueta || 'f') + '=%{z:.4f}<extra></extra>'
        });
      }

      traces.push({
        type: 'surface',
        x: malla.x,
        y: malla.y,
        z: malla.z, // null → huecos limpios (asíntotas, dominio no definido)
        colorscale: 'Viridis',
        opacity: 0.92,
        contours: {
          z: { show: true, usecolormap: true, highlightcolor: '#22d3ee' }
        },
        name: 'superficie',
        showlegend: true,
        hovertemplate: 'x=%{x:.3f}<br>y=%{y:.3f}<br>z=%{z:.4f}<extra></extra>'
      });

      // Región de integración proyectada en el plano z = 0
      const trazaReg3 = trazaRegion(region, '3d');
      if (trazaReg3) traces.push(trazaReg3);

      // Puntos de muestreo en verde (esferas pequeñas)
      traces.push({
        type: 'scatter3d',
        mode: 'markers',
        x: px,
        y: py,
        z: pz,
        text: etiquetas,
        hovertemplate: '%{text}<extra></extra>',
        marker: {
          size: 5,
          color: COLORES.verde,
          line: { width: 1, color: '#0f1220' },
          symbol: 'circle'
        },
        name: 'puntos de muestreo'
      });

      layout.scene = {
        xaxis: { title: 'x', range: xlim, gridcolor: COLORES.rejilla, zerolinecolor: '#39406b' },
        yaxis: { title: 'y', range: ylim, gridcolor: COLORES.rejilla, zerolinecolor: '#39406b' },
        zaxis: Object.assign(
          { title: 'z', gridcolor: COLORES.rejilla, zerolinecolor: '#39406b' },
          rangoZ ? { range: rangoZ } : {}
        ),
        // Ejes con proporción fija para que la forma no se deforme
        aspectmode: 'manual',
        aspectratio: { x: 1, y: 1, z: 0.65 },
        // Cámara fija: el eje z siempre apunta hacia arriba
        camera: {
          eye: { x: 1.55, y: -1.6, z: 1.05 },
          up: { x: 0, y: 0, z: 1 },
          projection: { type: 'perspective' }
        },
        bgcolor: 'rgba(0,0,0,0)'
      };
      layout.dragmode = 'orbit';
    } else {
      /* ------------------------ VISTA 2D ------------------------ */
      // Curvas de nivel de la función de referencia (f original)
      if (comparacion && comparacion.fn) {
        const mallaRef = crearMalla(comparacion.fn, xlim, ylim);
        traces.push({
          type: 'contour',
          x: mallaRef.x,
          y: mallaRef.y,
          z: mallaRef.z,
          colorscale: 'Greys',
          opacity: 0.45,
          showscale: false,
          ncontours: 20,
          line: { width: 0.8, color: '#94a3b8' },
          name: comparacion.etiqueta || 'f(x,y)',
          showlegend: true,
          hoverinfo: 'skip'
        });
      }

      traces.push({
        type: 'contour',
        x: malla.x,
        y: malla.y,
        z: malla.z, // los null generan huecos limpios en el contorno
        colorscale: 'Viridis',
        ncontours: 28,
        contours: {
          coloring: 'fill',
          showlabels: true,
          labelfont: { size: 9, color: '#0f1220' }
        },
        line: { width: 1, color: '#1b2138' },
        colorbar: { title: 'z', tickfont: { color: COLORES.texto }, titlefont: { color: COLORES.texto } },
        name: 'contorno',
        showlegend: true,
        hovertemplate: 'x=%{x:.3f}<br>y=%{y:.3f}<br>z=%{z:.4f}<extra></extra>'
      });

      // Región de integración en el plano XY
      const trazaReg2 = trazaRegion(region, '2d');
      if (trazaReg2) traces.push(trazaReg2);

      // Puntos de muestreo en verde (marcadores)
      traces.push({
        type: 'scatter',
        mode: 'markers',
        x: px,
        y: py,
        text: etiquetas,
        hovertemplate: '%{text}<extra></extra>',
        marker: {
          size: 10,
          color: COLORES.verde,
          line: { width: 1.5, color: COLORES.bordePuntos }
        },
        name: 'puntos de muestreo'
      });

      layout.xaxis = {
        title: 'x',
        range: xlim,
        gridcolor: COLORES.rejilla,
        zerolinecolor: '#4b5480',
        constrain: 'domain',
        scaleanchor: 'y',
        scaleratio: 1
      };
      layout.yaxis = {
        title: 'y',
        range: ylim,
        gridcolor: COLORES.rejilla,
        zerolinecolor: '#4b5480'
      };
      layout.dragmode = 'pan';
    }

    const config = {
      responsive: true,
      displaylogo: false,
      scrollZoom: true,
      modeBarButtonsToRemove: ['lasso2d', 'select2d', 'autoScale2d'],
      toImageButtonOptions: { format: 'png', filename: 'calcmelody-grafica' }
    };

    // react() actualiza sin recrear el gráfico (mejor rendimiento)
    global.Plotly.react(contenedor, traces, layout, config);
  }

  /** Limpia el contenedor de la gráfica. */
  function limpiar(contenedor) {
    if (global.Plotly) global.Plotly.purge(contenedor);
  }

  global.CalcMelody = global.CalcMelody || {};
  global.CalcMelody.grafica = { crearMalla, graficar, limpiar, RESOLUCION };
})(window);
