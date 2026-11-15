/**
 * ============================================================
 *  CalcMelody · ejemplos.js
 *  Catálogo de las 7 funciones predefinidas del proyecto.
 *
 *  Cada ejemplo contiene:
 *    - nombre / expresión           → selector y títulos
 *    - funcion(x, y)                → f(x, y)
 *    - df_dx / df_dy                → derivadas parciales (programadas)
 *    - df_dx_str / df_dy_str        → derivadas en texto para mostrar
 *    - interpretacionDx / Dy        → interpretación breve de la derivada
 *    - xlim / ylim                  → dominio de integración (rectángulo)
 *    - valorExacto / valorExactoStr → resultado exacto de ∬ f(x,y) dA
 *    - interpretacion               → interpretación geométrica
 *    - pasos                        → procedimiento paso a paso (HTML)
 *
 *  NOTA: también existe la opción "Función personalizada" en el
 *  selector; los pasos de esa función se generan automáticamente
 *  en ui.js / calculo.js.
 * ============================================================
 */
(function (global) {
  'use strict';

  const EJEMPLOS = [
    /* -------------------------------------------------------
     * 1) f = x² + y²   (paraboloide sobre el cuadrado [-1,1]²)
     * ------------------------------------------------------- */
    {
      id: 'paraboloide',
      nombre: 'f(x,y) = x² + y²',
      expresion: 'x² + y²',
      funcion: (x, y) => x * x + y * y,
      df_dx: (x, y) => 2 * x,
      df_dy: (x, y) => 2 * y,
      df_dx_str: '∂f/∂x = 2x',
      df_dy_str: '∂f/∂y = 2y',
      interpretacionDx:
        'La pendiente en dirección x crece linealmente: es negativa para x < 0, se anula en x = 0 (mínimo de la paraboloide) y es positiva para x > 0.',
      interpretacionDy:
        'La pendiente en dirección y es análoga: 2y. La superficie es simétrica respecto al plano x = y, así que ambas derivadas tienen el mismo comportamiento.',
      xlim: [-1, 1],
      ylim: [-1, 1],
      valorExacto: 8 / 3, // 2.6667
      valorExactoStr: '8/3 ≈ 2.6667',
      interpretacion:
        'Como f(x,y) ≥ 0 en todo el dominio, la integral coincide con el volumen exacto bajo la paraboloide z = x² + y² sobre el cuadrado [−1,1] × [−1,1].',
      pasos: `
        <ol class="pasos-lista">
          <li><strong>Paso 1 · Qué se pide.</strong> Calcular ∬<sub>R</sub> (x² + y²) dA sobre el rectángulo
              R = [−1, 1] × [−1, 1]. Como f(x,y) = x² + y² ≥ 0 en todo el dominio, la integral representa el
              <strong>volumen</strong> del sólido que queda entre la paraboloide z = x² + y² y el plano xy.</li>

          <li><strong>Paso 2 · Escribir la integral iterada.</strong> Los cuatro límites son constantes, así que el
              orden de integración es libre. Elegimos integrar primero respecto a <strong>y</strong> y después
              respecto a <strong>x</strong>:<br>
              ∬<sub>R</sub> (x² + y²) dA = ∫<sub>x = −1</sub><sup>1</sup> [ ∫<sub>y = −1</sub><sup>1</sup> (x² + y²) dy ] dx</li>

          <li><strong>Paso 3 · Integral interna (dy), dejando x como constante.</strong><br>
              Antiderivada: ∫ (x² + y²) dy = x²y + y³/3 &nbsp;(la x se trata como un número)<br>
              Sustituimos los límites y = 1 e y = −1:<br>
              · en y = 1 → x²(1) + (1)³/3 = x² + 1/3<br>
              · en y = −1 → x²(−1) + (−1)³/3 = −x² − 1/3<br>
              Resta (valor en el límite superior − valor en el límite inferior):<br>
              (x² + 1/3) − (−x² − 1/3) = x² + 1/3 + x² + 1/3 = <strong>2x² + 2/3</strong> = g(x)</li>

          <li><strong>Paso 4 · Integral externa (dx), usando el resultado g(x).</strong><br>
              ∫<sub>−1</sub><sup>1</sup> (2x² + 2/3) dx = [ 2x³/3 + 2x/3 ]<sub>−1</sub><sup>1</sup><br>
              · en x = 1 → 2(1)³/3 + 2(1)/3 = 2/3 + 2/3 = 4/3<br>
              · en x = −1 → 2(−1)³/3 + 2(−1)/3 = −2/3 − 2/3 = −4/3<br>
              Resta: 4/3 − (−4/3) = 4/3 + 4/3 = <strong>8/3</strong></li>

          <li><strong>Paso 5 · Resultado exacto.</strong> ∬<sub>R</sub> (x² + y²) dA = <strong>8/3 ≈ 2.6667</strong>
              unidades cúbidas.</li>

          <li><strong>Paso 6 · Comprobación numérica.</strong> CalcMelody aplica la regla de Simpson compuesto con
              60 × 60 subdivisiones y obtiene 2.666667…, que coincide con 8/3 hasta 15 cifras
              (Δ ≈ 4 × 10⁻¹⁶).</li>

          <li><strong>Paso 7 · Interpretación geométrica.</strong> El valor 2.6667 es el volumen del "cuenco" que
              forma la paraboloide sobre el cuadrado de lado 2 centrado en el origen: la altura va de 0 (en el
              centro) hasta 2 (en las esquinas).</li>
        </ol>`
    },

    /* -------------------------------------------------------
     * 2) f = sin(x)·cos(y)   (producto separable)
     * ------------------------------------------------------- */
    {
      id: 'seno-coseno',
      nombre: 'f(x,y) = sin(x)·cos(y)',
      expresion: 'sin(x)·cos(y)',
      funcion: (x, y) => Math.sin(x) * Math.cos(y),
      df_dx: (x, y) => Math.cos(x) * Math.cos(y),
      df_dy: (x, y) => -Math.sin(x) * Math.sin(y),
      df_dx_str: '∂f/∂x = cos(x)·cos(y)',
      df_dy_str: '∂f/∂y = −sin(x)·sin(y)',
      interpretacionDx:
        'La pendiente en dirección x se anula en x = π/2 (crestas y valles de la onda) y cambia de signo al cruzar ese plano.',
      interpretacionDy:
        'La pendiente en dirección y es negativa donde ambas senoides valen 1: ahí la superficie desciende más rápidamente.',
      xlim: [0, Math.PI],
      ylim: [0, Math.PI / 2],
      valorExacto: 2,
      valorExactoStr: '2',
      interpretacion:
        'f ≥ 0 en [0,π] × [0,π/2], por lo que la integral es el volumen de una "ola" positiva: 2 unidades cúbidas.',
      pasos: `
        <ol class="pasos-lista">
          <li><strong>Paso 1 · Qué se pide y qué signo tiene f.</strong> Calcular ∬ sin(x)cos(y) dA sobre
              R = [0, π] × [0, π/2]. En este dominio sin(x) ≥ 0 y cos(y) ≥ 0, por lo tanto f(x,y) ≥ 0 y la
              integral es un <strong>volumen positivo</strong>.</li>

          <li><strong>Paso 2 · Integral iterada.</strong><br>
              ∬ sin(x)cos(y) dA = ∫<sub>x = 0</sub><sup>π</sup> [ ∫<sub>y = 0</sub><sup>π/2</sup> sin(x)cos(y) dy ] dx</li>

          <li><strong>Paso 3 · Integral interna (dy): sin(x) es constante.</strong><br>
              ∫<sub>0</sub><sup>π/2</sup> sin(x)cos(y) dy = sin(x) · ∫<sub>0</sub><sup>π/2</sup> cos(y) dy
              &nbsp;(se saca lo que no depende de y)<br>
              Antiderivada de cos(y) = sin(y):<br>
              sin(x) · [ sin y ]<sub>0</sub><sup>π/2</sup> = sin(x) · (sin(π/2) − sin 0) = sin(x) · (1 − 0)
              = <strong>sin(x)</strong> = g(x)</li>

          <li><strong>Paso 4 · Integral externa (dx).</strong><br>
              ∫<sub>0</sub><sup>π</sup> sin(x) dx = [ −cos x ]<sub>0</sub><sup>π</sup><br>
              · en x = π → −cos(π) = −(−1) = 1<br>
              · en x = 0 → −cos(0) = −1<br>
              Resta: 1 − (−1) = <strong>2</strong></li>

          <li><strong>Paso 5 · Método alternativo (función separable).</strong> Como sin(x)cos(y) es producto de
              funciones de una sola variable, la doble integral se factoriza en el producto de dos integrales
              simples:<br>
              (∫<sub>0</sub><sup>π</sup> sin x dx) · (∫<sub>0</sub><sup>π/2</sup> cos y dy) = (2) · (1) = <strong>2</strong>
              &nbsp;✓ coincide con el Paso 4.</li>

          <li><strong>Paso 6 · Comprobación numérica.</strong> Simpson 60 × 60 → 2.000000 (Δ ≈ 10⁻¹⁵).</li>

          <li><strong>Paso 7 · Interpretación geométrica.</strong> El resultado 2 es el volumen bajo una
              "colina ondulada" positiva cuyo perfil es una semicicloide en x y un cuarto de onda en y.</li>
        </ol>`
    },

    /* -------------------------------------------------------
     * 3) f = 2x + 3y   (plano)
     * ------------------------------------------------------- */
    {
      id: 'plano',
      nombre: 'f(x,y) = 2x + 3y',
      expresion: '2x + 3y',
      funcion: (x, y) => 2 * x + 3 * y,
      df_dx: () => 2,
      df_dy: () => 3,
      df_dx_str: '∂f/∂x = 2',
      df_dy_str: '∂f/∂y = 3',
      interpretacionDx:
        '∂f/∂x = 2 (constante): el plano sube con pendiente fija 2 en cualquier punto, independientemente de x e y.',
      interpretacionDy:
        '∂f/∂y = 3 (constante): la dirección y es más pronunciada que la x (3 > 2), así que el plano "cuesta" más subiendo en y.',
      xlim: [0, 1],
      ylim: [0, 2],
      valorExacto: 8,
      valorExactoStr: '8',
      interpretacion:
        'La superficie es un plano; la integral es el volumen del sólido situado entre el plano y el rectángulo [0,1] × [0,2] (un prisma de base 2 y alturas 6 y 10).',
      pasos: `
        <ol class="pasos-lista">
          <li><strong>Paso 1 · Qué se pide.</strong> Calcular ∬ (2x + 3y) dA sobre R = [0, 1] × [0, 2].
              Sobre este rectángulo 2x + 3y ≥ 0, así que la integral es el <strong>volumen</strong> entre el
              plano z = 2x + 3y y el plano xy.</li>

          <li><strong>Paso 2 · Integral iterada.</strong><br>
              ∬ (2x + 3y) dA = ∫<sub>x = 0</sub><sup>1</sup> [ ∫<sub>y = 0</sub><sup>2</sup> (2x + 3y) dy ] dx</li>

          <li><strong>Paso 3 · Integral interna (dy): 2x es constante.</strong><br>
              Antiderivada: ∫ (2x + 3y) dy = 2xy + 3y²/2<br>
              · en y = 2 → 2x(2) + 3(2)²/2 = 4x + 6<br>
              · en y = 0 → 2x(0) + 3(0)²/2 = 0<br>
              Resta: (4x + 6) − 0 = <strong>4x + 6</strong> = g(x)</li>

          <li><strong>Paso 4 · Integral externa (dx).</strong><br>
              ∫<sub>0</sub><sup>1</sup> (4x + 6) dx = [ 2x² + 6x ]<sub>0</sub><sup>1</sup><br>
              · en x = 1 → 2(1)² + 6(1) = 2 + 6 = 8<br>
              · en x = 0 → 0<br>
              Resta: 8 − 0 = <strong>8</strong></li>

          <li><strong>Paso 5 · Verificación con el teorema del valor medio.</strong> Para un plano, el promedio
              de sus valores sobre un rectángulo es su valor en el <strong>centro</strong> del rectángulo
              (0.5, 1): 2(0.5) + 3(1) = 1 + 3 = 4. El área del rectángulo es 1 × 2 = 2, luego
              volumen = promedio × área = 4 × 2 = <strong>8</strong> ✓</li>

          <li><strong>Paso 6 · Comprobación numérica.</strong> Simpson 60 × 60 → 8.000000 (Δ = 0, la función
              es lineal y Simpson es exacto).</li>

          <li><strong>Paso 7 · Interpretación geométrica.</strong> El sólido es un "prisma inclinado": su base
              es el rectángulo [0,1] × [0,2] y sus cuatro alturas son f(0,0) = 0, f(1,0) = 2, f(0,2) = 6 y
              f(1,2) = 8; el promedio de las cuatro es (0+2+6+8)/4 = 4, que multiplicado por el área 2 da 8.</li>
        </ol>`
    },

    /* -------------------------------------------------------
     * 4) f = e^(−x²−y²)   (campana gaussiana truncada)
     * ------------------------------------------------------- */
    {
      id: 'gaussiana',
      nombre: 'f(x,y) = e^(−x²−y²)',
      expresion: 'e^(−x²−y²)',
      funcion: (x, y) => Math.exp(-x * x - y * y),
      df_dx: (x, y) => -2 * x * Math.exp(-x * x - y * y),
      df_dy: (x, y) => -2 * y * Math.exp(-x * x - y * y),
      df_dx_str: '∂f/∂x = −2x·e^(−x²−y²)',
      df_dy_str: '∂f/∂y = −2y·e^(−x²−y²)',
      interpretacionDx:
        'La pendiente en x es nula en x = 0 (la cima de la campana) y cambia de signo ahí: la función crece a la izquierda y decrece a la derecha.',
      interpretacionDy:
        'Por simetría radial, la pendiente en y tiene la misma forma: −2y·e^(−x²−y²); el máximo de su magnitud ocurre sobre el círculo x² + y² = 1/2.',
      xlim: [-2, 2],
      ylim: [-2, 2],
      valorExacto: 3.1122701, // (√π · erf(2))²
      valorExactoStr: '(√π · erf 2)² ≈ 3.1123',
      interpretacion:
        'Volumen bajo la campana gaussiana truncada en [−2,2]². Es prácticamente todo el volumen total (π ≈ 3.1416) de la gaussiana completa, pues la función decae muy rápido.',
      pasos: `
        <ol class="pasos-lista">
          <li><strong>Paso 1 · Qué se pide.</strong> Calcular ∬ e<sup>−x²−y²</sup> dA sobre
              R = [−2, 2] × [−2, 2]. La función es siempre positiva, así que el resultado es un volumen.</li>

          <li><strong>Paso 2 · Integral iterada.</strong><br>
              ∬ e<sup>−x²−y²</sup> dA = ∫<sub>x = −2</sub><sup>2</sup> [ ∫<sub>y = −2</sub><sup>2</sup>
              e<sup>−x²−y²</sup> dy ] dx</li>

          <li><strong>Paso 3 · Separar variables (paso clave).</strong> Por propiedades de los exponentes:<br>
              e<sup>−x²−y²</sup> = e<sup>−x²</sup> · e<sup>−y²</sup><br>
              Cada factor depende de una sola variable, por lo que la doble integral se convierte en el
              <strong>producto</strong> de dos integrales iguales:<br>
              ∬ e<sup>−x²−y²</sup> dA = ( ∫<sub>−2</sub><sup>2</sup> e<sup>−x²</sup> dx ) ·
              ( ∫<sub>−2</sub><sup>2</sup> e<sup>−y²</sup> dy ) = ( ∫<sub>−2</sub><sup>2</sup> e<sup>−x²</sup> dx )²</li>

          <li><strong>Paso 4 · La integral de Gauss no tiene primitiva elemental.</strong> No existe una
              función elemental cuya derivada sea e<sup>−x²</sup>. Se define la <strong>función error</strong>:<br>
              erf(t) = (2/√π) ∫<sub>0</sub><sup>t</sup> e<sup>−u²</sup> du &nbsp;⟹&nbsp;
              ∫<sub>−2</sub><sup>2</sup> e<sup>−x²</sup> dx = √π · erf(2)<br>
              Con erf(2) ≈ 0.9953223 y √π ≈ 1.7724539: &nbsp;1.7724539 × 0.9953223 ≈ <strong>1.764163</strong></li>

          <li><strong>Paso 5 · Elevar al cuadrado.</strong><br>
              (1.764163)² ≈ <strong>3.112270</strong></li>

          <li><strong>Paso 6 · Comprobación numérica.</strong> Simpson 60 × 60 sobre el rectángulo →
              ≈ 3.112270, coincidente con el valor de la función error (Δ ≈ 10⁻⁷).</li>

          <li><strong>Paso 7 · Interpretación geométrica y sentido común.</strong> La gaussiana completa sobre
              todo el plano vale π ≈ 3.1416; al recortar a [−2,2]² conservamos 3.1123/3.1416 ≈
              <strong>99.07 %</strong> del volumen: confirma que la campana prácticamente "cabe" en ese cuadrado.</li>
        </ol>`
    },

    /* -------------------------------------------------------
     * 5) f = x·y   (silla de montar hiperbólica)
     * ------------------------------------------------------- */
    {
      id: 'producto',
      nombre: 'f(x,y) = x·y',
      expresion: 'x·y',
      funcion: (x, y) => x * y,
      df_dx: (x, y) => y,
      df_dy: (x, y) => x,
      df_dx_str: '∂f/∂x = y',
      df_dy_str: '∂f/∂y = x',
      interpretacionDx:
        '∂f/∂x = y: la pendiente en dirección x depende sólo de y. Es positiva sobre y > 0, nula sobre el eje x y negativa bajo el eje.',
      interpretacionDy:
        '∂f/∂y = x: la pendiente en dirección y depende sólo de x. La superficie se comporta como una familia de rectas cuya pendiente cambia con la otra variable.',
      xlim: [0, 1],
      ylim: [0, 2],
      valorExacto: 1,
      valorExactoStr: '1',
      interpretacion:
        'Sobre [0,1] × [0,2] el producto x·y es no negativo, así que la integral (1) es el volumen bajo la silla de montar en ese rectángulo.',
      pasos: `
        <ol class="pasos-lista">
          <li><strong>Paso 1 · Qué se pide.</strong> Calcular ∬ x·y dA sobre R = [0, 1] × [0, 2].
              Como x ≥ 0 e y ≥ 0 en el dominio, f = xy ≥ 0 y la integral es un volumen positivo.</li>

          <li><strong>Paso 2 · Integral iterada.</strong><br>
              ∬ x·y dA = ∫<sub>x = 0</sub><sup>1</sup> [ ∫<sub>y = 0</sub><sup>2</sup> x·y dy ] dx</li>

          <li><strong>Paso 3 · Integral interna (dy): x es constante.</strong><br>
              ∫<sub>0</sub><sup>2</sup> x·y dy = x · ∫<sub>0</sub><sup>2</sup> y dy = x · [ y²/2 ]<sub>0</sub><sup>2</sup><br>
              · en y = 2 → (2)²/2 = 2 &nbsp;⟹&nbsp; x · 2 = 2x<br>
              · en y = 0 → 0<br>
              Resta: <strong>2x</strong> = g(x)</li>

          <li><strong>Paso 4 · Integral externa (dx).</strong><br>
              ∫<sub>0</sub><sup>1</sup> 2x dx = [ x² ]<sub>0</sub><sup>1</sup> = 1² − 0 = <strong>1</strong></li>

          <li><strong>Paso 5 · Método alternativo (separable).</strong><br>
              (∫<sub>0</sub><sup>1</sup> x dx) · (∫<sub>0</sub><sup>2</sup> y dy) = (1/2) · (2) = <strong>1</strong> ✓</li>

          <li><strong>Paso 6 · Comprobación numérica.</strong> Simpson 60 × 60 → 1.000000 (exacto: la función
              es bilineal).</li>

          <li><strong>Paso 7 · ¿Y si el dominio fuera simétrico?</strong> Sobre [−1,1] × [−1,1] la integral
              valdría <strong>0</strong>, porque xy es impar respecto de cada eje: cada volumen positivo se
              cancela con uno negativo. El rectángulo [0,1] × [0,2] está entero en el primer cuadrante, por eso
              el resultado es 1 y no 0.</li>
        </ol>`
    },

    /* -------------------------------------------------------
     * 6) f = √(x+y)   (raíz sobre el cuadrado unitario)
     * ------------------------------------------------------- */
    {
      id: 'raiz',
      nombre: 'f(x,y) = √(x+y)',
      expresion: '√(x+y)',
      funcion: (x, y) => Math.sqrt(x + y),
      df_dx: (x, y) => 1 / (2 * Math.sqrt(x + y)),
      df_dy: (x, y) => 1 / (2 * Math.sqrt(x + y)),
      df_dx_str: '∂f/∂x = 1 / (2√(x+y))',
      df_dy_str: '∂f/∂y = 1 / (2√(x+y))',
      interpretacionDx:
        'La pendiente en x es positiva y se hace muy grande cuando x + y → 0 (en el origen la raíz tiene tangente vertical); decrece conforme nos alejamos de la diagonal x + y = 0.',
      interpretacionDy:
        'Por simetría en x e y, ∂f/∂y tiene la misma forma que ∂f/∂x: la superficie asciende con la misma rapidez en ambas direcciones.',
      xlim: [0, 1],
      ylim: [0, 1],
      valorExacto: (4 * (4 * Math.SQRT2 - 2)) / 15, // ≈ 0.975161
      valorExactoStr: '(4/15)(4√2 − 2) ≈ 0.9752',
      interpretacion:
        'Volumen bajo la superficie √(x+y) sobre el cuadrado unitario. En el origen la función es continua pero su derivada es infinita (singularidad suave), por lo que el valor se obtiene con cuidado.',
      pasos: `
        <ol class="pasos-lista">
          <li><strong>Paso 1 · Qué se pide y por qué el dominio importa.</strong> Calcular ∬ √(x+y) dA sobre
              R = [0, 1] × [0, 1]. En este rectángulo x + y ≥ 0 siempre, así que la raíz es real en todo punto
              (si el dominio incluyera x + y &lt; 0, la función no estaría definida).</li>

          <li><strong>Paso 2 · Integral iterada.</strong><br>
              ∬ √(x+y) dA = ∫<sub>x = 0</sub><sup>1</sup> [ ∫<sub>y = 0</sub><sup>1</sup> (x+y)<sup>1/2</sup> dy ] dx</li>

          <li><strong>Paso 3 · Integral interna (dy) con cambio de variable.</strong> Sea u = x + y, entonces
              du = dy (x queda fijo):<br>
              ∫<sub>0</sub><sup>1</sup> (x+y)<sup>1/2</sup> dy = ∫ (u)<sup>1/2</sup> du = (2/3) u<sup>3/2</sup><br>
              Volviendo a y y sustituyendo límites:<br>
              (2/3) [ (x+y)<sup>3/2</sup> ]<sub>y = 0</sub><sup>y = 1</sup> =
              (2/3) [ (x+1)<sup>3/2</sup> − x<sup>3/2</sup> ] = g(x)</li>

          <li><strong>Paso 4 · Integral externa (dx), término a término.</strong><br>
              ∫<sub>0</sub><sup>1</sup> (2/3)[(x+1)<sup>3/2</sup> − x<sup>3/2</sup>] dx
              = (2/3) [ ∫(x+1)<sup>3/2</sup>dx − ∫x<sup>3/2</sup>dx ]<br>
              Usando ∫(x+1)<sup>3/2</sup>dx = (2/5)(x+1)<sup>5/2</sup> y ∫x<sup>3/2</sup>dx = (2/5)x<sup>5/2</sup>:<br>
              = (2/3) · (2/5) [ (x+1)<sup>5/2</sup> − x<sup>5/2</sup> ]<sub>0</sub><sup>1</sup>
              = (4/15) [ (x+1)<sup>5/2</sup> − x<sup>5/2</sup> ]<sub>0</sub><sup>1</sup></li>

          <li><strong>Paso 5 · Sustituir los límites en x.</strong><br>
              · en x = 1 → (2)<sup>5/2</sup> − (1)<sup>5/2</sup> = 5.656854 − 1 = 4.656854<br>
              · en x = 0 → (1)<sup>5/2</sup> − (0)<sup>5/2</sup> = 1 − 0 = 1<br>
              Resta: 4.656854 − 1 = 3.656854<br>
              Multiplicando: (4/15) × 3.656854 ≈ <strong>0.975161</strong></li>

          <li><strong>Paso 6 · Forma exacta.</strong> 4.656854 = 4√2 − 1 + … trabajando con radicales:
              (2)<sup>5/2</sup> = 4√2, luego el resultado exacto es
              <strong>(4/15)(4√2 − 2) ≈ 0.9752</strong>.</li>

          <li><strong>Paso 7 · Singularidad en el origen (por qué hay que tener cuidado).</strong> La función
              es continua en (0,0), pero su derivada ∂f/∂x = 1/(2√(x+y)) tiende a infinito ahí: la superficie
              tiene "canto vivo" en la esquina. Aun así Simpson converge porque la función está acotada
              (0 ≤ f ≤ √2).</li>

          <li><strong>Paso 8 · Comprobación numérica.</strong> Simpson 60 × 60 → 0.975160…, con
              Δ ≈ 1.4 × 10⁻⁶ respecto del valor exacto.</li>
        </ol>`
    },

    /* -------------------------------------------------------
     * 7) f = cos(x+y)   (onda diagonal)
     * ------------------------------------------------------- */
    {
      id: 'coseno-suma',
      nombre: 'f(x,y) = cos(x+y)',
      expresion: 'cos(x+y)',
      funcion: (x, y) => Math.cos(x + y),
      df_dx: (x, y) => -Math.sin(x + y),
      df_dy: (x, y) => -Math.sin(x + y),
      df_dx_str: '∂f/∂x = −sin(x+y)',
      df_dy_str: '∂f/∂y = −sin(x+y)',
      interpretacionDx:
        '∂f/∂x = −sin(x+y): la pendiente en x es negativa para x + y ∈ (0, π) y positiva para x + y ∈ (π, 2π); se anula sobre las bandas x + y = 0, π, 2π.',
      interpretacionDy:
        'Al depender de x + y, ∂f/∂y = ∂f/∂x: la onda viaja en diagonal y ambas direcciones muestran la misma pendiente en cada punto.',
      xlim: [0, Math.PI],
      ylim: [0, Math.PI],
      valorExacto: -4,
      valorExactoStr: '−4',
      interpretacion:
        'Integral firmada negativa: sobre [0,π]² la función cos(x+y) acumula más volumen bajo el eje xy (z < 0) que sobre él, dando −4 unidades cúbidas netas.',
      pasos: `
        <ol class="pasos-lista">
          <li><strong>Paso 1 · Qué se pide y por qué sale negativo.</strong> Calcular ∬ cos(x+y) dA sobre
              R = [0, π] × [0, π]. La función cambia de signo en el dominio (por ejemplo cos(0) = 1 pero
              cos(π) = −1): hablamos de <strong>integral firmada</strong>, donde el volumen bajo el plano xy
              (z &lt; 0) se resta del volumen de encima (z &gt; 0).</li>

          <li><strong>Paso 2 · Integral iterada.</strong><br>
              ∬ cos(x+y) dA = ∫<sub>x = 0</sub><sup>π</sup> [ ∫<sub>y = 0</sub><sup>π</sup> cos(x+y) dy ] dx</li>

          <li><strong>Paso 3 · Integral interna (dy).</strong> La antiderivada de cos(x+y) respecto a y es
              sin(x+y) (la derivada de x+y respecto a y vale 1, así que no aparece factor extra):<br>
              [ sin(x+y) ]<sub>y = 0</sub><sup>y = π</sup> = sin(x + π) − sin(x + 0)</li>

          <li><strong>Paso 4 · Simplificar con la identidad del semiperíodo.</strong> Vale la identidad
              <strong>sin(θ + π) = −sin θ</strong>, entonces:<br>
              sin(x + π) − sin(x) = −sin(x) − sin(x) = <strong>−2 sin x</strong> = g(x)</li>

          <li><strong>Paso 5 · Integral externa (dx).</strong><br>
              ∫<sub>0</sub><sup>π</sup> (−2 sin x) dx = [ 2 cos x ]<sub>0</sub><sup>π</sup>
              &nbsp;(la antiderivada de −2 sin x es 2 cos x)<br>
              · en x = π → 2 cos(π) = 2(−1) = −2<br>
              · en x = 0 → 2 cos(0) = 2(1) = 2<br>
              Resta: −2 − 2 = <strong>−4</strong></li>

          <li><strong>Paso 6 · Comprobación numérica.</strong> Simpson 60 × 60 → −4.000000
              (Δ ≈ 3.3 × 10⁻⁷).</li>

          <li><strong>Paso 7 · Interpretación geométrica.</strong> Sobre [0,π]² la banda z &lt;0 (donde
              x + y ∈ (π/2, 3π/2)) aporta −4 unidades netas frente a las bandas positivas: el resultado −4
              mide el "desequilibrio" de la onda en ese rectángulo. Si se pidiera el volumen total sin signo,
              habría que integrar |cos(x+y)|.</li>
        </ol>`
    }
  ];

  // Espacio de nombres global del proyecto
  global.CalcMelody = global.CalcMelody || {};
  global.CalcMelody.EJEMPLOS = EJEMPLOS;
})(window);
