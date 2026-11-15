# CalcMelody 🎵∯

Aplicación web de **cálculo multivariable** que resuelve integrales dobles,
calcula derivadas parciales **con procedimiento paso a paso completo**,
grafica la superficie en 2D y 3D con **Plotly.js** y genera una **melodía
pentatónica** a partir de la geometría de la superficie (Web Audio API).

Todas las fórmulas se renderizan con **KaTeX** (matemática real, sin texto
LaTeX sin procesar) y todos los pasos se generan **dinámicamente desde el
árbol sintáctico (AST)** de la expresión: no hay resultados escritos a mano.

Incluye **7 funciones predefinidas** y la posibilidad de **escribir tu propia
función** `f(x, y)` con sus límites de integración (numéricos o con
expresiones como `0, x`), y el **orden de integración** `dy dx` o `dx dy`.

---

## Autores

Proyecto desarrollado por:

| Integrante |
|---|
| **Keyner Garcia** |
| **Mateo Sanguino** |
| **Jorge Aguillon** |
| **Kenner Rodriguez** |

**UDES — Universidad de Santander** · Proyecto de Cálculo Multivariable

---

## Descripción

CalcMelody combina análisis matemático y sonificación:

1. **Resuelve integrales dobles** ∬ f(x,y) dA en **los dos órdenes**
   (`dy dx` y `dx dy`), con límites constantes o variables (`0 ≤ y ≤ x`),
   de forma **simbólica** (primitiva elemental + teorema fundamental)
   y con **comprobación numérica** por Simpson compuesto anidado
   (60 × 60 subdivisiones). Cuando no existe primitiva elemental
   (p. ej. la gaussiana), **lo indica claramente** y usa Simpson.
2. **Calcula derivadas parciales** ∂f/∂x o ∂f/∂y **paso a paso**:
   identificación de términos constantes/variables, regla aplicada
   (suma, producto, cociente, potencia, cadena, constantes…),
   operaciones intermedias, simplificación y resultado final.
3. **Grafica con Plotly.js**: superficie 3D o contorno 2D, ejes con
   título, leyenda completa, la **región de integración R** dibujada,
   los **24 puntos de muestreo en verde** y — al derivar — la función
   original en gris semitransparente para comparar.
4. **Genera una melodía**: muestrea el dominio en dos diagonales, normaliza
   z ∈ [0,1], mapea a la escala pentatónica mayor (C4, D4, E4, G4, A4, C5…)
   y reproduce las notas con osciladores *sine* + envolvente.
