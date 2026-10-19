/* Reservas BCRA — datos en vivo desde la API oficial del BCRA (v4.0)
 * Endpoint: GET https://api.bcra.gob.ar/estadisticas/v4.0/monetarias/1
 * idVariable 1 = "Reservas internacionales" (en millones de USD)
 * La API envía "Access-Control-Allow-Origin: *", por lo que el navegador
 * puede consultarla directamente sin backend.
 */
(function () {
  "use strict";

  var API_URL = "https://api.bcra.gob.ar/estadisticas/v4.0/monetarias/1";
  var POINTS = 30;            // cantidad de registros a mostrar
  var REFRESH_MS = 60000;     // auto-refresco
  var FALLBACK = "data.json"; // snapshot local por si la API no responde

  var I18N = {
    es: {
      pageTitle: "Reservas Internacionales",
      pageSubtitle: "Banco Central de la República Argentina",
      connecting: "Conectando…",
      live: "Datos en vivo",
      cached: "Datos en caché",
      error: "Sin conexión",
      reservesLabel: "Reservas Internacionales del BCRA",
      unitMillions: "millones",
      noData: "Sin datos",
      prevValue: "Valor anterior",
      change30: "Variación (30 días)",
      windowRange: "Rango del período",
      last30: "Últimos 30 registros",
      updated: "Última consulta",
      autoRefresh: "Se actualiza cada 60 s",
      chartTitle: "Evolución de las reservas",
      chartCaptionDefault: "Últimos 30 registros",
      recentTitle: "Últimos registros",
      refreshNow: "Actualizar ahora",
      colDate: "Fecha",
      colValue: "Reservas (millones de USD)",
      colChange: "Variación diaria",
      source: "Fuente oficial:",
      disclaimer: "Sitio informativo no oficial. Los valores se obtienen directamente del servicio de datos abiertos del BCRA y pueden tener demoras o cambios sin aviso.",
      lastValueOn: "Último valor informado el {date}",
      approx: "≈ US$ {v} mil millones",
      vsPrev: "{sign} {v} vs. registro anterior",
      over30: "{sign} {v} en 30 días ({pct})",
      range: "Mín {min} · Máx {max}",
      chartCaption: "{from} → {to}",
      loading: "Consultando la API del BCRA…"
    },
    en: {
      pageTitle: "International Reserves",
      pageSubtitle: "Central Bank of Argentina",
      connecting: "Connecting…",
      live: "Live data",
      cached: "Cached data",
      error: "Offline",
      reservesLabel: "BCRA International Reserves",
      unitMillions: "million",
      noData: "No data",
      prevValue: "Previous value",
      change30: "Change (30 days)",
      windowRange: "Range for the period",
      last30: "Last 30 records",
      updated: "Last checked",
      autoRefresh: "Refreshes every 60 s",
      chartTitle: "Reserves over time",
      chartCaptionDefault: "Last 30 records",
      recentTitle: "Latest records",
      refreshNow: "Refresh now",
      colDate: "Date",
      colValue: "Reserves (USD million)",
      colChange: "Daily change",
      source: "Official source:",
      disclaimer: "Unofficial informational site. Values come directly from BCRA's open data service and may be delayed or change without notice.",
      lastValueOn: "Latest value reported on {date}",
      approx: "≈ US$ {v} billion",
      vsPrev: "{sign} {v} vs. previous record",
      over30: "{sign} {v} over 30 days ({pct})",
      range: "Min {min} · Max {max}",
      chartCaption: "{from} → {to}",
      loading: "Querying the BCRA API…"
    }
  };

  var lang = (navigator.language || "es").toLowerCase().indexOf("en") === 0 ? "en" : "es";
  var state = { points: [], live: false };

  /* ---------------- helpers ---------------- */
  function t(key, vars) {
    var dict = I18N[lang] || I18N.es;
    var out = dict[key] != null ? dict[key] : (I18N.es[key] || key);
    if (vars) {
      Object.keys(vars).forEach(function (k) {
        out = out.replace(new RegExp("\\{" + k + "\\}", "g"), vars[k]);
      });
    }
    return out;
  }

  function num(value, digits) {
    if (value == null || isNaN(value)) return "—";
    return new Intl.NumberFormat(lang === "en" ? "en-US" : "es-AR", {
      minimumFractionDigits: digits == null ? 0 : digits,
      maximumFractionDigits: digits == null ? 0 : digits
    }).format(value);
  }

  function dateLong(iso) {
    var parts = String(iso).split("-");
    if (parts.length !== 3) return iso;
    var d = new Date(Date.UTC(+parts[0], +parts[1] - 1, +parts[2]));
    try {
      return new Intl.DateTimeFormat(lang === "en" ? "en-US" : "es-AR", {
        weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC"
      }).format(d);
    } catch (e) {
      return iso;
    }
  }

  function dateShort(iso) {
    var parts = String(iso).split("-");
    if (parts.length !== 3) return iso;
    return parts[2] + "/" + parts[1] + "/" + parts[0].slice(2);
  }

  function timeNow() {
    try {
      return new Intl.DateTimeFormat(lang === "en" ? "en-US" : "es-AR", {
        hour: "2-digit", minute: "2-digit", second: "2-digit"
      }).format(new Date());
    } catch (e) {
      return new Date().toLocaleTimeString();
    }
  }

  function signed(v, digits) {
    return (v >= 0 ? "+" : "−") + num(Math.abs(v), digits);
  }

  function setStatus(kind, text) {
    var el = document.getElementById("status");
    el.setAttribute("data-state", kind);
    document.getElementById("statusText").textContent = text;
  }

  function applyLang() {
    document.documentElement.lang = lang;
    var nodes = document.querySelectorAll("[data-i18n]");
    for (var i = 0; i < nodes.length; i++) {
      var key = nodes[i].getAttribute("data-i18n");
      var dict = I18N[lang] || I18N.es;
      if (dict[key] != null) nodes[i].textContent = dict[key];
    }
    document.getElementById("langToggle").textContent = lang === "es" ? "EN" : "ES";
    if (state.points.length) render(state.points, state.live);
    else setStatus("loading", t("connecting"));
  }

  /* ---------------- data ---------------- */
  function parsePayload(payload) {
    var results = payload && payload.results;
    if (!results || !results.length) return [];
    var detalle = results[0].detalle || [];
    var points = detalle
      .map(function (d) { return { date: d.fecha, value: Number(d.valor) }; })
      .filter(function (d) { return d.date && isFinite(d.value); });
    points.sort(function (a, b) { return a.date < b.date ? 1 : (a.date > b.date ? -1 : 0); });
    return points.slice(0, POINTS);
  }

  function fetchJson(url) {
    return fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    });
  }

  function load() {
    setStatus("loading", t("connecting"));
    // OJO: la API del BCRA rechaza (400) cualquier parámetro no esperado,
    // así que no se puede usar un cache-buster tipo "?_=123".
    return fetchJson(API_URL + "?limit=" + POINTS)
      .then(function (payload) {
        if (payload && payload.status && payload.status !== 200) throw new Error("API " + payload.status);
        var points = parsePayload(payload);
        if (!points.length) throw new Error("empty payload");
        state.live = true;
        render(points, true);
      })
      .catch(function (err) {
        console.warn("BCRA API no disponible:", err);
        return fetchJson(FALLBACK + "?_=" + Date.now())
          .then(function (payload) {
            var points = parsePayload(payload);
            if (!points.length) throw new Error("empty fallback");
            state.live = false;
            render(points, false);
          })
          .catch(function () {
            setStatus("error", t("error"));
          });
      });
  }

  /* ---------------- render ---------------- */
  function render(points, live) {
    state.points = points;
    state.live = live;
    setStatus(live ? "live" : "cached", live ? t("live") : t("cached"));

    var latest = points[0];
    var prev = points[1];
    var oldest = points[points.length - 1];

    document.getElementById("reservesValue").textContent = num(latest.value, 0);
    document.getElementById("reservesAlt").textContent = t("approx", { v: num(latest.value / 1000, 1) });
    document.getElementById("dateChip").textContent = t("lastValueOn", { date: dateLong(latest.date) });

    // variación diaria
    var deltaChip = document.getElementById("deltaChip");
    if (prev) {
      var diff = latest.value - prev.value;
      deltaChip.hidden = false;
      deltaChip.className = "chip delta " + (diff > 0 ? "up" : diff < 0 ? "down" : "");
      var pct = prev.value ? (diff / prev.value) * 100 : 0;
      deltaChip.textContent = (diff > 0 ? "+" : diff < 0 ? "−" : "") + num(Math.abs(diff), 0) +
        " (" + signed(pct, 2) + "%)";
    } else {
      deltaChip.hidden = true;
    }

    // stats
    var pv = document.getElementById("prevValue");
    pv.textContent = prev ? "US$ " + num(prev.value, 0) : "—";
    document.getElementById("prevDate").textContent = prev ? dateLong(prev.date) : "—";

    var change = oldest && latest ? latest.value - oldest.value : 0;
    var changePct = oldest && oldest.value ? (change / oldest.value) * 100 : 0;
    var c30 = document.getElementById("change30");
    c30.textContent = (change >= 0 ? "US$ +" : "US$ −") + num(Math.abs(change), 0);
    c30.style.color = change > 0 ? "var(--up)" : change < 0 ? "var(--down)" : "";
    document.getElementById("change30Pct").textContent = t("over30", {
      sign: change >= 0 ? "+" : "−",
      v: "US$ " + num(Math.abs(change), 0),
      pct: signed(changePct, 2) + "%"
    });

    var values = points.map(function (p) { return p.value; });
    var min = Math.min.apply(null, values);
    var max = Math.max.apply(null, values);
    document.getElementById("rangeValue").textContent = num(min, 0) + " – " + num(max, 0);
    document.getElementById("rangeLabel").textContent = t("range", {
      min: "US$ " + num(min, 0), max: "US$ " + num(max, 0)
    }) + " · " + t("last30").toLowerCase();

    document.getElementById("updatedAt").textContent = timeNow();
    document.getElementById("chartCaption").textContent = t("chartCaption", {
      from: dateShort(oldest.date), to: dateShort(latest.date)
    });

    drawSpark(points);
    drawChart(points);
    fillTable(points);
  }

  function areaPath(points, w, h, pad) {
    var values = points.map(function (p) { return p.value; });
    var min = Math.min.apply(null, values);
    var max = Math.max.apply(null, values);
    var span = (max - min) || 1;
    var stepX = points.length > 1 ? (w - pad * 2) / (points.length - 1) : 0;
    var y = function (v) { return h - pad - ((v - min) / span) * (h - pad * 2); };
    var line = points.map(function (p, i) {
      return (i === 0 ? "M" : "L") + (pad + i * stepX).toFixed(2) + " " + y(p.value).toFixed(2);
    }).join(" ");
    var area = line + " L" + (pad + (points.length - 1) * stepX).toFixed(2) + " " + (h - pad).toFixed(2) +
               " L" + pad.toFixed(2) + " " + (h - pad).toFixed(2) + " Z";
    return { line: line, area: area, y: y, stepX: stepX, min: min, max: max, pad: pad, w: w, h: h };
  }

  function drawSpark(points) {
    var wrap = document.getElementById("sparkWrap");
    if (points.length < 2) { wrap.innerHTML = ""; return; }
    var w = 420, h = 120, pad = 10;
    var geo = areaPath(points.slice(0, 14).reverse(), w, h, pad);
    var up = points[0].value >= points[1].value;
    var color = up ? "#22d3a6" : "#ff6b81";
    wrap.innerHTML =
      '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" role="img">' +
      '<defs><linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="' + color + '" stop-opacity="0.34"/>' +
      '<stop offset="100%" stop-color="' + color + '" stop-opacity="0"/></linearGradient></defs>' +
      '<path d="' + geo.area + '" fill="url(#sparkFill)"/>' +
      '<path d="' + geo.line + '" fill="none" stroke="' + color + '" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>' +
      '</svg>';
  }

  function drawChart(points) {
    var el = document.getElementById("chart");
    if (points.length < 2) { el.innerHTML = ""; return; }
    var w = 1000, h = 220, pad = 24;
    var chrono = points.slice().reverse();
    var geo = areaPath(chrono, w, h, pad);
    var last = chrono[chrono.length - 1];
    var lastX = pad + (chrono.length - 1) * geo.stepX;
    var lastY = geo.y(last.value);

    var grid = "";
    for (var i = 0; i <= 4; i++) {
      var gy = pad + (i * (h - pad * 2)) / 4;
      grid += '<line x1="' + pad + '" y1="' + gy.toFixed(1) + '" x2="' + (w - pad) + '" y2="' + gy.toFixed(1) +
              '" stroke="rgba(120,145,200,0.14)" stroke-width="1" stroke-dasharray="3 5"/>';
    }

    el.innerHTML =
      '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" role="img" aria-label="' + t("chartTitle") + '">' +
      '<defs><linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#4d8cff" stop-opacity="0.42"/>' +
      '<stop offset="100%" stop-color="#4d8cff" stop-opacity="0.02"/></linearGradient></defs>' +
      grid +
      '<path d="' + geo.area + '" fill="url(#chartFill)"/>' +
      '<path d="' + geo.line + '" fill="none" stroke="#7aa7ff" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>' +
      '<circle cx="' + lastX.toFixed(1) + '" cy="' + lastY.toFixed(1) + '" r="5.5" fill="#0b0f1a" stroke="#22d3a6" stroke-width="3"/>' +
      '</svg>';

    document.getElementById("chartAxis").innerHTML =
      "<span>" + dateShort(chrono[0].date) + "</span>" +
      "<span>US$ " + num(geo.min, 0) + " – " + num(geo.max, 0) + "</span>" +
      "<span>" + dateShort(last.date) + "</span>";
  }

  function fillTable(points) {
    var tbody = document.querySelector("#recentTable tbody");
    var rows = points.slice(0, 10).map(function (p, i) {
      var prev = points[i + 1];
      var diff = prev ? p.value - prev.value : null;
      var cls = diff == null ? "" : diff > 0 ? "up" : diff < 0 ? "down" : "";
      var diffTxt = diff == null ? "—" : (diff > 0 ? "+" : diff < 0 ? "−" : "") + num(Math.abs(diff), 0);
      return "<tr><td>" + dateLong(p.date) + "</td>" +
             '<td class="num">' + num(p.value, 0) + "</td>" +
             '<td class="num ' + cls + '">' + diffTxt + "</td></tr>";
    });
    tbody.innerHTML = rows.join("");
  }

  /* ---------------- wiring ---------------- */
  document.getElementById("langToggle").addEventListener("click", function () {
    lang = lang === "es" ? "en" : "es";
    applyLang();
  });

  document.getElementById("refreshBtn").addEventListener("click", function () {
    load();
  });

  applyLang();
  load();
  setInterval(load, REFRESH_MS);
})();
