/* =============================================================================
 *  vimsopaka.js — Вимшопака-бала по Шодашаварге (16 варг). window.LunVimsopaka
 * =============================================================================
 *  Веса варг из PyJHora (сумма = 20). Достоинство планеты в каждой варге по
 *  композитной дружбе (dignity.js). Итог 0..20: >15 сильно, >10 нормально.
 * ===========================================================================*/
(function () {
  var PL = ['Su', 'Mo', 'Ma', 'Me', 'Ju', 'Ve', 'Sa'];
  // веса Шодашаварги: фактор варги -> вес (сумма 20)
  var W = { 1: 3.5, 2: 1, 3: 1, 4: 0.5, 7: 0.5, 9: 3, 10: 0.5, 12: 0.5, 16: 2, 20: 0.5, 24: 0.5, 27: 0.5, 30: 1, 40: 0.5, 45: 0.5, 60: 4 };
  var VARGAS = [1, 2, 3, 4, 7, 9, 10, 12, 16, 20, 24, 27, 30, 40, 45, 60];

  // lons: { Su:lon, ..., Sa:lon } сидерические долготы 7 планет
  function compute(lons) {
    var Vg = window.LunVarga, Dg = window.LunDignity;
    if (!Vg || !Dg) return { error: 'Модули varga/dignity не загружены' };
    var signs = {}; PL.forEach(function (p) { signs[p] = Math.floor((((lons[p] % 360) + 360) % 360) / 30) + 1; }); // 1..12
    var comp = Dg.compositeMatrix(signs);
    var out = {}, detail = {};
    PL.forEach(function (p) {
      var sum = 0, rows = {};
      VARGAS.forEach(function (N) {
        var sign0 = Vg.varga(lons[p], N) - 1;            // 0..11
        var val = Dg.dignityValue(p, sign0, comp);       // 5..20
        rows[N] = { sign0: sign0, value: val };
        sum += val * W[N];
      });
      out[p] = Math.round((sum / 20) * 100) / 100;       // 0..20
      detail[p] = rows;
    });
    return { score: out, detail: detail, vargas: VARGAS, weights: W };
  }

  window.LunVimsopaka = { compute: compute, VARGAS: VARGAS, W: W };
})();
