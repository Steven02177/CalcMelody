/**
 * ============================================================
 *  CalcMelody · test/pruebas.js
 *  Pruebas matemáticas reales (Node, sin navegador).
 *
 *  Ejecutar:  node test/pruebas.js
 *
 *  Carga los módulos del navegador en un sandbox y comprueba:
 *    · derivadas parciales (5 casos del enunciado + los 7 ejemplos)
 *    · integrales dobles (4 casos del enunciado + variable límite)
 *    · los dos órdenes de integración
 *    · generación dinámica de procedimientos
 *    · sanidad del LaTeX generado
 * ============================================================
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const RAIZ = path.join(__dirname, '..', 'CalcMelody');
const ARCHIVOS = [
  'js/ejemplos.js',
  'js/expresiones.js',
  'js/simbolico.js',
  'js/calculo.js',
  'js/latex.js',
  'js/procedimientos.js',
  'js/grafica.js',
  'js/melodia.js',
  'js/ui.js'
];

/* ---------------- sandbox ---------------- */
const sandbox = { console, setTimeout, clearTimeout, Date };
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const rel of ARCHIVOS) {
  const ruta = path.join(RAIZ, rel);
  vm.runInContext(fs.readFileSync(ruta, 'utf8'), sandbox, { filename: rel });
}
const CM = sandbox.window.CalcMelody;
const EXP = CM.expresiones;
const SIM = CM.simbolico;
const PROC = CM.procedimientos;

/* ---------------- utilidades ---------------- */
let pasados = 0;
let fallidos = 0;
const fallos = [];

function ok(cond, nombre, detalle) {
  if (cond) {
    pasados++;
    console.log('  ✓ ' + nombre);
  } else {
    fallidos++;
    fallos.push(nombre + (detalle ? ' — ' + detalle : ''));
    console.log('  ✗ ' + nombre + (detalle ? '  [' + detalle + ']' : ''));
  }
}

function casi(a, b, tol) {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  return Math.abs(a - b) <= (tol || 1e-9) * Math.max(1, Math.abs(a), Math.abs(b));
}

/** Igualdad simbólica comprobada por muestreo numérico. */
function igualdadMuestral(astA, astB, muestras) {
  const pts = muestras || 24;
  for (let i = 0; i < pts; i++) {
    const x = -2.3 + (4.7 * i) / pts + 0.11 * Math.sin(i * 3.1);
    const y = 1.7 - (3.9 * i) / pts + 0.07 * Math.cos(i * 2.3);
    const a = EXP.evaluar(astA, x, y);
    const b = EXP.evaluar(astB, x, y);
    if (!Number.isFinite(a) && !Number.isFinite(b)) continue;
    if (!casi(a, b, 1e-9)) return false;
  }
  return true;
}

function derivadaDe(expresion, variable) {
  const ast = EXP.parsear(expresion);
  return SIM.simplificar(EXP.derivar(ast, variable));
}

/** Derivada parcial comprobada numéricamente (diferencias finitas). */
function derivadaNumerica(f, x, y, variable) {
  const h = 1e-5;
  return variable === 'x'
    ? (f(x + h, y) - f(x - h, y)) / (2 * h)
    : (f(x, y + h) - f(x, y - h)) / (2 * h);
}

function sanidadTex(tex) {
  if (typeof tex !== 'string' || !tex.length) return false;
  if (/NaN|undefined|\?\?/.test(tex)) return false;
  let llaves = 0;
  for (const c of tex) {
    if (c === '{') llaves++;
    if (c === '}') llaves--;
    if (llaves < 0) return false;
  }
  return llaves === 0;
}

const N = (v) => ({ t: 'num', v: v });

/* ============================================================
 *  1) DERIVADAS PARCIALES — casos del enunciado
 * ============================================================ */
console.log('\n== Derivadas parciales (casos del enunciado) ==');

const CASOS_DERIVADA = [
  {
    f: 'x^2 + y^2',
    dx: '2*x', dy: '2*y'
  },
  {
    f: '3*x^2*y + 5*x*y^2',
    dx: '6*x*y + 5*y^2', dy: '3*x^2 + 10*x*y'
  },
  {
    f: 'x*y + e^x + ln(y)',
    dx: 'y + e^x', dy: 'x + 1/y'
  },
  {
    f: '(x^2+y^2)^3',
    dx: '6*x*(x^2+y^2)^2', dy: '6*y*(x^2+y^2)^2'
  },
  {
    f: 'sin(x*y)',
    dx: 'y*cos(x*y)', dy: 'x*cos(x*y)'
  }
];

