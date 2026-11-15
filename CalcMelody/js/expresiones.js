/**
 * ============================================================
 *  CalcMelody · expresiones.js
 *  Analizador de expresiones para la FUNCIÓN PERSONALIZADA.
 *
 *  Evita eval() por seguridad: convierte el texto en un árbol
 *  sintáctico (AST) y luego:
 *    - evaluar(ast, x, y)        → número
 *    - derivar(ast, 'x' | 'y')   → derivada parcial SÍMBOlica
 *    - aTexto(ast)               → expresión legible para mostrar
 *
 *  Sintaxis admitida:
 *    números: 2, 3.14, 1e-3
 *    variables: x, y          constantes: pi (π), e
 *    operadores: + − * / ^ (también ** , × , ÷)
 *    funciones: sin cos tan asin acos atan sinh cosh tanh
 *               sqrt (o √) cbrt abs exp ln log sign
 *    implícito: 2x = 2*x,  xy = x*y, 2(x+1) = 2*(x+1)
 * ============================================================
 */
(function (global) {
  'use strict';

  const expresiones = {};

  /* ----------------------------------------------------------
   *  Catálogos
   * ---------------------------------------------------------- */
  const FUNCIONES = [
    'sin', 'cos', 'tan', 'asin', 'acos', 'atan',
    'sinh', 'cosh', 'tanh',
    'sqrt', 'cbrt', 'abs', 'exp', 'ln', 'log', 'sign'
  ];
  const SET_FUNCIONES = new Set(FUNCIONES);
  const CONSTANTES = { pi: 'pi', e: 'e' };
  const ARIDAD = { // nº de argumentos de cada función
    sin: 1, cos: 1, tan: 1, asin: 1, acos: 1, atan: 1,
    sinh: 1, cosh: 1, tanh: 1, sqrt: 1, cbrt: 1, abs: 1,
    exp: 1, ln: 1, log: 1, sign: 1
  };

  /* ----------------------------------------------------------
   *  1) TOKENIZADOR
   * ---------------------------------------------------------- */
  function tokenizar(cadena) {
    // Normalizamos símbolos tipográficos frecuentes
    let s = cadena
      .replace(/−/g, '-')   // menos tipográfico
      .replace(/[×∙·]/g, '*')
      .replace(/[÷]/g, '/')
      .replace(/π/g, 'pi')
      .replace(/√/g, ' sqrt ')  // √x → sqrt x (prefijo)
      // Superíndices: x² → x^2,  y³ → y^3  (también ⁰¹²³⁴⁵⁶⁷⁸⁹)
      .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, (m) => '^' + m.split('').map(
        (c) => '⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(c)
      ).join('^'));

    const tokens = [];
    let i = 0;
    const push = (t, v) => tokens.push({ t: t, v: v, pos: i });

    while (i < s.length) {
      const c = s[i];

      if (c === ' ' || c === '\t' || c === '\n') { i++; continue; }

      // Números (con punto decimal y notación exponencial)
      if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(s[i + 1] || ''))) {
        const m = s.slice(i).match(/^\d*\.?\d+(?:[eE][+-]?\d+)?/);
        if (!m) throw new Error('Número mal escrito cerca de "' + s.slice(i, i + 8) + '".');
        push('num', Number(m[0]));
        i += m[0].length;
        continue;
      }

      // Identificadores (variables, constantes, funciones)
      if (/[A-Za-z_]/.test(c)) {
        const m = s.slice(i).match(/^[A-Za-z_][A-Za-z0-9_]*/);
        push('id', m[0].toLowerCase());
        i += m[0].length;
        continue;
      }

      // Operadores y paréntesis
      if (c === '*' && s[i + 1] === '*') { push('op', '^'); i += 2; continue; }
      if ('+-*/^(),'.indexOf(c) !== -1) {
        if (c === ',') push('coma', ',');
        else if (c === '(') push('abrir', '(');
        else if (c === ')') push('cerrar', ')');
        else push('op', c);
        i++;
        continue;
      }

      throw new Error('Carácter no permitido "' + c + '" en la posición ' + (i + 1) + '.');
    }
    return tokens;
  }

  /* ----------------------------------------------------------
   *  2) PARSER (descenso recursivo) → AST
   * ---------------------------------------------------------- */
  function parsear(cadena) {
    if (!cadena || !cadena.trim()) {
      throw new Error('Escribe una función, por ejemplo: x^2 + y^2');
    }
    const tokens = tokenizar(cadena);
    if (!tokens.length) throw new Error('La expresión está vacía.');
    let i = 0;

    const peek = () => tokens[i];
    const next = () => tokens[i++];

    // expr  := term (('+' | '-') term)*
    function parseExpr() {
      let nodo = parseTerm();
      while (peek() && peek().t === 'op' && (peek().v === '+' || peek().v === '-')) {
        const op = next().v;
        nodo = { t: 'bin', op: op, a: nodo, b: parseTerm() };
      }
      return nodo;
    }

    // term  := unary (('*' | '/')? unary | implícita)*
    function parseTerm() {
      let nodo = parseUnary();
      while (peek()) {
        const tk = peek();
        if (tk.t === 'op' && (tk.v === '*' || tk.v === '/')) {
          next();
          nodo = { t: 'bin', op: tk.v, a: nodo, b: parseUnary() };
        } else if (tk.t === 'num' || tk.t === 'id' || tk.t === 'abrir') {
          // Multiplicación implícita: 2x, xy, 2(x+1), sin(x)cos(y)
          nodo = { t: 'bin', op: '*', a: nodo, b: parseUnary() };
        } else {
          break;
        }
      }
      return nodo;
    }

    // unary := ('-' | '+') unary | '√' unary | power
    function parseUnary() {
      const tk = peek();
      if (tk && tk.t === 'op' && tk.v === '-') { next(); return { t: 'neg', a: parseUnary() }; }
      if (tk && tk.t === 'op' && tk.v === '+') { next(); return parseUnary(); }
      if (tk && tk.t === 'id' && tk.v === 'sqrt') {
        next();
        const arg = peek() && peek().t === 'abrir' ? parsePostfix() : parseUnary();
        return { t: 'call', name: 'sqrt', args: [arg] };
      }
      return parsePower();
    }

    // power := postfix ('^' unary)?   (asociativa a la derecha: 2^3^2 = 2^(3^2))
    function parsePower() {
      const base = parsePostfix();
      if (peek() && peek().t === 'op' && peek().v === '^') {
        next();
        return { t: 'bin', op: '^', a: base, b: parseUnary() };
      }
      return base;
    }

    // postfix := primary (con llamadas a funciones)
    function parsePostfix() {
      return parsePrimary();
    }

    function parsePrimary() {
      const tk = next();
      if (!tk) throw new Error('La expresión está incompleta: falta un valor después de operar.');

      if (tk.t === 'num') return { t: 'num', v: tk.v };

      if (tk.t === 'abrir') {
        const n = parseExpr();
        const c = next();
        if (!c || c.t !== 'cerrar') throw new Error('Falta cerrar un paréntesis "(" sin ")" que lo acompañe.');
        return n;
      }

      if (tk.t === 'id') {
        const nombre = tk.v;

        if (CONSTANTES[nombre]) return { t: 'const', v: nombre };
        if (nombre === 'x' || nombre === 'y') return { t: 'var', name: nombre };

        if (SET_FUNCIONES.has(nombre)) {
          if (peek() && peek().t === 'abrir') {
            next(); // consume '('
            const args = [parseExpr()];
            while (peek() && peek().t === 'coma') { next(); args.push(parseExpr()); }
            const c = next();
            if (!c || c.t !== 'cerrar') {
              throw new Error('Falta cerrar el paréntesis de la función "' + nombre + '".');
            }
            if (args.length !== ARIDAD[nombre]) {
              throw new Error('La función "' + nombre + '" recibe ' + ARIDAD[nombre] + ' argumento(s).');
            }
            return { t: 'call', name: nombre, args: args };
          }
          // Uso como prefijo sin paréntesis: sqrt x, ln x, sin x
          return { t: 'call', name: nombre, args: [parseUnary()] };
        }

        // "xy", "yx", "xxy" … → producto de variables (comodín frecuente)
        if (/^[xy]+$/.test(nombre)) {
          let nodo = { t: 'var', name: nombre[0] };
          for (let k = 1; k < nombre.length; k++) {
            nodo = { t: 'bin', op: '*', a: nodo, b: { t: 'var', name: nombre[k] } };
          }
          return nodo;
        }

        throw new Error(
          'No reconozco "' + nombre + '". Usa las variables x e y, las constantes pi y e, ' +
          'o funciones como sin, cos, tan, sqrt, exp, ln, log y abs.'
        );
      }

      if (tk.t === 'cerrar') throw new Error('Sobran paréntesis: hay un ")" sin su "(".');
      throw new Error('No esperaba "' + (tk.v !== undefined ? tk.v : '?') + '" en la posición ' + (tk.pos + 1) + '.');
    }

    const ast = parseExpr();
    if (i < tokens.length) {
      const tk = tokens[i];
      throw new Error('Sobra el símbolo "' + (tk.v !== undefined ? tk.v : '?') + '" en la posición ' + (tk.pos + 1) + '.');
    }
    return ast;
  }

  /* ----------------------------------------------------------
   *  3) EVALUADOR numérico
   * ---------------------------------------------------------- */
  function evaluar(nodo, x, y) {
    if (!nodo) return NaN;
    switch (nodo.t) {
      case 'num':
        return nodo.v;
      case 'const':
        return nodo.v === 'pi' ? Math.PI : Math.E;
      case 'var':
        return nodo.name === 'x' ? x : y;
      case 'neg':
        return -evaluar(nodo.a, x, y);
      case 'bin': {
        const a = evaluar(nodo.a, x, y);
        const b = evaluar(nodo.b, x, y);
        switch (nodo.op) {
          case '+': return a + b;
          case '-': return a - b;
          case '*': return a * b;
          case '/': return a / b;
          case '^': return Math.pow(a, b);
        }
        return NaN;
      }
      case 'call': {
        const u = evaluar(nodo.args[0], x, y);
        switch (nodo.name) {
          case 'sin': return Math.sin(u);
          case 'cos': return Math.cos(u);
          case 'tan': return Math.tan(u);
          case 'asin': return Math.asin(u);
          case 'acos': return Math.acos(u);
          case 'atan': return Math.atan(u);
          case 'sinh': return Math.sinh(u);
          case 'cosh': return Math.cosh(u);
          case 'tanh': return Math.tanh(u);
          case 'sqrt': return Math.sqrt(u);
          case 'cbrt': return Math.cbrt(u);
          case 'abs': return Math.abs(u);
          case 'exp': return Math.exp(u);
          case 'ln': return Math.log(u);
          case 'log': return Math.log10(u);   // log base 10
          case 'sign': return Math.sign(u);
        }
        return NaN;
      }
    }
    return NaN;
  }

  /* ----------------------------------------------------------
   *  4) DERIVADA parcial SIMBÓLICA (reglas de cálculo)
   * ---------------------------------------------------------- */
  function depende(nodo, v) {
    if (!nodo) return false;
    switch (nodo.t) {
      case 'num': case 'const': return false;
      case 'var': return nodo.name === v;
      case 'neg': return depende(nodo.a, v);
      case 'bin': return depende(nodo.a, v) || depende(nodo.b, v);
      case 'call': return nodo.args.some((a) => depende(a, v));
    }
    return false;
  }

  /** Derivada de la función externa, en términos de u y u' (regla de la cadena). */
  function derivadaFuncion(nombre, u) {
    const uno = { t: 'num', v: 1 };
    const dos = { t: 'num', v: 2 };
    const cuadrado = (n) => ({ t: 'bin', op: '^', a: n, b: dos });
    const div = (a, b) => ({ t: 'bin', op: '/', a: a, b: b });
    const menos = (n) => ({ t: 'neg', a: n });

    switch (nombre) {
      case 'sin': return { t: 'call', name: 'cos', args: [u] };
      case 'cos': return menos({ t: 'call', name: 'sin', args: [u] });
      case 'tan': return div(uno, cuadrado({ t: 'call', name: 'cos', args: [u] }));
      case 'asin':
        return div(uno, { t: 'call', name: 'sqrt', args: [{ t: 'bin', op: '-', a: uno, b: cuadrado(u) }] });
      case 'acos':
        return menos(div(uno, { t: 'call', name: 'sqrt', args: [{ t: 'bin', op: '-', a: uno, b: cuadrado(u) }] }));
      case 'atan': return div(uno, { t: 'bin', op: '+', a: uno, b: cuadrado(u) });
      case 'sinh': return { t: 'call', name: 'cosh', args: [u] };
      case 'cosh': return { t: 'call', name: 'sinh', args: [u] };
      case 'tanh': return div(uno, cuadrado({ t: 'call', name: 'cosh', args: [u] }));
      case 'sqrt': return div(uno, { t: 'bin', op: '*', a: dos, b: { t: 'call', name: 'sqrt', args: [u] } });
      case 'cbrt':
        return div(uno, { t: 'bin', op: '*', a: { t: 'num', v: 3 }, b: { t: 'bin', op: '^', a: u, b: { t: 'num', v: 2 / 3 } } });
      case 'abs': return div(u, { t: 'call', name: 'abs', args: [u] }); // u/|u| (signo)
      case 'exp': return { t: 'call', name: 'exp', args: [u] };
      case 'ln': return div(uno, u);
      case 'log': // d/dx log10(u) = 1 / (u · ln 10)
        return div(uno, { t: 'bin', op: '*', a: u, b: { t: 'num', v: Math.LN10 } });
      case 'sign': return { t: 'num', v: 0 };
    }
    throw new Error('No sé derivar la función "' + nombre + '".');
  }

  /**
   * Derivada parcial de `nodo` respecto a la variable `v` ('x' o 'y').
   * Aplica: suma, producto, cociente, potencia y regla de la cadena.
   */
  function derivar(nodo, v) {
    if (!nodo) return { t: 'num', v: 0 };
    switch (nodo.t) {
      case 'num':
      case 'const':
        return { t: 'num', v: 0 };

      case 'var':
        return { t: 'num', v: nodo.name === v ? 1 : 0 };

      case 'neg':
        return { t: 'neg', a: derivar(nodo.a, v) };

      case 'bin': {
        const a = nodo.a;
        const b = nodo.b;
        const da = derivar(a, v);
        const db = derivar(b, v);

        if (nodo.op === '+') return { t: 'bin', op: '+', a: da, b: db };
        if (nodo.op === '-') return { t: 'bin', op: '-', a: da, b: db };

        if (nodo.op === '*') {
          // (a·b)' = a'·b + a·b'
          return {
            t: 'bin', op: '+',
            a: { t: 'bin', op: '*', a: da, b: b },
            b: { t: 'bin', op: '*', a: a, b: db }
          };
        }

        if (nodo.op === '/') {
          // (a/b)' = (a'·b − a·b') / b²
          return {
            t: 'bin', op: '/',
            a: { t: 'bin', op: '-', a: { t: 'bin', op: '*', a: da, b: b }, b: { t: 'bin', op: '*', a: a, b: db } },
            b: { t: 'bin', op: '^', a: b, b: { t: 'num', v: 2 } }
          };
        }

        if (nodo.op === '^') {
          const bLibre = depende(b, v); // ¿el exponente depende de la variable?
          if (!bLibre) {
            // a^n → n · a^(n−1) · a'
            return {
              t: 'bin', op: '*',
              a: { t: 'bin', op: '*', a: b, b: { t: 'bin', op: '^', a: a, b: { t: 'bin', op: '-', a: b, b: { t: 'num', v: 1 } } } },
              b: da
            };
          }
          if (!depende(a, v)) {
            // c^u → c^u · ln(c) · u'
            return {
              t: 'bin', op: '*',
              a: { t: 'bin', op: '*', a: { t: 'bin', op: '^', a: a, b: b }, b: { t: 'call', name: 'ln', args: [a] } },
              b: db
            };
          }
          // Caso general a^b → a^b · (b'·ln a + b·a'/a)
          const parte1 = { t: 'bin', op: '*', a: db, b: { t: 'call', name: 'ln', args: [a] } };
          const parte2 = { t: 'bin', op: '/', a: { t: 'bin', op: '*', a: b, b: da }, b: a };
          return {
            t: 'bin', op: '*',
            a: { t: 'bin', op: '^', a: a, b: b },
            b: { t: 'bin', op: '+', a: parte1, b: parte2 }
          };
        }
        break;
      }

      case 'call': {
        // Regla de la cadena: f(u)' = f'(u) · u'
        const u = nodo.args[0];
        const du = derivar(u, v);
        return { t: 'bin', op: '*', a: derivadaFuncion(nodo.name, u), b: du };
      }
    }
    throw new Error('No se pudo derivar la expresión.');
  }

  /* ----------------------------------------------------------
   *  5) SIMPLIFICADOR ligero (pliega constantes y limpia términos)
   * ---------------------------------------------------------- */
  const esNum = (n, v) => n && n.t === 'num' && (v === undefined || n.v === v);

  /** Extrae el factor numérico inicial de un nodo: 2·u → {2, u}. */
  function extraerFactor(nodo) {
    if (nodo.t === 'num') return { num: nodo, resto: { t: 'num', v: 1 } };
    if (nodo.t === 'bin' && nodo.op === '*' && esNum(nodo.a)) return { num: nodo.a, resto: nodo.b };
    return { num: { t: 'num', v: 1 }, resto: nodo };
  }

  /** Reconstituye num · resto sin dejar factores redundantes. */
  function construirFactor(num, resto) {
    if (resto.t === 'num') return { t: 'num', v: num * resto.v };
    if (num === 1) return resto;
    return { t: 'bin', op: '*', a: { t: 'num', v: num }, b: resto };
  }

  /** Máximo común divisor entero (algoritmo de Euclides). */
  function mcdEnteros(a, b) {
    while (b) {
      const t = a % b;
      a = b;
      b = t;
    }
    return a || 1;
  }

  function simplificar(nodo) {
    if (!nodo) return nodo;

    if (nodo.t === 'bin') {
      const a = simplificar(nodo.a);
      const b = simplificar(nodo.b);
      const n = { t: 'bin', op: nodo.op, a: a, b: b };

      // Pliegue de constantes: 2+3 → 5
      if (esNum(a) && esNum(b)) {
        const val = evaluar(n, 0, 0);
        if (Number.isFinite(val)) return { t: 'num', v: val };
      }
      if (nodo.op === '+') { if (esNum(a, 0)) return b; if (esNum(b, 0)) return a; }
      if (nodo.op === '-') { if (esNum(b, 0)) return a; if (esNum(a, 0)) return { t: 'neg', a: b }; }

      if (nodo.op === '*') {
        if (esNum(a, 0) || esNum(b, 0)) return { t: 'num', v: 0 };
        // (n/d) · u  →  (n·u) / d        (útil en regla de la cadena)
        if (a.t === 'bin' && a.op === '/') {
          return simplificar({ t: 'bin', op: '/', a: { t: 'bin', op: '*', a: a.a, b: b }, b: a.b });
        }
        if (b.t === 'bin' && b.op === '/') {
          return simplificar({ t: 'bin', op: '/', a: { t: 'bin', op: '*', a: a, b: b.a }, b: b.b });
        }
        // (−p)·q → −(p·q)  y  p·(−q) → −(p·q)
        if (a.t === 'neg') return simplificar({ t: 'neg', a: { t: 'bin', op: '*', a: a.a, b: b } });
        if (b.t === 'neg') return simplificar({ t: 'neg', a: { t: 'bin', op: '*', a: a, b: b.a } });
        // Aplanar y juntar factores numéricos: 2·2·x → 4·x
        const factores = [];
        const aplana = (f) => {
          if (f.t === 'bin' && f.op === '*') { aplana(f.a); aplana(f.b); }
          else factores.push(f);
        };
        aplana(n);
        const nums = factores.filter((f) => esNum(f));
        if (nums.length > 1) {
          const c = nums.reduce((acc, f) => acc * f.v, 1);
          const resto = factores.filter((f) => !esNum(f));
          if (!Number.isFinite(c)) return n;
          if (c === 0) return { t: 'num', v: 0 };
          if (!resto.length) return { t: 'num', v: c };
          if (c === 1 && resto.length === 1) return resto[0];
          return simplificar(
            resto.reduce((acc, f) => ({ t: 'bin', op: '*', a: acc, b: f }), { t: 'num', v: c })
          );
        }
        if (esNum(a, 1)) return b;
        if (esNum(b, 1)) return a;
        return n;
      }

      if (nodo.op === '/') {
        if (esNum(b, 1)) return a;
        if (esNum(a, 0)) return { t: 'num', v: 0 };
        // Cancelar factores numéricos enteros: (2·x)/(2·√…) → x/√…
        const fa = extraerFactor(a);
        const fb = extraerFactor(b);
        const ambosEnteros =
          Number.isInteger(fa.num.v) && Number.isInteger(fb.num.v) &&
          fa.num.v !== 0 && fb.num.v !== 0;
        if (ambosEnteros) {
          const mcd = mcdEnteros(Math.abs(fa.num.v), Math.abs(fb.num.v));
          if (mcd > 1) {
            return simplificar({
              t: 'bin', op: '/',
              a: construirFactor(fa.num.v / mcd, fa.resto),
              b: construirFactor(fb.num.v / mcd, fb.resto)
            });
          }
        }
        return n;
      }

      if (nodo.op === '^') {
        if (esNum(b, 0)) return { t: 'num', v: 1 };
        if (esNum(b, 1)) return a;
        if (esNum(a, 1)) return { t: 'num', v: 1 };
      }
      return n;
    }

    if (nodo.t === 'neg') {
      const a = simplificar(nodo.a);
      if (esNum(a)) return { t: 'num', v: -a.v };
      if (a.t === 'neg') return a; // −(−u) = u
      return { t: 'neg', a: a };
    }

    if (nodo.t === 'call') {
      const args = nodo.args.map(simplificar);
      if (nodo.name === 'abs' && esNum(args[0])) return { t: 'num', v: Math.abs(args[0].v) };
      if (nodo.name === 'sqrt' && esNum(args[0])) {
        const v = Math.sqrt(args[0].v);
        if (Number.isFinite(v)) return { t: 'num', v: v };
      }
      if (nodo.name === 'exp' && esNum(args[0], 0)) return { t: 'num', v: 1 };
      if (nodo.name === 'ln' && esNum(args[0], 1)) return { t: 'num', v: 0 };
      if (nodo.name === 'ln' && args[0].t === 'const' && args[0].v === 'e') return { t: 'num', v: 1 };
      return { t: 'call', name: nodo.name, args: args };
    }

    return nodo;
  }

  /* ----------------------------------------------------------
   *  6) IMPRESORA: AST → texto legible con paréntesis mínimos
   * ---------------------------------------------------------- */
  function fmtNum(v) {
    if (!Number.isFinite(v)) return String(v);
    if (Number.isInteger(v)) return String(v);
    // ¿Es una fracción exacta? (2/3, 1/8, 4/15 …)
    const f = fraccionSencilla(v);
    if (f) return (f.n < 0 ? '-' + Math.abs(f.n) : f.n) + '/' + f.d;
    const abs = Math.abs(v);
    if (abs < 1e-4 || abs >= 1e6) return v.toExponential(2);
    return String(Number(v.toFixed(4)));
  }

  /** Devolutivo de fracciones con denominador pequeño (hasta 16). */
  function fraccionSencilla(v) {
    if (!Number.isFinite(v) || Number.isInteger(v) || Math.abs(v) >= 1e8) return null;
    let h1 = 1, h2 = 0, k1 = 0, k2 = 1, b = v;
    for (let i = 0; i < 32; i++) {
      const a = Math.floor(b);
      const h = a * h1 + h2;
      const k = a * k1 + k2;
      h2 = h1; h1 = h; k2 = k1; k1 = k;
      if (k1 > 16) return null;
      if (k1 !== 0 && Math.abs(v - h1 / k1) <= 1e-10 * Math.max(1, Math.abs(v))) {
        return { n: h1, d: k1 };
      }
      const dif = b - a;
      if (Math.abs(dif) < 1e-13) break;
      b = 1 / dif;
    }
    return null;
  }

  function aTexto(nodo, precPadre) {
    precPadre = precPadre || 0;
    if (!nodo) return '';
    switch (nodo.t) {
      case 'num': {
        const t = fmtNum(nodo.v);
        // "x^1/2" sería ambiguo: se parentiza el exponente fraccionario
        return (precPadre > 2 && t.indexOf('/') !== -1) ? '(' + t + ')' : t;
      }
      case 'const': return nodo.v === 'pi' ? 'π' : 'e';
      case 'var': return nodo.name;
      case 'call':
        return nodo.name + '(' + nodo.args.map((a) => aTexto(a, 0)).join(', ') + ')';
      case 'neg': {
        // Sólo hacen falta paréntesis si el interior es suma o resta
        const p =
          nodo.a.t === 'bin' && (nodo.a.op === '+' || nodo.a.op === '-') ? 4 : 0;
        const s = '−' + aTexto(nodo.a, p);
        return precPadre > 4 ? '(' + s + ')' : s;
      }
      case 'bin': {
        const op = nodo.op;
        const prec = (op === '+' || op === '-') ? 1 : (op === '*' || op === '/') ? 2 : 3;
        // Lado izquierdo / derecho con paréntesis sólo cuando hace falta
        const precIzq = (op === '^') ? 5 : prec;
        const precDer = (op === '-' || op === '/') ? prec + 1 : (op === '^' ? 3 : prec);
        const izq = aTexto(nodo.a, precIzq);
        const der = aTexto(nodo.b, precDer);
        // '·' para producto y espacios en suma/resta (más legible)
        const opTxt = op === '*' ? '·' : (op === '+' || op === '-') ? ' ' + op + ' ' : op;
        const s = izq + opTxt + der;
        return precPadre > prec ? '(' + s + ')' : s;
      }
    }
    return '?';
  }

  /* ----------------------------------------------------------
   *  API pública
   * ---------------------------------------------------------- */
  expresiones.FUNCIONES = FUNCIONES;
  expresiones.parsear = parsear;
  expresiones.evaluar = evaluar;
  expresiones.derivar = derivar;
  expresiones.simplificar = simplificar;
  expresiones.aTexto = aTexto;
  expresiones.depende = depende;
  /** Derivada de la función externa F en términos de u (regla de la cadena). */
  expresiones.derivadaFuncion = derivadaFuncion;

  /** Devuelve "∂f/∂x = <expr>" listo para mostrar (con simplificación). */
  expresiones.derivadaTexto = function (ast, variable) {
    const d = simplificar(derivar(ast, variable));
    return (variable === 'x' ? '∂f/∂x = ' : '∂f/∂y = ') + aTexto(d);
  };

  /** Traduce el AST a una función evaluadora (x, y) => número. */
  expresiones.aFuncion = function (ast) {
    return function (x, y) {
      const v = evaluar(ast, x, y);
      return Number.isFinite(v) ? v : (v === undefined ? NaN : v);
    };
  };

  global.CalcMelody = global.CalcMelody || {};
  global.CalcMelody.expresiones = expresiones;
})(window);
