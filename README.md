# CalcMelody — Proyecto de Cálculo Multivariable (UDES)

Aplicación web **vanilla JavaScript** para cálculo multivariable: integrales dobles,
derivadas parciales, gráficas 2D/3D con Plotly y una melodía pentatónica generada
desde la geometría de la superficie.

- **Código de la app:** [`CalcMelody/`](CalcMelody/) — ver [`CalcMelody/README.md`](CalcMelody/README.md)
  para la documentación completa (funciones, módulos, pruebas, decisiones tomadas).
- **Pruebas matemáticas:** [`test/pruebas.js`](test/pruebas.js)

## Requisitos

Solo un navegador: la app no necesita build ni dependencias locales.
Las librerías (Plotly.js y KaTeX 0.16.11) se cargan por CDN.

## Ejecutar en local

Abrir `CalcMelody/index.html` directamente en el navegador, o servirlo:

```bash
python -m http.server 8734 --directory CalcMelody
# http://localhost:8734
```

## Ejecutar las pruebas

```bash
node test/pruebas.js
```

Sale con código `0` si todo pasa (135 pruebas matemáticas).

## Estructura

```
├── CalcMelody/          # la aplicación (index.html + css/ + js/)
├── test/pruebas.js      # suite de pruebas en Node
└── .gitignore
```

## Nota para la sustentación

El selector **Operación** nunca modifica el integrando: la integral doble se calcula
siempre sobre la función original `f(x,y)`. Solo afecta al procedimiento de derivación,
a la gráfica, a la tabla y a la melodía. El selector **Orden de integración** (`dy dx` /
`dx dy`) permuta el orden de integración; por el teorema de Fubini el valor es el mismo
(y así lo comprueba la suite de pruebas).

> **Corrección sobre el enunciado:** en el Caso 4 de integrales, el valor esperado
> `1/8` corresponde a otra región; sobre la región pedida el valor correcto es `1/6`
> (verificado simbólicamente y por Simpson 60×60).

---

**Autores:** Keyner Garcia · Mateo Sanguino · Jorge Aguillon · Kenner Rodriguez
— Universidad de Santander (UDES)