5. Muestra **procedimiento paso a paso** (15–19 pasos en las integrales),
   **tabla de valores** (# | x | y | z | Nota)
   y la **secuencia de notas** con botones de reproducir/detener.

---

## Cómo abrirlo

### Opción A — directa (doble clic)

1. Abre la carpeta `CalcMelody/`.
2. Haz doble clic en **`index.html`** (se abre en el navegador).
   > Funciona así: los scripts son archivos JS clásicos (sin módulos ES),
   > por lo que no hace falta servidor ni build.

### Opción B — servidor local (opcional)

```bash
cd CalcMelody
npx serve .          # o: python -m http.server 8080
# luego abre http://localhost:8080
```

**Requisito:** conexión a internet la primera vez para cargar Plotly.js y
KaTeX desde el CDN.

### Uso

1. Elige una **función de ejemplo** (7 disponibles) **o** selecciona
   **“✎ Función personalizada”** y escribe tu propia `f(x, y)` junto con los
   límites de x e y (ejemplo: `x^2 + y*sin(y)` con límites `-1, 1` y `0, 3`).
2. Elige la **operación**: solo integral doble, ∂f/∂x o ∂f/∂y.
3. Elige la **vista**: 3D (superficie) o 2D (contorno).
4. Elige el **orden de integración**: `∫∫ … dy dx` (primero y) o
   `∫∫ … dx dy` (primero x).
5. Pulsa **“▶ Calcular, graficar y generar melodía”**.
6. Revisa valor de la integral, **procedimiento paso a paso completo**,
   derivada (si aplica), gráfica con la región R y la tabla de valores.
7. Pulsa **“🔊 Reproducir melodía”** para escuchar las 24 notas.

> **Sintaxis de la función personalizada:** operadores `+ − * / ^`,
> funciones `sin cos tan sqrt exp ln log abs asin acos atan`, constantes `pi` y `e`.
> También acepta `√(x+y)`, `π`, superíndices (`x²`), multiplicación implícita
> (`2x`, `xy`) y `**` como potencia. **Los límites** se escriben como `a, b` y
> pueden ser números (`-1, 1`) o expresiones (`0, x`, `0, pi/2`).
> Las derivadas parciales y las primitivas se obtienen **simbólicamente** del
> árbol sintáctico (sin usar `eval`), por ejemplo `x*y + sin(x)` →
> `∂f/∂x = y + cos(x)`.

---

## Estructura

```
CalcMelody/
├── index.html          # página principal (enlaza CSS, Plotly, KaTeX y scripts)
├── css/
│   └── styles.css      # diseño oscuro moderno, responsive básico
├── js/
│   ├── ejemplos.js     # 7 funciones con datos: f, derivadas, dominio,
│   │                   #   valor exacto, interpretación y pasos (HTML)
│   ├── expresiones.js  # analizador sintáctico (sin eval): parsea, evalúa,
│   │                   #   DERIVA SIMBÓLICAMENTE y convierte AST → texto
│   ├── simbolico.js    # motor algebraico: AST → LaTeX, simplificación
│   │                   #   (colecta de términos/fusión de factores),
│   │                   #   sustitución de límites, esLineal, ANTIDERIVACIÓN
│   │                   #   simbólica con registro de reglas e integral definida
│   ├── calculo.js      # integral doble (Simpson 2D, ambos órdenes y
│   │                   #   límites función) + derivadas + formato
│   ├── latex.js        # envoltorio de KaTeX: .tex → fórmulas renderizadas
│   ├── procedimientos.js # generador DINÁMICO de pasos: pasosDerivada,
│   │                   #   resolverIntegral (15–19 pasos) y aHTML
│   ├── grafica.js      # Plotly 3D surface / 2D contour + región R +
│   │                   #   superficies de comparación + puntos verdes
│   ├── melodia.js      # muestreo del dominio, escala pentatónica y audio
│   ├── ui.js           # DOM: selects, límites, validación del orden,
│   │                   #   resultados y pasos de funciones personalizadas
│   └── main.js         # punto de entrada (DOMContentLoaded)
├── assets/             # (opcional) imágenes u otros recursos
└── README.md

test/
└── pruebas.js          # suite matemática en Node: node test/pruebas.js
```

> Todos los módulos se autoexpone en el espacio de nombres global
> **`window.CalcMelody`** (`EJEMPLOS`, `expresiones`, `simbolico`, `calculo`,
> `latex`, `procedimientos`, `grafica`, `melodia`, `ui`).

---

## Funcionalidades

| Sección | Contenido |
|---|---|
| **0 · Configuración** | Selector de ejemplo (7 + **✎ función personalizada** con campos f(x,y) y límites), selector de operación (integral / ∂f/∂x / ∂f/∂y), selector de vista (3D / 2D), selector de **orden de integración** (dy dx / dx dy) y botón principal. |
| **1 · Integral doble** | Valor exacto (fracción cuando es exacta) + decimal + Δ de Simpson, interpretación geométrica, recordatorio del método y **procedimiento paso a paso de 15–19 pasos**: identificación de datos, constantes/variables, región R, integral interna con sus reglas, teorema fundamental, integral externa, resultado exacto y comprobación numérica. Si no hay primitiva elemental, lo dice y usa Simpson. |
| **2 · Derivada parcial** | **Procedimiento paso a paso completo**: planteamiento y clasificación de términos (constante vs. variable), regla aplicada con su fórmula, operaciones intermedias, simplificación y resultado final, todo en LaTeX (KaTeX). |
| **3 · Gráfica** | Plotly: superficie 3D (Viridis, ejes con título, leyenda) o contorno 2D, **región de integración R**, 24 puntos de muestreo en verde con hover y — al derivar — `f(x,y)` original en gris semitransparente. |
| **4 · Tabla de valores** | `# | x | y | z | Nota` para los 24 puntos muestreados. |
| **5 · Melodía** | Secuencia de notas, info de la escala y botones reproducir/detener. |

### Lógica de la melodía

- **Muestreo:** 24 puntos = 12 en cada diagonal del rectángulo
  `(x₀,y₀)→(x₁,y₁)` y `(x₀,y₁)→(x₁,y₀)`, entrelazados.
- **Normalización:** `z_norm = (z − min) / (max − min)` ∈ [0, 1].
- **Mapeo:** `índice = round(z_norm × 9)` sobre la escala pentatónica
  `C4 D4 E4 G4 A4 C5 D5 E5 G5 A5` (261.63 … 880 Hz).
- **Audio:** un oscilador *sine* por nota con envolvente
  (ataque 0.03 s → sostenido → caída), 0.28 s por nota ≈ 7 s en total.

### Ejemplos incluidos

| # | f(x,y) | Dominio | ∬ f dA (exacto) |
|---|--------|---------|-----------------|
| 1 | x² + y² | [−1,1]² | 8/3 ≈ 2.6667 |
| 2 | sin(x)·cos(y) | [0,π] × [0,π/2] | 2 |
| 3 | 2x + 3y | [0,1] × [0,2] | 8 |
| 4 | e^(−x²−y²) | [−2,2]² | ≈ 3.1123 |
| 5 | x·y | [0,1] × [0,2] | 1 |
| 6 | √(x+y) | [0,1]² | (4/15)(4√2−2) ≈ 0.9752 |
| 7 | cos(x+y) | [0,π]² | −4 |

---

## Tecnologías

- **Vanilla JavaScript** (sin frameworks), organizado en archivos independientes.
- **Plotly.js** por CDN (graficado 2D/3D).
- **KaTeX 0.16** por CDN (renderizado profesional de todas las fórmulas).
- **Web Audio API** (osciladores + envolvente de ganancia).
- **HTML5 + CSS3** con variables CSS, Grid/Flexbox y media queries.

---

## Pruebas

La suite `test/pruebas.js` carga los módulos del navegador en un sandbox de
Node (sin navegador, sin `eval`) y comprueba la matemática real:

```bash
node test/pruebas.js      # desde la raíz del proyecto (no es npm)
```

Cubre **135 aserciones**:

- 5 casos de derivadas parciales del enunciado (∂/∂x y ∂/∂y de 5 funciones).
- Las derivadas simbólicas de los 7 ejemplos, contrastadas con sus
  derivadas programadas por muestreo numérico.
- 4 casos de integrales dobles del enunciado + los 7 ejemplos +
  9 funciones personalizadas complejas (con `pi`, límites mixtos,
  `x·sin x` por partes, `1/(1+x²)` con arctan, etc.).
- Los **dos órdenes** de integración y la coherencia entre el resultado
  simbólico y Simpson 60 × 60.
- Sanidad del LaTeX generado (sin `NaN`, `undefined`, llaves desbalanceadas).
- Colecta de términos y fusión de factores del simplificador.

> **Nota:** para `∫₀¹∫₀ˣ y dy dx` el valor correcto es **1/6**;
> el enunciado indica 1/8 (errata documentada en `test/pruebas.js`).

---

## Despliegue en Vercel

La carpeta `CalcMelody/` es 100% estática, sin build:

```bash
npm i -g vercel
cd CalcMelody
vercel
```

O conecta el repositorio en [vercel.com/new](https://vercel.com/new)
seleccionando **Other** como framework y `CalcMelody/` como *Root Directory*.
