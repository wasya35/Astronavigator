/* =============================================================================
 *  jyotish.js — джйотиш-слой поверх astro.js (window.LunAstro) и astronomy-engine.
 *  Всё считается В БРАУЗЕРЕ: позиции (сидерика/Лахири), накшатры, Навамша D9,
 *  Вимшоттари-даша, граха-дришти, титхи/фаза Луны, лагна (асцендент).
 *  Локальное время рождения -> UTC через Intl (историческая tz-база браузера).
 * ===========================================================================*/
(function () {
  var A = window.LunAstro, AE = window.Astronomy, C = window.CONTENT || {};
  var D2R = Math.PI / 180, R2D = 180 / Math.PI;

  var SIGNS = ['Овен', 'Телец', 'Близнецы', 'Рак', 'Лев', 'Дева',
    'Весы', 'Скорпион', 'Стрелец', 'Козерог', 'Водолей', 'Рыбы'];
  var NAK = ['Ашвини', 'Бхарани', 'Криттика', 'Рохини', 'Мригашира', 'Ардра',
    'Пунарвасу', 'Пушья', 'Ашлеша', 'Магха', 'Пурва Пхалгуни', 'Уттара Пхалгуни',
    'Хаста', 'Читра', 'Свати', 'Вишакха', 'Анурадха', 'Джйештха',
    'Мула', 'Пурвашадха', 'Уттарашадха', 'Шравана', 'Дхаништха', 'Шатабхиша',
    'Пурва Бхадрапада', 'Уттара Бхадрапада', 'Ревати'];
  var RU = { Su: 'Солнце', Mo: 'Луна', Ma: 'Марс', Me: 'Меркурий', Ju: 'Юпитер',
    Ve: 'Венера', Sa: 'Сатурн', Ra: 'Раху', Ke: 'Кету' };
  var BODY = { Su: 'Sun', Mo: 'Moon', Ma: 'Mars', Me: 'Mercury', Ju: 'Jupiter',
    Ve: 'Venus', Sa: 'Saturn', Ra: 'NNode', Ke: 'SNode' };
  var ORDER = ['Su', 'Mo', 'Ma', 'Me', 'Ju', 'Ve', 'Sa', 'Ra', 'Ke'];

  // Навамша D9: стартовый знак по стихии + отдел
  var NAV_START = { 1: 1, 5: 1, 9: 1, 2: 10, 6: 10, 10: 10, 3: 7, 7: 7, 11: 7, 4: 4, 8: 4, 12: 4 };
  function navSign(sign, deg) {
    var part = Math.floor(deg / (30 / 9));
    return ((NAV_START[sign] - 1 + part) % 12) + 1;
  }
  function norm(x) { return ((x % 360) + 360) % 360; }

  // положение планеты (сидерически) на ts: знак, градус, накшатра, ретро, Навамша
  function posOf(code, ts) {
    var b = BODY[code];
    var lon = A.sidLonOf(b, ts, 'geo');
    var dt = 0.25 * 86400000;
    var d = A.sidLonOf(b, ts + dt, 'geo') - A.sidLonOf(b, ts - dt, 'geo');
    if (d > 180) d -= 360; else if (d < -180) d += 360;
    var sign = Math.floor(lon / 30) + 1, degree = lon % 30;
    var nakIdx = Math.floor(lon / (360 / 27));
    var nav = navSign(sign, degree);
    return {
      code: code, name_ru: RU[code], longitude: lon,
      sign: sign, sign_ru: SIGNS[sign - 1], degree: Math.round(degree * 100) / 100,
      nakshatra: nakIdx + 1, nakshatra_ru: NAK[nakIdx],
      pada: Math.floor((lon % (360 / 27)) / (360 / 27 / 4)) + 1,
      retrograde: (d < 0 && code !== 'Ra' && code !== 'Ke'),
      nav_sign: nav, nav_sign_ru: SIGNS[nav - 1],
    };
  }
  function allPlanets(ts) { var o = {}; ORDER.forEach(function (c) { o[c] = posOf(c, ts); }); return o; }

  // ── Луна: титхи, пакша, фаза ──────────────────────────────────────────────
  function moonSummary(p) {
    var elong = norm(p.Mo.longitude - p.Su.longitude);
    var tithi = Math.floor(elong / 12) + 1, waxing = elong < 180;
    var illum = Math.round((1 - Math.cos(elong * D2R)) / 2 * 100);
    var m = p.Mo;
    return {
      sign_ru: m.sign_ru, degree: m.degree, nakshatra: m.nakshatra,
      nakshatra_ru: m.nakshatra_ru, pada: m.pada, tithi: tithi,
      paksha: waxing ? 'Шукла · растущая' : 'Кришна · убывающая',
      phase_label: waxing ? 'Растущая Луна' : 'Убывающая Луна', illumination: illum,
    };
  }

  // ── Граха-дришти (аспекты по знакам) ──────────────────────────────────────
  function aspectDistances(code, rules) {
    var d = {};
    if (rules.seventh_all !== false) d[7] = 1;
    ((rules.special || {})[code] || []).forEach(function (x) { d[x] = 1; });
    ((rules.nodes_special || {})[code] || []).forEach(function (x) { d[x] = 1; });
    return d;
  }
  function drishti(planets) {
    var rules = C.aspectRules || {};
    var codes = ORDER.filter(function (c) { return planets[c]; });
    var directed = [];
    codes.forEach(function (a) {
      var sa = planets[a].sign, dists = aspectDistances(a, rules);
      codes.forEach(function (b) {
        if (a === b) return;
        var dist = ((planets[b].sign - sa) % 12 + 12) % 12 + 1;
        if (dist === 1) return;
        if (dists[dist]) directed.push({ from: a, to: b, distance: dist, special: dist !== 7 });
      });
    });
    var pairset = {}; directed.forEach(function (x) { pairset[x.from + '>' + x.to] = 1; });
    var at = C.aspectsText || {}, byp = at.by_planet || {};
    directed.forEach(function (x) {
      x.mutual = !!pairset[x.to + '>' + x.from];
      x.from_ru = RU[x.from]; x.to_ru = RU[x.to];
      x.note = x.distance === 7 ? (at.seventh || '') : (byp[x.from] || '');
    });
    var conj = [];
    if (rules.show_conjunction !== false) {
      for (var i = 0; i < codes.length; i++) for (var j = i + 1; j < codes.length; j++) {
        if (planets[codes[i]].sign === planets[codes[j]].sign)
          conj.push({ a: codes[i], b: codes[j], a_ru: RU[codes[i]], b_ru: RU[codes[j]],
            sign_ru: planets[codes[i]].sign_ru, note: at.conjunction || '' });
      }
    }
    return { aspects: directed, conjunctions: conj };
  }

  // ── Небо на момент (страница 1) ───────────────────────────────────────────
  function sky(tsMs) {
    var planets = allPlanets(tsMs);
    var moon = moonSummary(planets);
    var nak = (C.nakshatra || {})[moon.nakshatra] || {};
    ['fon', 'amplifies', 'distorts', 'tuning'].forEach(function (k) { moon[k] = nak[k] || ''; });
    moon.good = nak.good || []; moon.avoid = nak.avoid || [];
    return { datetime_utc: new Date(tsMs).toISOString(), planets: planets, moon: moon, drishti: drishti(planets) };
  }

  // ── Вимшоттари-даша ───────────────────────────────────────────────────────
  var DORDER = ['Ke', 'Ve', 'Su', 'Mo', 'Ma', 'Ra', 'Ju', 'Sa', 'Me'];
  var DYEARS = { Ke: 7, Ve: 20, Su: 6, Mo: 10, Ma: 7, Ra: 18, Ju: 16, Sa: 19, Me: 17 };
  var NAK_SPAN = 360 / 27, DPY = 365.25;
  function fmtMY(ms) { var d = new Date(ms); return ('0' + (d.getUTCMonth() + 1)).slice(-2) + '.' + d.getUTCFullYear(); }
  function subPeriods(startMs, spanYears, lordCode, now) {
    var idx = DORDER.indexOf(lordCode), out = [], cur = startMs;
    for (var i = 0; i < 9; i++) {
      var p = DORDER[(idx + i) % 9];
      var yrs = (DYEARS[p] / 120) * spanYears;
      var end = cur + yrs * DPY * 86400000;
      out.push({ code: p, ruler_ru: RU[p], start: fmtMY(cur), end: fmtMY(end),
        years: Math.round(yrs * 100) / 100, is_current: (cur <= now && now <= end), _start: cur, _span: yrs });
      cur = end;
    }
    return out;
  }
  function vimshottari(moonLon, birthMs) {
    var now = Date.now();
    var nakNum = Math.floor(moonLon / NAK_SPAN), lordIdx = nakNum % 9, lord = DORDER[lordIdx];
    var elapsed = moonLon - nakNum * NAK_SPAN, frac = elapsed / NAK_SPAN;
    var remaining = DYEARS[lord] * (1 - frac);
    var maha = [], cur = birthMs;
    for (var i = 0; i < 9; i++) {
      var p = DORDER[(lordIdx + i) % 9], yrs = i === 0 ? remaining : DYEARS[p];
      var end = cur + yrs * DPY * 86400000;
      maha.push({ code: p, ruler_ru: RU[p], start: fmtMY(cur), end: fmtMY(end),
        years: Math.round(yrs * 100) / 100, is_current: (cur <= now && now <= end), _start: cur, _span: yrs });
      cur = end;
    }
    var cm = maha.find(function (d) { return d.is_current; }) || maha[maha.length - 1];
    var antar = subPeriods(cm._start, DYEARS[cm.code], cm.code, now);
    var ca = antar.find(function (d) { return d.is_current; }) || antar[antar.length - 1];
    var prat = subPeriods(ca._start, ca._span, ca.code, now);
    return { mahadashas: maha, current_maha: cm, antardashas: antar, current_antara: ca, pratyantardashas: prat };
  }

  // ── Лагна (асцендент) ─────────────────────────────────────────────────────
  function ayan(ts) { return A.ayanamsha(ts); }
  function lagna(birthMs, lat, lon) {
    var date = new Date(birthMs);
    var gast = AE.SiderealTime(date);            // Гринвич, звёздные часы 0..24
    var lst = norm(gast * 15 + lon);             // местное звёздное время, °
    var jd = birthMs / 86400000 + 2440587.5, T = (jd - 2451545) / 36525;
    var eps = (23.439291 - 0.0130042 * T) * D2R;
    var ramc = lst * D2R, phi = lat * D2R;
    var asc = Math.atan2(Math.cos(ramc), -(Math.sin(ramc) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps)));
    var tropAsc = norm(asc * R2D);
    var sid = norm(tropAsc - ayan(birthMs));
    var sign = Math.floor(sid / 30) + 1, degree = sid % 30, nakIdx = Math.floor(sid / (360 / 27));
    var nav = navSign(sign, degree);
    return { sign: sign, sign_ru: SIGNS[sign - 1], degree: Math.round(degree * 100) / 100,
      nakshatra_ru: NAK[nakIdx], nav_sign_ru: SIGNS[nav - 1] };
  }

  // ── Локальное время рождения -> UTC (историческая tz-база браузера) ───────
  function tzOffsetMin(utcDate, tz) {
    var dtf = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    var p = {}; dtf.formatToParts(utcDate).forEach(function (x) { p[x.type] = x.value; });
    var asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
    return (asUTC - utcDate.getTime()) / 60000;
  }
  function localToUtc(y, mo, d, h, mi, tz) {
    var guess = Date.UTC(y, mo - 1, d, h, mi);
    var off = tzOffsetMin(new Date(guess), tz);
    var utc = guess - off * 60000;
    var off2 = tzOffsetMin(new Date(utc), tz);
    if (off2 !== off) utc = guess - off2 * 60000;
    return utc;
  }

  // ── Натал (страница «Моя карта») ──────────────────────────────────────────
  function parseBirth(birth) {
    var s = (birth.date || '').replace(/\//g, '.').split('.').map(Number); // ДД ММ ГГГГ
    var t = (birth.time || '12:00').split(':').map(Number);
    return { y: s[2], mo: s[1], d: s[0], h: birth.time_unknown ? 12 : (t[0] || 0), mi: birth.time_unknown ? 0 : (t[1] || 0) };
  }
  function natal(birth) {
    var city = window.CITIES.find(birth.place);
    if (!city) return { error: 'Город не найден: «' + birth.place + '». Выберите из списка (начните вводить).' };
    var b = parseBirth(birth);
    if (!b.y || !b.mo || !b.d) return { error: 'Дата в формате ДД.ММ.ГГГГ' };
    var utcMs = localToUtc(b.y, b.mo, b.d, b.h, b.mi, city.tz);
    var planets = allPlanets(utcMs);
    var lg = lagna(utcMs, city.lat, city.lon);
    // дома whole-sign от лагны
    ORDER.forEach(function (c) { planets[c].house = ((planets[c].sign - lg.sign) % 12 + 12) % 12 + 1; });
    var dd = vimshottari(planets.Mo.longitude, utcMs);
    var mt = C.mahadasha || {}, ant = C.antardasha || {};
    var rk = { Ke: 'ketu', Ve: 'venus', Su: 'sun', Mo: 'moon', Ma: 'mars', Ra: 'rahu', Ju: 'jupiter', Sa: 'saturn', Me: 'mercury' };
    var cm = dd.current_maha, ca = dd.current_antara;
    return {
      profile: { name: birth.name || 'Гость', residence: birth.residence || city.name },
      birth: { local: birth.date + ' ' + (birth.time_unknown ? '(время неизв.)' : birth.time) + ' · ' + city.tz, city: city.name, lat: city.lat, lon: city.lon },
      lagna: lg, planets: planets,
      cascade: {
        mahadasha: { ruler_ru: cm.ruler_ru, ends: cm.end, background: (mt[rk[cm.code]] || {}).short || '' },
        antardasha: { ruler_ru: ca.ruler_ru, ends: ca.end, background: (ant[rk[ca.code]] || {}).short || '' },
      },
      _utcMs: utcMs,
    };
  }
  function periods(birth) {
    var city = window.CITIES.find(birth.place);
    if (!city) return { error: 'Город не найден: «' + birth.place + '».' };
    var b = parseBirth(birth);
    var utcMs = localToUtc(b.y, b.mo, b.d, b.h, b.mi, city.tz);
    var moonLon = A.sidLonOf('Moon', utcMs, 'geo');
    var dd = vimshottari(moonLon, utcMs);
    var mt = C.mahadasha || {}, ant = C.antardasha || {};
    var rk = { Ke: 'ketu', Ve: 'venus', Su: 'sun', Mo: 'moon', Ma: 'mars', Ra: 'rahu', Ju: 'jupiter', Sa: 'saturn', Me: 'mercury' };
    function tag(list, tpl) { list.forEach(function (p) { p.background = (tpl[rk[p.code]] || {}).short || ''; }); }
    tag(dd.mahadashas, mt); tag(dd.antardashas, ant); tag(dd.pratyantardashas, ant);
    dd.current_maha.advice = (mt[rk[dd.current_maha.code]] || {}).full || '';
    dd.current_antara.advice = (ant[rk[dd.current_antara.code]] || {}).full || '';
    dd.profile = { residence: birth.residence || city.name };
    dd.birth = { local: birth.date + ' · ' + city.name, city: city.name };
    return dd;
  }

  window.Jyotish = { sky: sky, natal: natal, periods: periods, SIGNS: SIGNS, NAK: NAK, localToUtc: localToUtc, lagna: lagna, vimshottari: vimshottari };
})();
