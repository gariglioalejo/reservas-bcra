#!/usr/bin/env python3
"""Descarga el último tramo de la serie de Reservas Internacionales del BCRA
(idVariable = 1) y guarda un snapshot en data.json. Se usa como respaldo
cuando el navegador no puede llegar a api.bcra.gob.ar (por ejemplo, sin red).

API oficial: https://api.bcra.gob.ar/estadisticas/v4.0/monetarias/1
"""
import json
import os
import ssl
import sys
import datetime as dt
import urllib.request

API = "https://api.bcra.gob.ar/estadisticas/v4.0/monetarias/1"
LIMIT = 30
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data.json")


def main() -> int:
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE  # el API del BCRA usa un certificado que no valida en algunos entornos

    url = f"{API}?limit={LIMIT}"
    req = urllib.request.Request(url, headers={"User-Agent": "reservas-bcra/1.0", "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=45, context=ctx) as resp:
        payload = json.loads(resp.read().decode("utf-8"))

    if not payload.get("results"):
        print("Respuesta inesperada del API:", json.dumps(payload)[:300], file=sys.stderr)
        return 1

    payload["generatedAt"] = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")
    payload["source"] = url
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False, indent=2)
        fh.write("\n")

    latest = payload["results"][0]["detalle"][0]
    print(f"OK  {latest['fecha']}  {latest['valor']:.0f} millones de USD  ->  {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
