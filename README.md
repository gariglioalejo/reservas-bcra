# Reservas BCRA

Sitio estático que muestra, en tiempo real, las **Reservas Internacionales del Banco Central de la República Argentina** consultando la **API oficial del BCRA (v4.0)** directamente desde el navegador.

![Estado](https://img.shields.io/badge/API-bcra.gob.ar%2Festadisticas%2Fv4.0-3f7bff)

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
index.html                     # estructura y textos
styles.css                     # estilos (tema oscuro, responsive)
app.js                         # consulta a la API, gráficos SVG y tabla
data.json                      # snapshot de respaldo (si la API no responde)
scripts/update_data.py         # regenera data.json desde la API
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

## Descargo de responsabilidad

Sitio informativo **no oficial**. Los datos provienen del servicio de datos abiertos del BCRA y pueden tener demoras o modificaciones sin previo aviso. No constituye asesoramiento financiero.
