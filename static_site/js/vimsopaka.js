/* =============================================================================
 *  vimsopaka.js — Вимшопака-бала по Шодашаварге (16 варг). window.LunVimsopaka
 * =============================================================================
 *  Веса варг из PyJHora (сумма = 20). Достоинство планеты в каждой варге по
 *  композитной дружбе (dignity.js). Итог 0..20: >15 сильно, >10 нормально.
 * ===========================================================================*/
(function () {
  var PL = ['Su', 'Mo', 'Ma', 'Me', 'Ju', 'Ve', 'Sa'];
  // веса Даша-варги (10): фактор варги -> вес (сумма 20). Как берёт владелец в J.Hora.
  var W = { 1: 3, 2: 1.5, 3: 1.5, 7: 1.5, 9: 1.5, 10: 1.5, 12: 1.5, 16: 1.5, 30: 1.5, 60: 5 };
  var VARGAS = [1, 2, 3, 7, 9, 10, 12, 16, 30, 60];

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
