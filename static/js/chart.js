// Виджет карты-квадрата (южно-индийский стиль, как в Джаганнатха Хора).
// Знаки на фиксированных местах; планеты расставляются по своим знакам.
// drawRasiChart(el, data, opts): data.planets = { code: {sign, sign_ru, retrograde, ...} }
(function () {
  // Знак (1–12) -> ячейка [row, col] в сетке 4×4. Центр 2×2 — заголовок.
  var CELL = {
    12: [0, 0], 1: [0, 1], 2: [0, 2], 3: [0, 3],
    4: [1, 3], 5: [2, 3], 6: [3, 3],
    7: [3, 2], 8: [3, 1], 9: [3, 0],
    10: [2, 0], 11: [1, 0],
  };
  var SIGN_ABBR = ['', 'Ов', 'Тл', 'Бл', 'Рк', 'Лв', 'Дв', 'Вс', 'Ск', 'Ст', 'Кз', 'Вд', 'Рб'];
  var N = 400, C = N / 4; // 400×400, ячейка 100

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

  window.drawRasiChart = function (el, data, opts) {
    opts = opts || {};
    var planets = (data && data.planets) || {};
    // собрать метки по знакам
    var bySign = {};
    for (var i = 1; i <= 12; i++) bySign[i] = [];
    Object.keys(planets).forEach(function (code) {
      var p = planets[code];
      bySign[p.sign].push({ text: code, retro: !!p.retrograde });
    });
    if (opts.lagnaSign) bySign[opts.lagnaSign].unshift({ text: 'As', lagna: true });

    var svg = '<svg viewBox="0 0 ' + N + ' ' + N + '" width="100%" xmlns="http://www.w3.org/2000/svg" font-family="Georgia, serif">';
    svg += '<rect x="1" y="1" width="' + (N - 2) + '" height="' + (N - 2) + '" fill="#fff" stroke="#26215C" stroke-width="2"/>';
    // сетка
    for (var k = 1; k < 4; k++) {
      svg += '<line x1="' + (k * C) + '" y1="0" x2="' + (k * C) + '" y2="' + N + '" stroke="#E7E5DC"/>';
      svg += '<line x1="0" y1="' + (k * C) + '" x2="' + N + '" y2="' + (k * C) + '" stroke="#E7E5DC"/>';
    }
    // линии аспектов (граха-дришти) между центрами знаков
    if (opts.aspects && opts.aspects.length) {
      var drawn = {};
      opts.aspects.forEach(function (a) {
        var pf = planets[a.from], pt = planets[a.to];
        if (!pf || !pt) return;
        // взаимные рисуем один раз
        var key = a.mutual ? [a.from, a.to].sort().join('-') : a.from + '>' + a.to;
        if (drawn[key]) return; drawn[key] = 1;
        var cf = CELL[pf.sign], ct = CELL[pt.sign];
        var x1 = ct && cf ? cf[1] * C + C / 2 : null;
        if (cf[0] === ct[0] && cf[1] === ct[1]) return; // один знак
        var color = a.special ? '#B7A6E0' : '#CFCBBE';
        svg += '<line x1="' + (cf[1] * C + C / 2) + '" y1="' + (cf[0] * C + C / 2) +
          '" x2="' + (ct[1] * C + C / 2) + '" y2="' + (ct[0] * C + C / 2) +
          '" stroke="' + color + '" stroke-width="1" opacity="0.5"/>';
      });
    }

    // центр — заголовок
    svg += '<text x="' + (N / 2) + '" y="' + (N / 2 - 8) + '" text-anchor="middle" font-size="20" fill="#26215C">' + esc(opts.title || 'Раси') + '</text>';
    if (opts.subtitle) {
      svg += '<text x="' + (N / 2) + '" y="' + (N / 2 + 16) + '" text-anchor="middle" font-size="12" fill="#888780" font-family="sans-serif">' + esc(opts.subtitle) + '</text>';
    }

    // ячейки знаков
    for (var sign = 1; sign <= 12; sign++) {
      var rc = CELL[sign], x = rc[1] * C, y = rc[0] * C;
      // подпись знака в углу
      svg += '<text x="' + (x + 6) + '" y="' + (y + 15) + '" font-size="11" fill="#B8B6AD" font-family="sans-serif">' + SIGN_ABBR[sign] + '</text>';
      // планеты — центрируем, по 3 в ряд
      var items = bySign[sign];
      if (!items.length) continue;
      var perRow = 3, rows = [];
      for (var r = 0; r < items.length; r += perRow) rows.push(items.slice(r, r + perRow));
      var startY = y + C / 2 - (rows.length - 1) * 9 + 4;
      rows.forEach(function (row, ri) {
        var ty = startY + ri * 18;
        var tspans = row.map(function (it, ci) {
          var color = it.lagna ? '#993C1D' : (it.retro ? '#854F0B' : '#534AB7');
          var weight = it.lagna ? '700' : '600';
          var main = '<tspan fill="' + color + '" font-weight="' + weight + '"> ' + esc(it.text) + '</tspan>';
          var retro = it.retro ? '<tspan font-size="9" baseline-shift="super" fill="#854F0B">℞</tspan>' : '';
          return main + retro;
        }).join('');
        svg += '<text x="' + (x + C / 2) + '" y="' + ty + '" text-anchor="middle" font-size="15" font-family="sans-serif">' + tspans + '</text>';
      });
    }
    svg += '</svg>';
    el.innerHTML = svg;
  };
})();
