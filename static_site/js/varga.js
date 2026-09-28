/* =============================================================================
 *  varga.js — генератор варг (дробных карт) D1..D60. window.LunVarga
 * =============================================================================
 *  Правила — классические Парашари (дефолт Jagannatha Hora). Вход — сидерическая
 *  долгота (0..360). Выход — знак 1..12 в соответствующей варге.
 *  Числовая сверка варг с J.Hora — на этапе Вимшопаки (там они потребляются).
 * ===========================================================================*/
(function () {
  function norm(x) { return ((x % 360) + 360) % 360; }
  // sign0 = 0..11 (0=Овен), deg = градусы в знаке 0..30
  function parts(lon) { lon = norm(lon); var s = Math.floor(lon / 30); return { s: s, d: lon - s * 30 }; }
  var mod12 = function (x) { return ((x % 12) + 12) % 12; };

  // D1 — Раси
  function d1(lon) { return parts(lon).s; }
  // D2 — Хора (Парашари): нечёт: 0-15 Лев, 15-30 Рак; чёт: 0-15 Рак, 15-30 Лев
  function d2(lon) { var p = parts(lon), odd = p.s % 2 === 0; // s=0(Овен) — нечётный знак
    var firstHalf = p.d < 15;
    if (odd) return firstHalf ? 4 : 3; return firstHalf ? 3 : 4; }
  // D3 — Дреккана: 0-10 сам, 10-20 5-й, 20-30 9-й
  function d3(lon) { var p = parts(lon), k = Math.floor(p.d / 10); return mod12(p.s + k * 4); }
  // D4 — Чатуртхамша: четверти → сам,4-й,7-й,10-й
  function d4(lon) { var p = parts(lon), k = Math.floor(p.d / 7.5); return mod12(p.s + k * 3); }
  // D7 — Саптамша: нечёт от себя, чёт от 7-го
  function d7(lon) { var p = parts(lon), k = Math.floor(p.d / (30 / 7)); var st = (p.s % 2 === 0) ? p.s : mod12(p.s + 6); return mod12(st + k); }
  // D9 — Навамша: старт по стихии
  var NAV = [0, 9, 6, 3]; // fire→Овен, earth→Козерог, air→Весы, water→Рак (по s%4)
  function d9(lon) { var p = parts(lon), k = Math.floor(p.d / (30 / 9)); return mod12(NAV[p.s % 4] + k); }
  // D10 — Дасамша: нечёт от себя, чёт от 9-го
  function d10(lon) { var p = parts(lon), k = Math.floor(p.d / 3); var st = (p.s % 2 === 0) ? p.s : mod12(p.s + 8); return mod12(st + k); }
  // D12 — Двадашамша: от себя
  function d12(lon) { var p = parts(lon), k = Math.floor(p.d / 2.5); return mod12(p.s + k); }
  // D16 — Шодашамша: подвиж→Овен, фикс→Лев, двойств→Стрелец
  var TRIP_0_4_8 = [0, 4, 8];
  function d16(lon) { var p = parts(lon), k = Math.floor(p.d / (30 / 16)); return mod12(TRIP_0_4_8[p.s % 3] + k); }
  // D20 — Вимшамша: подвиж→Овен, фикс→Стрелец, двойств→Лев
  var TRIP_0_8_4 = [0, 8, 4];
  function d20(lon) { var p = parts(lon), k = Math.floor(p.d / 1.5); return mod12(TRIP_0_8_4[p.s % 3] + k); }
  // D24 — Сиддхамша: нечёт→Лев, чёт→Рак
  function d24(lon) { var p = parts(lon), k = Math.floor(p.d / 1.25); var st = (p.s % 2 === 0) ? 4 : 3; return mod12(st + k); }
  // D27 — Бхамша: fire→Овен, earth→Рак, air→Весы, water→Козерог
  var BHA = [0, 3, 6, 9];
  function d27(lon) { var p = parts(lon), k = Math.floor(p.d / (30 / 27)); return mod12(BHA[p.s % 4] + k); }
  // D30 — Тримшамша: неравные отрезки
  function d30(lon) {
    var p = parts(lon), odd = p.s % 2 === 0, d = p.d;
    if (odd) { // Марс,Сатурн,Юпитер,Меркурий,Венера
      if (d < 5) return 0;      // Овен (Марс)
      if (d < 10) return 10;    // Водолей (Сатурн)
      if (d < 18) return 8;     // Стрелец (Юпитер)
      if (d < 25) return 2;     // Близнецы (Меркурий)
      return 6;                 // Весы (Венера)
    } else {                    // Венера,Меркурий,Юпитер,Сатурн,Марс
      if (d < 5) return 1;      // Телец (Венера)
      if (d < 12) return 5;     // Дева (Меркурий)
      if (d < 20) return 11;    // Рыбы (Юпитер)
      if (d < 25) return 9;     // Козерог (Сатурн)
      return 7;                 // Скорпион (Марс)
    }
  }
  // D40 — Кхаведамша: нечёт→Овен, чёт→Весы
  function d40(lon) { var p = parts(lon), k = Math.floor(p.d / 0.75); var st = (p.s % 2 === 0) ? 0 : 6; return mod12(st + k); }
  // D45 — Акшаведамша: подвиж→Овен, фикс→Лев, двойств→Стрелец
  function d45(lon) { var p = parts(lon), k = Math.floor(p.d / (30 / 45)); return mod12(TRIP_0_4_8[p.s % 3] + k); }
  // D60 — Шаштиамша: k = floor(deg*2), от самого знака
  function d60(lon) { var p = parts(lon), k = Math.floor(p.d * 2); return mod12(p.s + k); }

  var FN = { 1: d1, 2: d2, 3: d3, 4: d4, 7: d7, 9: d9, 10: d10, 12: d12,
    16: d16, 20: d20, 24: d24, 27: d27, 30: d30, 40: d40, 45: d45, 60: d60 };

  // varga(lon, N) -> знак 1..12 в варге DN (N из списка выше)
  function varga(lon, N) { var f = FN[N]; if (!f) return null; return f(lon) + 1; }

  // Шодашаварга: 16 варг для Вимшопаки
  var SHODASHA = [1, 2, 3, 4, 7, 9, 10, 12, 16, 20, 24, 27, 30, 40, 45, 60];

  window.LunVarga = { varga: varga, list: FN, SHODASHA: SHODASHA };
})();