for (const c of CASOS_DERIVADA) {
  for (const v of ['x', 'y']) {
    const esperado = EXP.parsear(v === 'x' ? c.dx : c.dy);
    const obtenido = derivadaDe(c.f, v);
    ok(igualdadMuestral(obtenido, esperado),
      `∂/∂${v} de ${c.f} = ${v === 'x' ? c.dx : c.dy}`,
      'obtenido: ' + SIM.aLatex(obtenido));

    const res = PROC.pasosDerivada(EXP.parsear(c.f), v);
    ok(res.pasos.length >= 3 && sanidadTex(res.resultadoTex),
      `  → procedimiento de ∂/∂${v} (${res.pasos.length} pasos)`,
      res.resultadoTex);
  }
}

/* ============================================================
 *  2) DERIVADAS de los 7 ejemplos predefinidos
 * ============================================================ */
console.log('\n== Derivadas de los ejemplos predefinidos ==');

for (const ej of CM.EJEMPLOS) {
  const ast = EXP.parsear(ej.expresion);
  for (const [v, prog] of [['x', ej.df_dx], ['y', ej.df_dy]]) {
    const sim = SIM.simplificar(EXP.derivar(ast, v));
    let coincide = true;
    for (let i = 0; i < 20 && coincide; i++) {
      const x = ej.xlim[0] + ((ej.xlim[1] - ej.xlim[0]) * i) / 19;
      const y = ej.ylim[0] + ((ej.ylim[1] - ej.ylim[0]) * (i % 7)) / 6;
      const a = EXP.evaluar(sim, x, y);
      const b = prog(x, y);
      coincide = casi(a, b, 1e-6) || (!Number.isFinite(a) && !Number.isFinite(b));
    }
    ok(coincide, `${ej.id}: ∂f/∂${v} simbólica = programada`);
  }
}

/* ============================================================
 *  3) INTEGRALES DOBLES — casos del enunciado
 * ============================================================ */
console.log('\n== Integrales dobles (casos del enunciado) ==');

function resolver(fTxt, xlim, ylim, orden) {
  const ast = EXP.parsear(fTxt);
  const lims = {
    x: typeof xlim[0] === 'string' || typeof xlim[1] === 'string'
      ? [typeof xlim[0] === 'string' ? EXP.parsear(xlim[0]) : N(xlim[0]),
         typeof xlim[1] === 'string' ? EXP.parsear(xlim[1]) : N(xlim[1])]
      : [N(xlim[0]), N(xlim[1])],
    y: typeof ylim[0] === 'string' || typeof ylim[1] === 'string'
      ? [typeof ylim[0] === 'string' ? EXP.parsear(ylim[0]) : N(ylim[0]),
         typeof ylim[1] === 'string' ? EXP.parsear(ylim[1]) : N(ylim[1])]
      : [N(ylim[0]), N(ylim[1])]
  };
  const f = (x, y) => EXP.evaluar(ast, x, y);
  const conv = (n) => (SIM.valorNumerico(n) !== null ? SIM.valorNumerico(n) : null);
  const convFn = (n, ord) => {
    const c = conv(n);
    if (c !== null) return c;
    return ord === 'dydx' ? (x) => EXP.evaluar(n, x, 0) : (y) => EXP.evaluar(n, 0, y);
  };
  const limsNum = {
    x: [convFn(lims.x[0], 'dxdy'), convFn(lims.x[1], 'dxdy')],
    y: [convFn(lims.y[0], 'dydx'), convFn(lims.y[1], 'dydx')]
  };
  const numerico = CM.calculo.integralNumerica(f, orden || 'dydx', limsNum.x, limsNum.y, 60);
  const res = PROC.resolverIntegral(ast, orden || 'dydx', lims, {
    texto: fTxt, funcion: f, limitesNum: limsNum, numerico: numerico, n: 60
  });
  return { res, numerico, lims, f };
}

const CASOS_INTEGRAL = [
  { txt: 'x + y', x: [0, 1], y: [0, 1], esperado: 1, nombre: '∫₀¹∫₀¹ (x+y) dy dx' },
  { txt: 'x*y', x: [0, 2], y: [0, 3], esperado: 9, nombre: '∫₀²∫₀³ x·y dy dx' },
  { txt: 'x^2 + y^2', x: [0, 1], y: [0, 1], esperado: 2 / 3, nombre: '∫₀¹∫₀¹ (x²+y²) dy dx' },
  // Nota: el enunciado indica 1/8; el valor correcto es 1/6.
  { txt: 'y', x: [0, 1], y: ['0', 'x'], esperado: 1 / 6, nombre: '∫₀¹∫₀ˣ y dy dx' }
];

