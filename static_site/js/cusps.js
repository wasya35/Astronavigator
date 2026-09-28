/* =============================================================================
 *  cusps.js — куспиды домов Шрипати (Порфирий) + MC. window.LunCusps
 * =============================================================================
 *  Бхава-мадхья (середины домов) — как в J.Hora по умолчанию. Нужны для
 *  Дигбалы, Дрик-балы и Бхава-балы. Всё сидерически (минус айянамша Лахири).
 * ===========================================================================*/
(function () {
  var D2R = Math.PI / 180, R2D = 180 / Math.PI;
  function norm(x) { return ((x % 360) + 360) % 360; }

  // asc/mc (сидерические, °) на момент utcMs при широте lat, долготе lon
  function angles(utcMs, lat, lon) {
    var AE = window.Astronomy, A = window.LunAstro;
    var date = new Date(utcMs);
    var gast = AE.SiderealTime(date);                 // звёздное время Гринвича, ч
    var ramc = norm(gast * 15 + lon);                 // местное звёздное время = RAMC, °
    var jd = utcMs / 86400000 + 2440587.5, T = (jd - 2451545) / 36525;
    var eps = (23.439291 - 0.0130042 * T) * D2R;
    var ay = A.ayanamsha(utcMs);
    var rr = ramc * D2R, phi = lat * D2R;
    // асцендент (тропический)
    var asc = Math.atan2(Math.cos(rr), -(Math.sin(rr) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps)));
    var ascTrop = norm(asc * R2D);
    // MC (тропический): tan λ = tan(RAMC)/cos ε
    var mcTrop = norm(Math.atan2(Math.sin(rr), Math.cos(rr) * Math.cos(eps)) * R2D);
    return { asc: norm(ascTrop - ay), mc: norm(mcTrop - ay), ramc: ramc, eps: eps * R2D, ayan: ay };
  }

  // Порфирий/Шрипати бхава-мадхья: массив 12 (дома 1..12), сидерические °
  function madhyas(asc, mc) {
    var M = new Array(12);
    var ic = norm(mc + 180), desc = norm(asc + 180);
    M[0] = asc; M[9] = mc; M[6] = desc; M[3] = ic;
    function tri(from, to, i1, i2) { var a = norm(to - from), s = a / 3; M[i1] = norm(from + s); M[i2] = norm(from + 2 * s); }
    tri(mc, asc, 10, 11);    // дома 11,12 (между 10-м и 1-м)
    tri(asc, ic, 1, 2);      // дома 2,3
    tri(ic, desc, 4, 5);     // дома 5,6
    tri(desc, mc, 7, 8);     // дома 8,9
    return M;
  }

  function compute(utcMs, lat, lon) {
    var a = angles(utcMs, lat, lon);
    var M = madhyas(a.asc, a.mc);
    return { asc: a.asc, mc: a.mc, madhya: M, ramc: a.ramc, eps: a.eps, ayan: a.ayan };
  }

  window.LunCusps = { compute: compute, angles: angles, madhyas: madhyas };
})();
