/**
 * ============================================================
 *  CalcMelody · simbolico.js
 *  Motor algebraico simbólico (extiende expresiones.js).
 *
 *    · aLatex(nodo)               → LaTeX profesional de un AST
 *    · simplificar(nodo)          → simplificación mejorada
 *                                   (colecta de términos y fusión
 *                                    de factores)
 *    · sustituir(nodo, v, valor)  → sustitución de límites
 *    · esLineal(nodo, v)          → detecta a·v + b
 *    · antiderivar(nodo, v, …)    → primitiva simbólica con registro
 *                                   de las reglas aplicadas
 *    · integralDefinida(…)        → sustitución de límites
 *
 *  No se usa eval(): todo trabaja sobre el árbol sintáctico (AST).
 *  Las constantes se muestran como fracciones exactas cuando la
 *  representación decimal es exacta (2/3, 1/8, 4/15 …).
 * ============================================================
 */
(function (global) {
  'use strict';

  const CM = global.CalcMelody;
  const EXP = CM.expresiones;

  const simbolico = {};

  /* ----------------------------------------------------------
   *  Constructores y atajos
   * ---------------------------------------------------------- */
  const num = (v) => ({ t: 'num', v: v });
  const UNO = num(1);
  const CERO = num(0);
  const DOS = num(2);
  const TRES = num(3);

  const mul = (a, b) => ({ t: 'bin', op: '*', a: a, b: b });
  const sum = (a, b) => ({ t: 'bin', op: '+', a: a, b: b });
  const res = (a, b) => ({ t: 'bin', op: '-', a: a, b: b });
  const div = (a, b) => ({ t: 'bin', op: '/', a: a, b: b });
  const pot = (a, b) => ({ t: 'bin', op: '^', a: a, b: b });
  const neg = (a) => ({ t: 'neg', a: a });
  const llamada = (name, arg) => ({ t: 'call', name: name, args: [arg] });
  const varDe = (v) => ({ t: 'var', name: v });

  const esNum = (n, v) => !!n && n.t === 'num' && (v === undefined || n.v === v);
  const depende = (n, v) => EXP.depende(n, v);
  const libre = (n) => !EXP.depende(n, 'x') && !EXP.depende(n, 'y');

  /* ----------------------------------------------------------
   *  1) Representación canónica (para agrupar términos)
   * ---------------------------------------------------------- */
  function claver(n) {
    if (!n) return '';
    switch (n.t) {
      case 'num': return 'N' + n.v;
      case 'const': return 'C' + n.v;
      case 'var': return 'V' + n.name;
      case 'neg': return '-' + claver(n.a);
      case 'bin': return '(' + claver(n.a) + n.op + claver(n.b) + ')';
      case 'call': return n.name + '(' + n.args.map(claver).join(',') + ')';
    }
    return '?';
  }

  /* ----------------------------------------------------------
   *  2) Fracciones exactas (devolutivo de fracciones continuas)
   * ---------------------------------------------------------- */
  function fraccion(v, maxDen) {
    maxDen = maxDen || 16;
    if (!Number.isFinite(v) || Number.isInteger(v)) return null;
    if (Math.abs(v) >= 1e8) return null;
    let h1 = 1, h2 = 0, k1 = 0, k2 = 1, b = v;
    for (let i = 0; i < 32; i++) {
      const a = Math.floor(b);
      const h = a * h1 + h2;
      const k = a * k1 + k2;
      h2 = h1; h1 = h; k2 = k1; k1 = k;
      if (k1 > maxDen) return null;
      if (k1 !== 0 && Math.abs(v - h1 / k1) <= 1e-10 * Math.max(1, Math.abs(v))) {
        return { n: h1, d: k1 };
      }
      const dif = b - a;
      if (Math.abs(dif) < 1e-13) break;
      b = 1 / dif;
    }
    return null;
  }

  /* ----------------------------------------------------------
   *  3) AST → LaTeX
   * ---------------------------------------------------------- */
  const FN_TEX = {
    sin: '\\sin', cos: '\\cos', tan: '\\tan',
    asin: '\\arcsin', acos: '\\arccos', atan: '\\arctan',
    sinh: '\\sinh', cosh: '\\cosh', tanh: '\\tanh',
    ln: '\\ln', log: '\\log', exp: '\\exp', sign: '\\mathrm{sgn}'
  };

  function texNum(v) {
    if (!Number.isFinite(v)) return String(v);
    if (Number.isInteger(v)) return String(v);
    const f = fraccion(v);
    if (f) return (f.n < 0 ? '-' : '') + '\\frac{' + Math.abs(f.n) + '}{' + f.d + '}';
    const abs = Math.abs(v);
    if (abs < 1e-4 || abs >= 1e6) {
      const partes = v.toExponential(2).split('e');
      return partes[0] + ' \\times 10^{' + partes[1] + '}';
    }
    return String(Number(v.toFixed(4)));
  }

  function texCall(n) {
    const a = n.args[0];
    if (n.name === 'sqrt') return '\\sqrt{' + tex(a, 0) + '}';
    if (n.name === 'cbrt') return '\\sqrt[3]{' + tex(a, 0) + '}';
    if (n.name === 'abs') return '\\left|' + tex(a, 0) + '\\right|';
    if (n.name === 'exp') return 'e^{' + tex(a, 0) + '}';
    if (n.name === 'log') return '\\log_{10}\\left(' + tex(a, 0) + '\\right)';
    const fn = FN_TEX[n.name] || ('\\mathrm{' + n.name + '}');
    return fn + '\\left(' + tex(a, 0) + '\\right)';
  }

  /**
   * Convierte un AST en LaTeX con paréntesis mínimos.
   * prec: 0 = suma/resta · 1 = producto · 2 = átomo/potencia-base
   */
  function tex(n, prec) {
    if (!n) return '';
    prec = prec || 0;
    switch (n.t) {
      case 'num': return texNum(n.v);
      case 'const': return n.v === 'pi' ? '\\pi' : 'e';
      case 'var': return n.name;
      case 'neg': {
        let s;
        if (n.a.t === 'bin' && (n.a.op === '+' || n.a.op === '-')) {
          s = '-\\left(' + tex(n.a, 0) + '\\right)';
        } else if (n.a.t === 'neg') {
          return tex(n.a.a, prec); // −(−u) = u
        } else {
          s = '-' + tex(n.a, 1);
        }
        return prec > 1 ? '\\left(' + s + '\\right)' : s;
      }
      case 'call': {
        const s = texCall(n);
        return prec > 1 ? '\\left(' + s + '\\right)' : s;
      }
      case 'bin': {
        const op = n.op;
        if (op === '/') return '\\frac{' + tex(n.a, 0) + '}{' + tex(n.b, 0) + '}';
        if (op === '^') {
          const s = tex(n.a, 2) + '^{' + tex(n.b, 0) + '}';
          return prec > 2 ? '\\left(' + s + '\\right)' : s;
        }
        if (op === '*') {
          const izq = tex(n.a, 1);
          const der = n.b.t === 'neg'
            ? '\\left(' + tex(n.b, 1) + '\\right)'
            : tex(n.b, 1);
          const s = izq + ' \\cdot ' + der;
          return prec > 1 ? '\\left(' + s + '\\right)' : s;
        }
        // '+' y '−'
        const izq = tex(n.a, 0);
        let der;
        if (op === '-' && (n.b.t === 'neg' || (n.b.t === 'num' && n.b.v < 0))) {
          const positivo = n.b.t === 'neg' ? n.b.a : num(-n.b.v);
          der = tex(positivo, 1);
          const s = izq + ' + ' + der;
          return prec > 0 ? '\\left(' + s + '\\right)' : s;
        }
        der = tex(n.b, 1);
        const s = izq + (op === '+' ? ' + ' : ' - ') + der;
        return prec > 0 ? '\\left(' + s + '\\right)' : s;
      }
    }
    return '?';
  }

  function aLatex(n) { return tex(n, 0); }

  /** Integral indefinida en LaTeX: ∫ u dv */
  function intTex(expr, v) {
    return '\\int ' + (expr ? tex(expr, 1) : '') + '\\,d' + v;
  }

  /** Antiderivada entre corchetes con sus límites. */
  function llavesTex(F, v, a, b) {
    return '\\left[' + tex(F, 0) + '\\right]_{' + tex(a, 0) + '}^{' + tex(b, 0) + '}';
  }

  /* ----------------------------------------------------------
   *  4) Sustitución de un valor (límite) en un AST
   * ---------------------------------------------------------- */
  function sustituir(n, v, valor) {
    if (!n) return n;
    switch (n.t) {
      case 'num': case 'const': return n;
      case 'var': return n.name === v ? valor : n;
      case 'neg': return { t: 'neg', a: sustituir(n.a, v, valor) };
      case 'bin':
        return { t: 'bin', op: n.op, a: sustituir(n.a, v, valor), b: sustituir(n.b, v, valor) };
      case 'call':
        return { t: 'call', name: n.name, args: n.args.map((a) => sustituir(a, v, valor)) };
    }
    return n;
  }

  /* ----------------------------------------------------------
   *  5) Detección de expresiones lineales a·v + b
   *     (devuelve {p, q} como ASTs libres de v)
   * ---------------------------------------------------------- */
  function esLineal(n, v) {
    if (!n) return null;
    switch (n.t) {
      case 'num': case 'const': return { p: CERO, q: n };
      case 'var': return n.name === v ? { p: UNO, q: CERO } : { p: CERO, q: n };
      case 'neg': {
        const l = esLineal(n.a, v);
        return l ? { p: neg(l.p), q: neg(l.q) } : null;
      }
      case 'bin': {
        if (n.op === '+') {
          const A = esLineal(n.a, v), B = esLineal(n.b, v);
          return A && B ? { p: simplificar(sum(A.p, B.p)), q: simplificar(sum(A.q, B.q)) } : null;
        }
        if (n.op === '-') {
          const A = esLineal(n.a, v), B = esLineal(n.b, v);
          return A && B ? { p: simplificar(res(A.p, B.p)), q: simplificar(res(A.q, B.q)) } : null;
        }
        if (n.op === '*') {
          const A = esLineal(n.a, v), B = esLineal(n.b, v);
          if (!A || !B) return null;
          if (esNum(A.p, 0)) return { p: simplificar(mul(B.p, n.a)), q: simplificar(mul(B.q, n.a)) };
          if (esNum(B.p, 0)) return { p: simplificar(mul(A.p, n.b)), q: simplificar(mul(A.q, n.b)) };
          return null;
        }
        if (n.op === '/') {
          if (depende(n.b, v)) return null;
          const A = esLineal(n.a, v);
          if (!A) return null;
          return { p: simplificar(div(A.p, n.b)), q: simplificar(div(A.q, n.b)) };
        }
        return null;
      }
      default: return null;
    }
  }

  /* ----------------------------------------------------------
   *  6) Simplificación mejorada
   *     · pliegue de constantes (motor base de expresiones.js)
   *     · colecta de términos:  (x² + 1/3) − (−x² − 1/3) → 2x² + 2/3
   *     · fusión de factores:  x · x² → x³   ·   2·3·x → 6x
   * ---------------------------------------------------------- */
  function simplificar(n) {
    if (!n) return n;
    return posprocesar(EXP.simplificar(n));
  }

  function posprocesar(n) {
    if (!n) return n;
    switch (n.t) {
      case 'neg': {
        const a = posprocesar(n.a);
        if (a.t === 'num') return num(-a.v);
        if (a.t === 'neg') return a.a;
        return a === n.a ? n : { t: 'neg', a: a };
      }
      case 'bin': {
        const a = posprocesar(n.a);
        const b = posprocesar(n.b);
        const m = a === n.a && b === n.b ? n : { t: 'bin', op: n.op, a: a, b: b };
        if (m.op === '+' || m.op === '-') return colectarSuma(m);
        if (m.op === '*') return fusionarProducto(m);
        if (m !== n) {
          const p = EXP.simplificar(m);
          if (claver(p) !== claver(m)) return posprocesar(p);
        }
        return m;
      }
      case 'call': {
        const args = n.args.map(posprocesar);
        const mismo = args.every((a, i) => a === n.args[i]);
        return mismo ? n : { t: 'call', name: n.name, args: args };
      }
      default: return n;
    }
  }

  /** Descompone una suma en términos con signo (+1 / −1). */
  function partirSuma(n, signo, out) {
    if (n.t === 'bin' && n.op === '+') { partirSuma(n.a, signo, out); partirSuma(n.b, signo, out); }
    else if (n.t === 'bin' && n.op === '-') { partirSuma(n.a, signo, out); partirSuma(n.b, -signo, out); }
    else if (n.t === 'neg') { partirSuma(n.a, -signo, out); }
    else out.push({ signo: signo, nodo: n });
  }

  /** Extrae el factor numérico de un producto: 6·x² → {coef:6, base:x²}. */
  function descomponerCoef(nodo) {
    if (nodo.t === 'num') return { coef: nodo.v, base: null };
    if (nodo.t === 'bin' && nodo.op === '*') {
      const factores = [];
      const aplana = (f) => {
        if (f.t === 'bin' && f.op === '*') { aplana(f.a); aplana(f.b); }
        else if (f.t === 'neg') { factores.push({ neg: true, f: f.a }); }
        else factores.push({ neg: false, f: f });
      };
      aplana(nodo);
      let coef = 1;
      let hayNeg = false;
      const otros = [];
      for (const it of factores) {
        if (it.neg) hayNeg = !hayNeg;
        if (it.f.t === 'num') coef *= it.f.v;
        else otros.push(it.f);
      }
      if (hayNeg) coef = -coef;
      if (!otros.length) return { coef: coef, base: null };
      return { coef: coef, base: otros.length === 1 ? otros[0] : otros.reduce((a, b) => mul(a, b)) };
    }
    if (nodo.t === 'neg') {
      const r = descomponerCoef(nodo.a);
      return { coef: -r.coef, base: r.base };
    }
    return { coef: 1, base: nodo };
  }

  function colectarSuma(n) {
    const terminos = [];
    partirSuma(n, 1, terminos);

    let constante = 0;
    const grupos = new Map();
    const orden = [];

    for (const t of terminos) {
      if (libre(t.nodo)) {
        const val = EXP.evaluar(t.nodo, 0, 0);
        if (Number.isFinite(val)) { constante += t.signo * val; continue; }
      }
      const d = descomponerCoef(t.nodo);
      if (d.base === null) { constante += t.signo * d.coef; continue; }
      const k = claver(d.base);
      if (!grupos.has(k)) { grupos.set(k, { coef: 0, base: d.base }); orden.push(k); }
      grupos.get(k).coef += t.signo * d.coef;
    }

    const piezas = [];
    if (constante !== 0 && Number.isFinite(constante)) piezas.push(num(constante));
    for (const k of orden) {
      const g = grupos.get(k);
      if (g.coef === 0) continue;
      piezas.push(g.coef === 1 ? g.base : mul(num(g.coef), g.base));
    }
    if (!piezas.length) return CERO;
    if (piezas.length === 1) return piezas[0];
    return piezas.reduce((a, b) => sum(a, b));
  }

  function fusionarProducto(n) {
    const factores = [];
    let coef = 1;
    const aplana = (f) => {
      if (f.t === 'bin' && f.op === '*') { aplana(f.a); aplana(f.b); }
      else if (f.t === 'neg') { coef = -coef; aplana(f.a); }
      else if (f.t === 'num') { coef *= f.v; }
      else factores.push(f);
    };
    aplana(n);

    if (!Number.isFinite(coef)) return n;
    if (coef === 0) return CERO;

    // Agrupa potencias de la misma base:  x · x² → x³
    const grupos = new Map();
    const orden = [];
    for (const f of factores) {
      let base = f;
      let exp = UNO; // nodo AST, nunca un número JS suelto
      if (f.t === 'bin' && f.op === '^') {
        base = f.a;
        exp = f.b;
      }
      const k = claver(base);
      if (!grupos.has(k)) { grupos.set(k, { base: base, exp: exp, n: 1 }); orden.push(k); }
      else {
        const g = grupos.get(k);
        g.n += 1;
        g.exp = simplificar(sum(g.exp, exp));
      }
    }

    const piezas = [];
    for (const k of orden) {
      const g = grupos.get(k);
      if (g.n === 1) { piezas.push(esNum(g.exp, 1) ? g.base : pot(g.base, g.exp)); continue; }
      if (esNum(g.exp, 0)) continue;
      piezas.push(esNum(g.exp, 1) ? g.base : pot(g.base, g.exp));
    }

    if (!piezas.length) return num(coef);
    let resultado;
    if (piezas.length === 1) resultado = piezas[0];
    else resultado = piezas.reduce((a, b) => mul(a, b));
    if (coef !== 1) {
      if (resultado.t === 'num') resultado = num(coef * resultado.v);
      else resultado = mul(num(coef), resultado);
    }
    return resultado;
  }

  /* ----------------------------------------------------------
   *  7) Antiderivación simbólica con registro de reglas
   * ---------------------------------------------------------- */
  function esPotenciaDeVar(n, v) {
    if (n.t === 'var' && n.name === v) return 1;
    if (n.t === 'bin' && n.op === '^' && n.a.t === 'var' && n.a.name === v &&
        n.b.t === 'num' && Number.isInteger(n.b.v) && n.b.v >= 1) {
      return n.b.v;
    }
    return 0;
  }

  /**
   * Primitiva de `n` respecto de `v`.
   * @param {object} n      AST
   * @param {string} v      'x' | 'y'
   * @param {Array}  pasos  registros {regla, antes, despues, nota} (LaTeX)
   * @param {number} nivel  profundidad (los pasos se registran en 0)
   * @param {object} estado {motivo} motivo del fallo
   * @returns {object|null} AST de la primitiva
   */
  function antiderivar(n, v, pasos, nivel, estado, prof) {
    nivel = nivel || 0;
    prof = prof || 0;
    if (!n) return null;
    if (prof > 12) return null;

    const push = (regla, antes, despues, nota, soloNivel0) => {
      if (!pasos) return;
      if (soloNivel0 && nivel !== 0) return;
      pasos.push({ regla: regla, antes: antes, despues: despues, nota: nota || '' });
    };
    const fallo = (motivo) => {
      if (estado) estado.motivo = motivo;
      return null;
    };
    const intDe = (e) => intTex(e, v);
    const D = 'd' + v;

    /* --- Término constante respecto a la variable --- */
    if (!depende(n, v)) {
      const r = simplificar(mul(n, varDe(v)));
      push('Término constante respecto a ' + v, intDe(n), aLatex(r),
        'La expresión no contiene la variable de integración, así que se trata como constante: ' +
        '\\(\\int c\\,' + D + ' = c\\cdot ' + v + '\\).', true);
      return r;
    }

    /* --- Suma y resta: linealidad --- */
    if (n.t === 'bin' && (n.op === '+' || n.op === '-')) {
      push('Regla de la linealidad (suma y resta)', intDe(n),
        intDe(n.a) + (n.op === '+' ? ' + ' : ' - ') + intDe(n.b),
        'La integral de una suma (o resta) es la suma de las integrales de cada término.');
      const ia = antiderivar(n.a, v, pasos, nivel, estado, prof + 1);
      if (ia === null) return null;
      const ib = antiderivar(n.b, v, pasos, nivel, estado, prof + 1);
      if (ib === null) return null;
      return simplificar(n.op === '+' ? sum(ia, ib) : res(ia, ib));
    }

    /* --- Signo --- */
    if (n.t === 'neg') {
      push('Propiedad del signo', intDe(n), '-' + intDe(n.a),
        'Sacar el signo fuera de la integral.', true);
      const i = antiderivar(n.a, v, pasos, nivel + 1, estado, prof + 1);
      if (i === null) return null;
      return simplificar(neg(i));
    }

    /* --- Variable de integración --- */
    if (n.t === 'var') {
      const r = div(pot(varDe(v), DOS), DOS);
      push('Regla de la potencia (n = 1)', intDe(n), aLatex(r),
        '\\(\\int ' + v + '\\,' + D + ' = \\frac{' + v + '^2}{2}\\).', true);
      return r;
    }

    /* --- Producto --- */
    if (n.t === 'bin' && n.op === '*') {
      const aC = !depende(n.a, v);
      const bC = !depende(n.b, v);
      if (aC || bC) {
        const cte = aC ? n.a : n.b;
        const otro = aC ? n.b : n.a;
        push('Múltiplo constante', intDe(n),
          tex(cte, 1) + ' \\cdot ' + intDe(otro),
          'Como \\(' + tex(cte, 0) + '\\) no depende de ' + v +
          ', se saca fuera de la integral: ' +
          '\\(\\int c\\,u\\,' + D + ' = c\\cdot\\int u\\,' + D + '\\).', true);
        const i = antiderivar(otro, v, pasos, nivel + 1, estado, prof + 1);
        if (i === null) return null;
        return simplificar(mul(cte, i));
      }
      // Ambos dependen: intento de integración por partes u = v^k
      const k = esPotenciaDeVar(n.a, v) || esPotenciaDeVar(n.b, v);
      if (k >= 1 && prof < 6) {
        const u = esPotenciaDeVar(n.a, v) ? n.a : n.b;
        const w = esPotenciaDeVar(n.a, v) ? n.b : n.a;
        const sub = { pasos: null, estado: estado, prof: prof + 2 };
        const F = antiderivar(w, v, sub.pasos, 0, estado, prof + 2);
        if (F !== null) {
          // ∫u·w = u·F − ∫u'·F  con u = v^k → u' = k·v^(k−1)
          const nueva = simplificar(mul(pot(varDe(v), num(k - 1)), F));
          const resto = antiderivar(nueva, v, null, 0, estado, prof + 2);
          if (resto !== null) {
            const r = simplificar(res(mul(u, F), mul(num(k), resto)));
            push('Regla de integración por partes', intDe(n), aLatex(r),
              'Con \\(u = ' + tex(u, 0) + '\\) y \\(dw = ' + tex(w, 0) + '\\,d' + v +
              '\\): \\(\\int u\\,dw = u\\cdot w - \\int w\\,du\\).', true);
            return r;
          }
        }
        return fallo('la integración por partes de \\(' + tex(n, 0) + '\\) no cerró');
      }
      return fallo('el producto \\(' + tex(n, 0) + '\\)' +
        ' de dos expresiones que dependen de ' + v + ' no tiene primitiva elemental sencilla');
    }

    /* --- Cociente --- */
    if (n.t === 'bin' && n.op === '/') {
      if (!depende(n.a, v)) {
        // ∫ a/(p·v + q) dv = (a/p)·ln|p·v + q|
        const lin = esLineal(n.b, v);
        if (lin && !esNum(lin.p, 0)) {
          const r = simplificar(mul(div(n.a, lin.p), llamada('ln', llamada('abs', n.b))));
          push('Integral logarítmica', intDe(n), aLatex(r),
            'El numerador es constante y el denominador es lineal en ' + v + ': ' +
            '\\(\\int\\frac{c}{a' + v + '+b}\\,' + D + ' = \\frac{c}{a}\\ln\\left|a' + v + '+b\\right|\\).', true);
          return r;
        }
        // Caso 1/(1+v²) → arctan
        const esUnoMasV2 = (m) => m && m.t === 'bin' && m.op === '+' &&
          ((esNum(m.a, 1) && m.b.t === 'bin' && m.b.op === '^' &&
             m.b.a.t === 'var' && m.b.a.name === v && esNum(m.b.b, 2)) ||
           (esNum(m.b, 1) && m.a.t === 'bin' && m.a.op === '^' &&
             m.a.a.t === 'var' && m.a.a.name === v && esNum(m.a.b, 2)));
        if (esUnoMasV2(n.b)) {
          const r = simplificar(mul(n.a, llamada('atan', varDe(v))));
          push('Integral de la función arco tangente', intDe(n), aLatex(r),
            '\\(\\int\\frac{1}{1+' + v + '^2}\\,d' + v + ' = \\arctan ' + v + '\\).', true);
          return r;
        }
        return fallo('no se conoce una primitiva elemental de \\(' + tex(n, 0) + '\\)');
      }
      if (!depende(n.b, v)) {
        push('Constante en el denominador', intDe(n),
          '\\frac{1}{' + tex(n.b, 0) + '}\\cdot ' + intDe(n.a),
          'El denominador no depende de ' + v + ', así que se saca como factor constante.', true);
        const i = antiderivar(n.a, v, pasos, nivel + 1, estado, prof + 1);
        if (i === null) return null;
        return simplificar(div(i, n.b));
      }
      return fallo('la integral de \\(' + tex(n, 0) + '\\) (ambos lados dependen de ' + v + ') ' +
        'requiere un método no soportado');
    }

    /* --- Potencia --- */
    if (n.t === 'bin' && n.op === '^') {
      if (!depende(n.b, v)) {
        const lin = esLineal(n.a, v);
        if (lin && !esNum(lin.p, 0)) {
          if (esNum(n.b, -1)) {
            const r = simplificar(div(llamada('ln', llamada('abs', n.a)), lin.p));
            push('Caso exponente −1 (logaritmo)', intDe(n), aLatex(r),
              '\\(\\int u^{-1}\\,d' + v + ' = \\ln\\left|u\\right|\\).', true);
            return r;
          }
          const nuevoExp = simplificar(sum(n.b, UNO));
          const denom = simplificar(mul(lin.p, nuevoExp));
          if (esNum(denom, 0)) return fallo('el exponente hace que el denominador se anule');
          const r = simplificar(div(pot(n.a, nuevoExp), denom));
          const lineal = esNum(lin.p, 1);
          push(lineal ? 'Regla de la potencia' : 'Regla de la potencia + sustitución',
            intDe(n), aLatex(r),
            (lineal
              ? '\\(\\int u^{' + tex(n.b, 0) + '}\\,d' + v + ' = \\frac{u^{' + tex(nuevoExp, 0) + '}}{' + tex(nuevoExp, 0) + '}\\)'
              : '\\(\\int u^{' + tex(n.b, 0) + '}\\,d' + v + '\\)' +
                ' con \\(u = ' + tex(n.a, 0) + '\\), \\(du = ' + tex(lin.p, 0) + '\\,d' + v +
                '\\): \\(\\frac{1}{' + tex(lin.p, 0) + '}\\cdot\\frac{u^{' + tex(nuevoExp, 0) + '}}{' + tex(nuevoExp, 0) + '}\\)') +
            '.', true);
          return r;
        }
        return fallo('la base \\(' + tex(n.a, 0) + '\\) no es lineal en ' + v);
      }
      if (!depende(n.a, v)) {
        const linE = esLineal(n.b, v);
        if (linE && !esNum(linE.p, 0)) {
          const denom = simplificar(mul(linE.p, llamada('ln', n.a)));
          const r = simplificar(div(n, denom));
          push('Exponencial de base constante', intDe(n), aLatex(r),
            '\\(\\int c^{u}\\,' + D + ' = \\frac{c^{u}}{p\\ln c}\\) con \\(u = ' + tex(n.b, 0) +
            '\\) lineal en ' + v + '.', true);
          return r;
        }
        return fallo('el exponente \\(' + tex(n.b, 0) + '\\) no es lineal en ' + v);
      }
      return fallo('la potencia \\(' + tex(n, 0) + '\\) con base y exponente que dependen de ' + v +
        ' no tiene primitiva elemental sencilla');
    }

    /* --- Funciones elementales (regla de la cadena) --- */
    if (n.t === 'call') {
      const u = n.args[0];
      const lin = esLineal(u, v);
      if (!lin || esNum(lin.p, 0)) {
        return fallo('el argumento de \\(' + n.name + '(' + tex(u, 0) + ')\\) no es lineal en ' + v);
      }
      const p = lin.p;
      let r = null;
      let formula = '';
      switch (n.name) {
        case 'sin':
          r = div(neg(llamada('cos', u)), p);
          formula = '\\int\\sin u\\,du = -\\cos u';
          break;
        case 'cos':
          r = div(llamada('sin', u), p);
          formula = '\\int\\cos u\\,du = \\sin u';
          break;
        case 'tan':
          r = div(neg(llamada('ln', llamada('abs', llamada('cos', u)))), p);
          formula = '\\int\\tan u\\,du = -\\ln\\left|\\cos u\\right|';
          break;
        case 'exp':
          r = div(llamada('exp', u), p);
          formula = '\\int e^{u}\\,du = e^{u}';
          break;
        case 'ln':
          r = div(mul(u, res(llamada('ln', u), UNO)), p);
          formula = '\\int\\ln u\\,du = u\\ln u - u';
          break;
        case 'sqrt':
          r = div(mul(DOS, pot(u, div(TRES, DOS))), mul(TRES, p));
          formula = '\\int\\sqrt{u}\\,du = \\frac{2}{3}u^{3/2}';
          break;
        case 'sinh':
          r = div(llamada('cosh', u), p);
          formula = '\\int\\sinh u\\,du = \\cosh u';
          break;
        case 'cosh':
          r = div(llamada('sinh', u), p);
          formula = '\\int\\cosh u\\,du = \\sinh u';
          break;
        case 'tanh':
          r = div(llamada('ln', llamada('cosh', u)), p);
          formula = '\\int\\tanh u\\,du = \\ln\\cosh u';
          break;
        default:
          return fallo('no se conoce una primitiva elemental de \\(' + n.name + '(' + tex(u, 0) + ')\\)');
      }
      const conCambio = !esNum(p, 1);
      push(conCambio ? 'Sustitución (cambio de variable) + fórmula' : 'Fórmula de integración + regla de la cadena',
        intDe(n), aLatex(r),
        '\\(' + formula + '\\). Con \\(u = ' + tex(u, 0) + '\\)' + (conCambio
          ? ' y \\(du = ' + tex(p, 0) + '\\,d' + v + '\\) (factor \\(\\frac{1}{' + tex(p, 0) + '}\\)).'
          : ' (su derivada vale 1).'), true);
      return r;
    }

    return fallo('expresión no soportada (\\(' + tex(n, 0) + '\\))');
  }

  /* ----------------------------------------------------------
   *  8) Integral definida con sustitución de límites
   * ---------------------------------------------------------- */
  function integralDefinida(n, v, limInf, limSup, pasos, estado) {
    estado = estado || { motivo: '' };
    if (depende(limInf, v) || depende(limSup, v)) {
      return { ok: false, motivo: 'un límite depende de la propia variable de integración ' + v };
    }
    const reglas = [];
    const F = antiderivar(n, v, reglas, 0, estado, 0);
    if (F === null) {
      return { ok: false, motivo: estado.motivo || 'no se encontró primitiva elemental' };
    }
    if (pasos) {
      for (const p of reglas) pasos.push(p);
      pasos.push({
        regla: 'Antiderivada obtenida',
        antes: intTex(n, v),
        despues: aLatex(F),
        nota: 'Se integró respecto a ' + v + ' tratando la otra variable como constante. ' +
              'En una integral definida no se añade la constante +C.'
      });
    }
    const Fa = simplificar(sustituir(F, v, limInf));
    const Fb = simplificar(sustituir(F, v, limSup));
    const dif = simplificar(res(Fb, Fa));
    if (pasos) {
      pasos.push({
        regla: 'Teorema fundamental del cálculo',
        antes: llavesTex(F, v, limInf, limSup),
        despues: aLatex(Fb) + ' - ' + aLatex(Fa),
        nota: 'Se evalúa la antiderivada en el límite superior y se le resta la evaluación en el límite inferior.'
      });
      pasos.push({
        regla: 'Sustitución y simplificación',
        antes: aLatex(Fb) + ' - ' + aLatex(Fa),
        despues: aLatex(dif),
        nota: 'Resultado de la integral en ese nivel.'
      });
    }
    return { ok: true, ast: dif, F: F, Fa: Fa, Fb: Fb, reglas: reglas };
  }

  /* ----------------------------------------------------------
   *  API pública
   * ---------------------------------------------------------- */
  simbolico.aLatex = aLatex;
  simbolico.intTex = intTex;
  simbolico.llavesTex = llavesTex;
  simbolico.fraccion = fraccion;
  simbolico.claver = claver;
  simbolico.simplificar = simplificar;
  simbolico.sustituir = sustituir;
  simbolico.esLineal = esLineal;
  simbolico.antiderivar = antiderivar;
  simbolico.integralDefinida = integralDefinida;

  /** Valor numérico de un AST sin variables (null si no es evaluable). */
  simbolico.valorNumerico = function (n) {
    if (!n || !libre(n)) return null;
    const v = EXP.evaluar(n, 0, 0);
    return Number.isFinite(v) ? v : null;
  };

  /** Descompone una suma en términos con signo (para clasificarlos). */
  simbolico.terminos = function (n) {
    const out = [];
    partirSuma(n, 1, out);
    return out;
  };

  global.CalcMelody = global.CalcMelody || {};
  global.CalcMelody.simbolico = simbolico;
})(window);