for (const c of CASOS_INTEGRAL) {
  const { res, numerico } = resolver(c.txt, c.x, c.y, 'dydx');
  ok(res.symbolic === true, `${c.nombre}: solución simbólica`, res.motivo || '');
  if (res.symbolic) {
    ok(casi(res.resultadoValor, c.esperado, 1e-9),
      `${c.nombre}: exacto = ${c.esperado}`,
      'obtenido ' + res.resultadoTex + ' = ' + res.resultadoValor);
    ok(sanidadTex(res.resultadoTex) && res.pasos.length >= 6,
      `${c.nombre}: procedimiento completo (${res.pasos.length} pasos)`);
    ok(res.pasos.every((p) => sanidadTex(p.cuerpo) || p.cuerpo.indexOf('NaN') === -1),
      `${c.nombre}: pasos sin NaN/undefined`);
  }
  ok(casi(numerico, c.esperado, 1e-6),
    `${c.nombre}: Simpson 60×60 ≈ ${c.esperado}`,
    'obtenido ' + numerico);
}

/* ============================================================
 *  4) AMBOS ÓRDENES DE INTEGRACIÓN
 * ============================================================ */
console.log('\n== Órdenes de integración ==');
{
  const a = resolver('x^2 + y^2', [0, 1], [0, 1], 'dydx');
  const b = resolver('x^2 + y^2', [0, 1], [0, 1], 'dxdy');
  ok(a.res.symbolic && b.res.symbolic, 'los dos órdenes tienen solución simbólica');
  ok(casi(a.res.resultadoValor, b.res.resultadoValor, 1e-9),
    '∫∫ dy dx = ∫∫ dx dy', `${a.res.resultadoValor} vs ${b.res.resultadoValor}`);
  ok(casi(a.numerico, b.numerico, 1e-9), 'Simpson coincide en ambos órdenes');
}

/* ============================================================
 *  5) LOS 7 EJEMPLOS PREDEFINIDOS
 * ============================================================ */
console.log('\n== Integrales de los ejemplos predefinidos ==');

for (const ej of CM.EJEMPLOS) {
  const r = resolver(ej.expresion, ej.xlim, ej.ylim, 'dydx');
  if (ej.id === 'gaussiana') {
    ok(r.res.symbolic === false,
      `${ej.id}: informa que no hay primitiva elemental`,
      r.res.symbolic ? 'salió simbólica' : '');
    ok(casi(r.numerico, ej.valorExacto, 1e-4),
      `${ej.id}: Simpson ≈ valor de referencia (${ej.valorExacto})`,
      String(r.numerico));
    continue;
  }
  ok(r.res.symbolic === true, `${ej.id}: solución simbólica`, r.res.motivo || '');
  if (r.res.symbolic) {
    ok(casi(r.res.resultadoValor, ej.valorExacto, 1e-6),
      `${ej.id}: exacto = valor de referencia (${ej.valorExacto})`,
      `${r.res.resultadoTex} = ${r.res.resultadoValor}`);
  }
  ok(casi(r.numerico, ej.valorExacto, 1e-4),
    `${ej.id}: Simpson ≈ ${ej.valorExacto}`, String(r.numerico));
}

/* ============================================================
 *  6) FUNCIONES PERSONIZADAS MÁS COMPLEJAS
 * ============================================================ */
console.log('\n== Funciones personalizadas complejas ==');

const COMPLEJAS = [
  { txt: 'sqrt(x + y)', x: [0, 1], y: [0, 1] },
  { txt: 'cos(x + y)', x: [0, 'pi'], y: [0, 'pi'] },
  { txt: 'sin(x)*cos(y)', x: [0, 'pi'], y: [0, 'pi/2'] },
  { txt: '2*x + 3*y', x: [0, 1], y: [0, 2] },
  { txt: 'x*y', x: [0, 1], y: [0, 2] },
  { txt: 'x^2*y^3', x: [1, 2], y: [0, 2] },
  { txt: 'exp(2*x + y)', x: [0, 1], y: [0, 1] },
  { txt: '1/(1 + x^2) + y', x: [0, 1], y: [0, 1] },
  { txt: 'x*sin(x)', x: [0, 'pi'], y: [0, 1] }
];

