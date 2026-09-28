/* =============================================================================
 *  shadbala.js — Шадбала (шесть сил планет). window.LunShadbala
 * =============================================================================
 *  Константы (найсаргика, экзальтации, требуемые рупы, дигбала, дреккана,
 *  сфута-дришти) выгружены из PyJHora/BPHS. Итог — в вирупах и рупах,
 *  плюс отношение к требуемому минимуму.
 *  ВНИМАНИЕ: Аяна-бала и Чешта-бала — по стандартным/приближённым формулам;
 *  это точки калибровки против J.Hora (см. ТЗ). Остальное — детерминировано.
 * ===========================================================================*/
(function () {
  var PL = ['Su', 'Mo', 'Ma', 'Me', 'Ju', 'Ve', 'Sa'];
  var BODY = { Su: 'Sun', Mo: 'Moon', Ma: 'Mars', Me: 'Mercury', Ju: 'Jupiter', Ve: 'Venus', Sa: 'Saturn' };
  var EXALT = { Su: 10, Mo: 33, Ma: 298, Me: 165, Ju: 95, Ve: 357, Sa: 200 };
  var NAIS = { Su: 60, Mo: 51.43, Ma: 17.14, Me: 25.71, Ju: 34.29, Ve: 42.86, Sa: 8.57 };
  var REQ = { Su: 5, Mo: 6, Ma: 5, Me: 7, Ju: 6.5, Ve: 5.5, Sa: 5 };
  var MT_SIGN = { Su: 4, Mo: 1, Ma: 0, Me: 5, Ju: 8, Ve: 6, Sa: 10 };        // 0-idx
  var DIG_POWERLESS = { Su: 3, Mo: 9, Ma: 3, Me: 6, Ju: 6, Ve: 9, Sa: 0 };   // индекс дома 0..11
  var DREK_PART = { Su: 0, Ma: 0, Ju: 0, Me: 1, Sa: 1, Mo: 2, Ve: 2 };
  var DAY_STRONG = { Su: 1, Ju: 1, Ve: 1 }, NIGHT_STRONG = { Mo: 1, Ma: 1, Sa: 1 };
  var BENEFIC = { Mo: 1, Me: 1, Ju: 1, Ve: 1 }, MALEFIC = { Su: 1, Ma: 1, Sa: 1 };
  var SAPTA = [1, 2, 3, 7, 9, 12, 30];
  var GRADE_VIRUPA = [null, 22.5, 15, 7.5, 3.75, 1.875];   // индекс композита 1..5
  var WEEKDAY_LORD = ['Su', 'Mo', 'Ma', 'Me', 'Ju', 'Ve', 'Sa'];          // 0=Вс
  var CHALDEAN = ['Sa', 'Ju', 'Ma', 'Su', 'Ve', 'Me', 'Mo'];
  var MEAN_SPEED = { Ma: 0.524, Me: 1.2, Ju: 0.083, Ve: 1.15, Sa: 0.0335 };

  var D2R = Math.PI / 180;
  function norm(x) { return ((x % 360) + 360) % 360; }
  function fold180(x) { x = Math.abs(norm(x)); return x > 180 ? 360 - x : x; }
  function sign0(lon) { return Math.floor(norm(lon) / 30); }
  function degIn(lon) { return norm(lon) % 30; }

  // ── основной расчёт ───────────────────────────────────────────────────────
  // birth: {utcMs, lat, lon, localHour}
  function compute(ctx) {
    var A = window.LunAstro, AE = window.Astronomy, Vg = window.LunVarga, Dg = window.LunDignity, Cu = window.LunCusps;
    if (!A || !Vg || !Dg || !Cu) return { error: 'Не загружены зависимости (astro/varga/dignity/cusps)' };
    var ts = ctx.utcMs, lat = ctx.lat, lon = ctx.lon;
    var L = {}; PL.forEach(function (p) { L[p] = A.sidLonOf(BODY[p], ts, 'geo'); });
    var sunL = L.Su, moonL = L.Mo;
    var cusps = Cu.compute(ts, lat, lon);
    var lagnaSign = sign0(cusps.asc);
    var d1 = {}; PL.forEach(function (p) { d1[p] = sign0(L[p]) + 1; });     // 1..12
    var comp = Dg.compositeMatrix(d1);

    function houseOf(p) { return ((sign0(L[p]) - lagnaSign + 12) % 12) + 1; }

    // === STHANA BALA ===
    function uchcha(p) { return fold180(L[p] - norm(EXALT[p] + 180)) / 3; }
    function saptavargaja(p) {
      var s = 0;
      SAPTA.forEach(function (N) {
        var vs = Vg.varga(L[p], N) - 1;                 // 0..11
        if (vs === MT_SIGN[p]) s += 45;
        else if (Dg.LORD[vs] === p) s += 30;
        else s += GRADE_VIRUPA[comp[p][Dg.LORD[vs]]];
      });
      return s;
    }
    function ojayugma(p) {
      var v = 0;
      [sign0(L[p]) + 1, Vg.varga(L[p], 9)].forEach(function (sn) {          // D1 и D9 (1..12)
        var even = sn % 2 === 0;
        if (p === 'Mo' || p === 'Ve') { if (even) v += 15; } else { if (!even) v += 15; }
      });
      return v;
    }
    function kendra(p) { var h = houseOf(p); if ([1, 4, 7, 10].indexOf(h) >= 0) return 60; if ([2, 5, 8, 11].indexOf(h) >= 0) return 30; return 15; }
    function drekkana(p) { return Math.floor(degIn(L[p]) / 10) === DREK_PART[p] ? 15 : 0; }

    // === DIG BALA ===
    function dig(p) { return fold180(L[p] - cusps.madhya[DIG_POWERLESS[p]]) / 3; }

    // === KALA BALA ===
    function nathonnatha(p) {
      var dfn = Math.abs((ctx.localHour == null ? 12 : ctx.localHour) - 12);
      var dayB = (12 - dfn) / 12 * 60;
      if (p === 'Me') return 60;
      return DAY_STRONG[p] ? dayB : (60 - dayB);
    }
    function paksha(p) {
      var pb = fold180(moonL - sunL) / 3;               // 0..60 (полнолуние=60)
      var v = BENEFIC[p] ? pb : (60 - pb);
      if (p === 'Mo') v *= 2;
      return v;
    }
    // склонение планеты (кранти), градусы
    function declination(p) {
      try {
        var eq = AE.Equator(AE.Body[BODY[p]], new Date(ts), new AE.Observer(lat, lon, 0), true, true);
        return eq.dec;
      } catch (e) { return 0; }
    }
    // базовая аяна (0..60, без удвоения Солнца)
    function ayanaRaw(p) {
      var d = declination(p), val;
      if (p === 'Mo' || p === 'Sa') val = (24 - d) / 48 * 60;      // южные
      else if (p === 'Me') val = (24 + Math.abs(d)) / 48 * 60;     // всегда
      else val = (24 + d) / 48 * 60;                                // северные (Су,Ма,Юп,Ве)
      return Math.max(0, Math.min(60, val));
    }
    var moonPakshaBase = fold180(moonL - sunL) / 3;      // пакша Луны без удвоения (для чешты)

    // восход/закат текущих суток (для трибхаги, вара, хора)
    var rise = null, set = null, nextRise = null, kalaOk = false;
    try {
      var obs = new AE.Observer(lat, lon, 0);
      var r = AE.SearchRiseSet(AE.Body.Sun, obs, +1, new Date(ts - 30 * 3600 * 1000), 3), guard = 0;
      while (r && r.date.getTime() <= ts && guard++ < 5) {
        var rn = AE.SearchRiseSet(AE.Body.Sun, obs, +1, new Date(r.date.getTime() + 60000), 2);
        if (rn && rn.date.getTime() <= ts) { rise = r; r = rn; } else { rise = r; break; }
      }
      if (rise) {
        set = AE.SearchRiseSet(AE.Body.Sun, obs, -1, rise.date, 2);
        nextRise = AE.SearchRiseSet(AE.Body.Sun, obs, +1, new Date(rise.date.getTime() + 60000), 2);
        kalaOk = !!(set && nextRise);
      }
    } catch (e) { kalaOk = false; }

    var riseMs = rise && rise.date.getTime(), setMs = set && set.date.getTime(), nextMs = nextRise && nextRise.date.getTime();
    var isDay = kalaOk && ts >= riseMs && ts < setMs;

    // вара-правитель (с поправкой на восход)
    var varaLord = null, tzOff = (ctx.tzOffMin || 0) * 60000;
    if (kalaOk) {
      // ведический день начинается на восходе; берём ЛОКАЛЬНУЮ дату этого восхода
      varaLord = WEEKDAY_LORD[new Date(riseMs + tzOff).getUTCDay()];
    }
    function vara(p) { return (kalaOk && p === varaLord) ? 45 : 0; }

    // хора-правитель
    var horaLord = null;
    if (kalaOk) {
      var ahoratra = nextMs - riseMs;
      var hn = Math.floor((ts - riseMs) / (ahoratra / 24));
      hn = ((hn % 24) + 24) % 24;
      var ci = CHALDEAN.indexOf(varaLord);
      horaLord = CHALDEAN[((ci + hn) % 7 + 7) % 7];
    }
    function hora(p) { return (kalaOk && p === horaLord) ? 60 : 0; }

    // трибхага
    var tribhagaLord = null;
    if (kalaOk) {
      if (isDay) { var k = Math.floor((ts - riseMs) / ((setMs - riseMs) / 3)); tribhagaLord = ['Me', 'Su', 'Sa'][Math.min(2, k)]; }
      else { var base = ts >= setMs ? setMs : setMs - 86400000; var k2 = Math.floor((ts - base) / ((nextMs - setMs) / 3)); tribhagaLord = ['Mo', 'Ve', 'Ma'][Math.min(2, Math.max(0, k2))]; }
    }
    function tribhaga(p) { if (p === 'Ju') return 60; return (kalaOk && p === tribhagaLord) ? 60 : 0; }

    // маса/абда — правитель дня санкранти (вход Солнца в знак / в Овен)
    function sunSidLon(t) { return A.sidLonOf('Sun', t, 'geo'); }
    function ingressWeekdayLord(targetLon, backDays) {
      // последний переход Солнца через targetLon (° сидер.) до ts
      var lo = ts - backDays * 86400000, hi = ts;
      function diff(t) { var d = norm(sunSidLon(t) - targetLon); return d > 180 ? d - 360 : d; } // около 0 у перехода
      if (diff(lo) > 0) lo = ts - (backDays + 40) * 86400000;         // страховка
      for (var i = 0; i < 60; i++) { var mid = (lo + hi) / 2; if (diff(mid) <= 0) lo = mid; else hi = mid; }
      return WEEKDAY_LORD[new Date(lo + tzOff).getUTCDay()];
    }
    var masaLord = null, abdaLord = null;
    try { masaLord = ingressWeekdayLord(sign0(sunL) * 30, 40); } catch (e) {}
    try { abdaLord = ingressWeekdayLord(0, 380); } catch (e) {}
    function masa(p) { return p === masaLord ? 30 : 0; }
    function abda(p) { return p === abdaLord ? 15 : 0; }

    // === CHESHTA BALA (приближение — точка калибровки) ===
    function speed(p) { var dt = 0.25 * 86400000; var d = A.sidLonOf(BODY[p], ts + dt, 'geo') - A.sidLonOf(BODY[p], ts - dt, 'geo'); if (d > 180) d -= 360; else if (d < -180) d += 360; return d / 0.5; }
    function cheshta(p, ayanaVal, pakshaVal) {
      if (p === 'Su') return ayanaVal;
      if (p === 'Mo') return pakshaVal;
      var s = speed(p);
      if (s < 0) return 60;                              // ретроградность — максимум активности
      var ms = MEAN_SPEED[p] || 1;
      return Math.max(0, Math.min(60, 60 * (ms - s) / ms / 2 + 30));
    }

    // === DRIK BALA ===
    function drishti(a) {                                 // a = долгота_видимого − долгота_смотрящего (0..360)
      a = norm(a);
      if (a < 30) return 0;
      if (a < 60) return 0.5 * (a - 30);
      if (a < 90) return (a - 60) + 15;
      if (a < 120) return 0.5 * (120 - a) + 30;
      if (a < 150) return 150 - a;
      if (a < 180) return 2 * (a - 150);
      if (a < 300) return 0.5 * (300 - a);
      return 0;
    }
    function special(from, dist) {                       // спец-аспекты → полная дришти 60
      var d = norm(dist);
      if (from === 'Ma' && ((d >= 90 && d < 120) || (d >= 210 && d < 240))) return 60;
      if (from === 'Ju' && ((d >= 120 && d < 150) || (d >= 240 && d < 270))) return 60;
      if (from === 'Sa' && ((d >= 60 && d < 90) || (d >= 270 && d < 300))) return 60;
      return null;
    }
    function drik(p) {
      var sum = 0;
      PL.forEach(function (q) {
        if (q === p) return;
        var dist = norm(L[p] - L[q]);                    // смотрит q на p
        var v = special(q, dist); if (v == null) v = drishti(dist);
        if (BENEFIC[q]) sum += v; else sum -= v;
      });
      return sum / 4;
    }

    // === сборка ===
    var res = {};
    PL.forEach(function (p) {
      var uc = uchcha(p), sv = saptavargaja(p), oj = ojayugma(p), ke = kendra(p), dk = drekkana(p);
      var st = uc + sv + oj + ke + dk;
      var dg = dig(p);
      var ayB = ayanaRaw(p);
      var ay = (p === 'Su') ? ayB * 2 : ayB;             // Солнце: аяна ×2 (в Кала)
      var pk = paksha(p), nn = nathonnatha(p), tb = tribhaga(p), vr = vara(p), hr = hora(p), ms = masa(p), ab = abda(p);
      var ka = nn + pk + tb + vr + hr + ms + ab + ay;
      var ch = cheshta(p, ayB, moonPakshaBase);          // Солнце→база аяны, Луна→база пакши
      var dr = drik(p);
      var na = NAIS[p];
      var total = st + dg + ka + ch + dr + na;
      res[p] = {
        sthana: r2(st), dig: r2(dg), kala: r2(ka), cheshta: r2(ch), drik: r2(dr), naisargika: na,
        total_virupa: r2(total), rupa: r2(total / 60), required: REQ[p], ratio: r2((total / 60) / REQ[p]),
        parts: { uchcha: r2(uc), saptavargaja: r2(sv), oja: r2(oj), kendra: r2(ke), drekkana: r2(dk),
          natonnata: r2(nn), paksha: r2(pk), tribhaga: r2(tb), vara: r2(vr), hora: r2(hr), masa: r2(ms), abda: r2(ab), ayana: r2(ay) },
      };
    });
    return { planets: res, order: PL, kalaComplete: kalaOk, lagnaSign: lagnaSign + 1,
      note: 'Аяна и Чешта — приближённые, калибруются против J.Hora' };
  }
  function r2(x) { return Math.round(x * 100) / 100; }

  window.LunShadbala = { compute: compute, REQ: REQ, NAIS: NAIS };
})();
