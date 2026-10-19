# Reservas BCRA

Sitio estático que muestra, en tiempo real, las **Reservas Internacionales del Banco Central de la República Argentina** consultando la **API oficial del BCRA (v4.0)** directamente desde el navegador.

**Sitio publicado:** https://gariglioalejo.github.io/reservas-bcra/ · **Repositorio:** https://github.com/gariglioalejo/reservas-bcra

> Este sitio solicita a los buscadores que **no lo indexen** (`robots.txt` + meta `noindex`), porque no es un sitio oficial.

## Qué muestra

- **Valor actual** de las reservas internacionales (en millones de USD) y su equivalente en miles de millones.
- **Variación diaria** y **variación de los últimos 30 registros** (absoluta y porcentual).
- **Gráfico** de evolución y **gráfico compacto** de tendencia reciente.
- **Tabla** con los últimos 10 registros y su variación día a día.
- Actualización automática cada 60 segundos, botón de refresco manual y **selector de idioma ES / EN**.

## Fuente de datos

| Dato | Detalle |
| --- | --- |
| Serie | `idVariable = 1` → *Reservas internacionales* |
| Endpoint | `GET https://api.bcra.gob.ar/estadisticas/v4.0/monetarias/1?limit=30` |
| Unidad | Millones de USD |
| CORS | `Access-Control-Allow-Origin: *` (permite consumo directo desde el navegador) |

> Nota: las versiones **v2** y **v3** del API del BCRA devuelven `410 Gone` ("método deprecado"). Este sitio usa **v4.0**.

Como la API habilita CORS, el sitio es 100 % estático: no necesita backend ni funciones serverless.

## Estructura

```
index.html                     # estructura y textos (incluye meta noindex)
styles.css                     # estilos (tema oscuro, responsive)
app.js                         # consulta a la API, gráficos SVG y tabla
data.json                      # snapshot de respaldo (si la API no responde)
robots.txt                     # pide a los buscadores que no indexen el sitio
scripts/update_data.py         # regenera data.json desde la API
scripts/deploy_github.py       # publica en GitHub vía API REST (sin git/gh)
.github/workflows/update-data.yml  # snapshot automático dos veces por día
.nojekyll                      # evita el procesado Jekyll en GitHub Pages
```

## Desarrollo local

```bash
python3 -m http.server 8080
# abrir http://localhost:8080
```

Para actualizar el snapshot de respaldo:

```bash
python3 scripts/update_data.py
```

## Publicación

El sitio se publica con **GitHub Pages** desde la rama `main` (raíz del repositorio). Cualquier push a `main` actualiza el sitio automáticamente.

Para volver a desplegar sin `git` instalado:

```bash
GITHUB_TOKEN=<token> python3 scripts/deploy_github.py reservas-bcra
```

## No indexación

El sitio **no debe aparecer en buscadores**. Se aplican dos capas:

1. `robots.txt` con `Disallow: /` para todos los agentes (Googlebot, Bingbot, etc.).
2. `<meta name="robots" content="noindex, nofollow, noarchive, nosnippet, noimageindex">` (y equivalentes para `googlebot` y `bingbot`) en `index.html`.

Como es un *project site* (`usuario.github.io/repo/`), el `robots.txt` no está en la raíz del dominio, así que la metaetiqueta `noindex` es el mecanismo efectivo; el `robots.txt` queda como refuerzo y cobra plena vigencia si se usa un dominio propio.

## Descargo de responsabilidad

Sitio informativo **no oficial**. Los datos provienen del servicio de datos abiertos del BCRA y pueden tener demoras o modificaciones sin previo aviso. No constituye asesoramiento financiero.