for (const c of COMPLEJAS) {
  const r = resolver(c.txt, c.x, c.y, 'dydx');
  const okSim = r.res.symbolic;
  ok(okSim && Number.isFinite(r.res.resultadoValor),
    `${c.txt}: solución simbólica`, r.res.motivo || String(r.res.resultadoValor));
  if (okSim) {
    // comprobación cruzada con Simpson
    ok(casi(r.res.resultadoValor, r.numerico, 1e-5),
      `${c.txt}: exacto ≈ Simpson (${r.res.resultadoValor} / ${r.numerico})`);
  }
  // Conversión elemento a elemento: los límites pueden ser mixtos ([0, 'pi']).
  const aNum = (arr) => arr.map((e) =>
    typeof e === 'string' ? SIM.valorNumerico(EXP.parsear(e)) : e);
  ok(casi(r.numerico, CM.calculo.integralNumerica(
    (x, y) => EXP.evaluar(EXP.parsear(c.txt), x, y), 'dydx',
    aNum(c.x), aNum(c.y), 60), 1e-12), `${c.txt}: integralNumerica consistente`);
}

/* ============================================================
 *  7) SINTAXIS Y SANIDAD DEL LaTeX
 * ============================================================ */
console.log('\n== Sintaxis y LaTeX ==');

const EXPRESIONES_TEX = [
  'x^2 + y^2', '3*x^2*y + 5*x*y^2', '(x^2+y^2)^3', 'sin(x*y)',
  'sqrt(x + y)', 'e^(-x^2 - y^2)', '1/(1 + x^2)', 'x^(-1)', '2/3*x'
];
for (const e of EXPRESIONES_TEX) {
  const ast = EXP.parsear(e);
  const tex = SIM.aLatex(ast);
  ok(sanidadTex(tex), `aLatex(${e}) → ${tex}`);
  const texDx = SIM.aLatex(SIM.simplificar(EXP.derivar(ast, 'x')));
  ok(sanidadTex(texDx), `aLatex(∂/∂x de ${e}) → ${texDx}`);
}

// Superíndices tipográficos (x²) y símbolos de los ejemplos
ok(EXP.evaluar(EXP.parsear('x² + y²'), 3, 4) === 25, 'parser: x² + y²');
ok(EXP.evaluar(EXP.parsear('√(x+y)'), 3, 1) === 2, 'parser: √(x+y)');
ok(EXP.evaluar(EXP.parsear('2x + 3y'), 1, 1) === 5, 'parser: multiplicación implícita');
ok(casi(EXP.evaluar(EXP.parsear('e^(−x²−y²)'), 0, 0), 1, 1e-12), 'parser: e^(−x²−y²)');

// Fracciones exactas
ok(SIM.aLatex(N(2 / 3)) === '\\frac{2}{3}', 'fracción 2/3 en LaTeX: ' + SIM.aLatex(N(2 / 3)));
ok(SIM.aLatex(N(1 / 8)) === '\\frac{1}{8}', 'fracción 1/8 en LaTeX: ' + SIM.aLatex(N(1 / 8)));
ok(EXP.aTexto(SIM.simplificar(EXP.parsear('2/3'))).indexOf('2/3') !== -1,
  'fracción 2/3 en texto: ' + EXP.aTexto(SIM.simplificar(EXP.parsear('2/3'))));

/* ============================================================
 *  8) SIMPLIFICACIÓN (colecta de términos)
 * ============================================================ */
console.log('\n== Simplificación ==');

const SIMPLIFICACIONES = [
  ['(x^2 + 1/3) - (-x^2 - 1/3)', '2*x^2 + 2/3'],
  ['x*x^2', 'x^3'],
  ['2*3*x', '6*x'],
  ['y + 0', 'y'],
  ['0*x + 2*1', '2'],
  ['1*y + x*0', 'y']
];
for (const [entrada, esperada] of SIMPLIFICACIONES) {
  const a = SIM.simplificar(EXP.parsear(entrada));
  const b = EXP.parsear(esperada);
  ok(igualdadMuestral(a, b), `simplificar(${entrada}) = ${esperada}`,
    'obtenido: ' + SIM.aLatex(a));
}

/* ============================================================
 *  RESUMEN
 * ============================================================ */
console.log('\n========================================');
console.log(`Pruebas: ${pasados + fallidos} · correctas: ${pasados} · fallidas: ${fallidos}`);
if (fallidos) {
  console.log('\nFallos:');
  fallos.forEach((f) => console.log('  - ' + f));
  process.exit(1);
}
console.log('✔ Todas las pruebas matemáticas pasaron.');
