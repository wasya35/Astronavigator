/* =============================================================================
 *  cities.js — встроенный справочник городов РФ/СНГ: широта, долгота, IANA-tz.
 *  tz нужен для конверсии локального времени рождения -> UTC через Intl
 *  (историческая база часовых поясов в браузере учитывает декретное время СССР).
 *  window.CITIES.find(name) -> {name, lat, lon, tz} | null  (по префиксу, без регистра)
 *  window.CITIES.suggest(q, limit) -> [ {name, ...} ]        (для автодополнения)
 * ===========================================================================*/
(function () {
  // lon > 0 — восточная долгота. Порядок: name, lat, lon, tz
  var DATA = [
    ['Москва', 55.7558, 37.6173, 'Europe/Moscow'],
    ['Санкт-Петербург', 59.9311, 30.3609, 'Europe/Moscow'],
    ['Новосибирск', 55.0084, 82.9357, 'Asia/Novosibirsk'],
    ['Екатеринбург', 56.8389, 60.6057, 'Asia/Yekaterinburg'],
    ['Казань', 55.7963, 49.1088, 'Europe/Moscow'],
    ['Нижний Новгород', 56.2965, 43.9361, 'Europe/Moscow'],
    ['Челябинск', 55.1644, 61.4368, 'Asia/Yekaterinburg'],
    ['Красноярск', 56.0153, 92.8932, 'Asia/Krasnoyarsk'],
    ['Самара', 53.1959, 50.1002, 'Europe/Samara'],
    ['Уфа', 54.7388, 55.9721, 'Asia/Yekaterinburg'],
    ['Ростов-на-Дону', 47.2357, 39.7015, 'Europe/Moscow'],
    ['Омск', 54.9885, 73.3242, 'Asia/Omsk'],
    ['Краснодар', 45.0355, 38.9753, 'Europe/Moscow'],
    ['Воронеж', 51.6608, 39.2003, 'Europe/Moscow'],
    ['Пермь', 58.0105, 56.2502, 'Asia/Yekaterinburg'],
    ['Волгоград', 48.7080, 44.5133, 'Europe/Volgograd'],
    ['Саратов', 51.5336, 46.0343, 'Europe/Saratov'],
    ['Тюмень', 57.1522, 65.5272, 'Asia/Yekaterinburg'],
    ['Тольятти', 53.5078, 49.4204, 'Europe/Samara'],
    ['Ижевск', 56.8526, 53.2045, 'Europe/Samara'],
    ['Барнаул', 53.3606, 83.7636, 'Asia/Barnaul'],
    ['Ульяновск', 54.3142, 48.4031, 'Europe/Ulyanovsk'],
    ['Иркутск', 52.2870, 104.3050, 'Asia/Irkutsk'],
    ['Хабаровск', 48.4827, 135.0838, 'Asia/Vladivostok'],
    ['Ярославль', 57.6261, 39.8845, 'Europe/Moscow'],
    ['Владивосток', 43.1155, 131.8855, 'Asia/Vladivostok'],
    ['Махачкала', 42.9849, 47.5047, 'Europe/Moscow'],
    ['Томск', 56.4977, 84.9744, 'Asia/Tomsk'],
    ['Оренбург', 51.7682, 55.0969, 'Asia/Yekaterinburg'],
    ['Кемерово', 55.3547, 86.0873, 'Asia/Novokuznetsk'],
    ['Новокузнецк', 53.7596, 87.1216, 'Asia/Novokuznetsk'],
    ['Рязань', 54.6269, 39.6916, 'Europe/Moscow'],
    ['Астрахань', 46.3479, 48.0336, 'Europe/Astrakhan'],
    ['Пенза', 53.2007, 45.0046, 'Europe/Moscow'],
    ['Липецк', 52.6031, 39.5708, 'Europe/Moscow'],
    ['Киров', 58.6035, 49.6679, 'Europe/Kirov'],
    ['Чебоксары', 56.1439, 47.2489, 'Europe/Moscow'],
    ['Тула', 54.1961, 37.6182, 'Europe/Moscow'],
    ['Калининград', 54.7104, 20.4522, 'Europe/Kaliningrad'],
    ['Курск', 51.7304, 36.1926, 'Europe/Moscow'],
    ['Ставрополь', 45.0445, 41.9691, 'Europe/Moscow'],
    ['Улан-Удэ', 51.8335, 107.5842, 'Asia/Irkutsk'],
    ['Тверь', 56.8587, 35.9176, 'Europe/Moscow'],
    ['Магнитогорск', 53.4072, 58.9791, 'Asia/Yekaterinburg'],
    ['Сочи', 43.5855, 39.7231, 'Europe/Moscow'],
    ['Иваново', 57.0004, 40.9739, 'Europe/Moscow'],
    ['Брянск', 53.2434, 34.3654, 'Europe/Moscow'],
    ['Белгород', 50.5952, 36.5872, 'Europe/Moscow'],
    ['Сургут', 61.2500, 73.4167, 'Asia/Yekaterinburg'],
    ['Владимир', 56.1290, 40.4066, 'Europe/Moscow'],
    ['Архангельск', 64.5393, 40.5169, 'Europe/Moscow'],
    ['Калуга', 54.5293, 36.2754, 'Europe/Moscow'],
    ['Смоленск', 54.7818, 32.0401, 'Europe/Moscow'],
    ['Волжский', 48.7859, 44.7797, 'Europe/Volgograd'],
    ['Череповец', 59.1269, 37.9094, 'Europe/Moscow'],
    ['Вологда', 59.2205, 39.8915, 'Europe/Moscow'],
    ['Саранск', 54.1838, 45.1749, 'Europe/Moscow'],
    ['Курган', 55.4410, 65.3411, 'Asia/Yekaterinburg'],
    ['Орёл', 52.9685, 36.0692, 'Europe/Moscow'],
    ['Владикавказ', 43.0241, 44.6814, 'Europe/Moscow'],
    ['Мурманск', 68.9585, 33.0827, 'Europe/Moscow'],
    ['Тамбов', 52.7213, 41.4523, 'Europe/Moscow'],
    ['Грозный', 43.3169, 45.6981, 'Europe/Moscow'],
    ['Стерлитамак', 53.6304, 55.9310, 'Asia/Yekaterinburg'],
    ['Нижневартовск', 60.9344, 76.5531, 'Asia/Yekaterinburg'],
    ['Якутск', 62.0281, 129.7326, 'Asia/Yakutsk'],
    ['Кострома', 57.7677, 40.9269, 'Europe/Moscow'],
    ['Нерюнгри', 56.6588, 124.7189, 'Asia/Yakutsk'],
    ['Комсомольск-на-Амуре', 50.5503, 137.0079, 'Asia/Vladivostok'],
    ['Петрозаводск', 61.7849, 34.3469, 'Europe/Moscow'],
    ['Нижний Тагил', 57.9105, 59.9813, 'Asia/Yekaterinburg'],
    ['Новороссийск', 44.7239, 37.7686, 'Europe/Moscow'],
    ['Йошкар-Ола', 56.6388, 47.8908, 'Europe/Moscow'],
    ['Таганрог', 47.2094, 38.9350, 'Europe/Moscow'],
    ['Сыктывкар', 61.6688, 50.8365, 'Europe/Moscow'],
    ['Норильск', 69.3558, 88.1893, 'Asia/Krasnoyarsk'],
    ['Нальчик', 43.4981, 43.6189, 'Europe/Moscow'],
    ['Шахты', 47.7085, 40.2158, 'Europe/Moscow'],
    ['Дзержинск', 56.2377, 43.4600, 'Europe/Moscow'],
    ['Братск', 56.1325, 101.6142, 'Asia/Irkutsk'],
    ['Орск', 51.2294, 58.4750, 'Asia/Yekaterinburg'],
    ['Ангарск', 52.5442, 103.8886, 'Asia/Irkutsk'],
    ['Благовещенск', 50.2907, 127.5272, 'Asia/Yakutsk'],
    ['Псков', 57.8194, 28.3320, 'Europe/Moscow'],
    ['Бийск', 52.5393, 85.2072, 'Asia/Barnaul'],
    ['Прокопьевск', 53.8814, 86.7197, 'Asia/Novokuznetsk'],
    ['Южно-Сахалинск', 46.9591, 142.7380, 'Asia/Sakhalin'],
    ['Армавир', 44.9892, 41.1234, 'Europe/Moscow'],
    ['Балашиха', 55.7963, 37.9386, 'Europe/Moscow'],
    ['Северодвинск', 64.5635, 39.8302, 'Europe/Moscow'],
    ['Петропавловск-Камчатский', 53.0370, 158.6559, 'Asia/Kamchatka'],
    ['Абакан', 53.7156, 91.4292, 'Asia/Krasnoyarsk'],
    ['Чита', 52.0340, 113.4994, 'Asia/Chita'],
    ['Великий Новгород', 58.5215, 31.2755, 'Europe/Moscow'],
    ['Старый Оскол', 51.2966, 37.8410, 'Europe/Moscow'],
    // ── СНГ / ближнее зарубежье ──────────────────────────────────────────────
    ['Минск', 53.9006, 27.5590, 'Europe/Minsk'],
    ['Гомель', 52.4345, 30.9754, 'Europe/Minsk'],
    ['Могилёв', 53.9007, 30.3313, 'Europe/Minsk'],
    ['Витебск', 55.1904, 30.2049, 'Europe/Minsk'],
    ['Брест', 52.0976, 23.7341, 'Europe/Minsk'],
    ['Гродно', 53.6694, 23.8131, 'Europe/Minsk'],
    ['Киев', 50.4501, 30.5234, 'Europe/Kiev'],
    ['Харьков', 49.9935, 36.2304, 'Europe/Kiev'],
    ['Одесса', 46.4825, 30.7233, 'Europe/Kiev'],
    ['Днепр', 48.4647, 35.0462, 'Europe/Kiev'],
    ['Львов', 49.8397, 24.0297, 'Europe/Kiev'],
    ['Астана', 51.1694, 71.4491, 'Asia/Almaty'],
    ['Алматы', 43.2220, 76.8512, 'Asia/Almaty'],
    ['Шымкент', 42.3417, 69.5901, 'Asia/Almaty'],
    ['Караганда', 49.8047, 73.1094, 'Asia/Almaty'],
    ['Актобе', 50.2839, 57.1670, 'Asia/Aqtobe'],
    ['Ташкент', 41.2995, 69.2401, 'Asia/Tashkent'],
    ['Самарканд', 39.6270, 66.9750, 'Asia/Samarkand'],
    ['Бухара', 39.7681, 64.4556, 'Asia/Samarkand'],
    ['Бишкек', 42.8746, 74.5698, 'Asia/Bishkek'],
    ['Ош', 40.5283, 72.7985, 'Asia/Bishkek'],
    ['Душанбе', 38.5598, 68.7870, 'Asia/Dushanbe'],
    ['Ашхабад', 37.9601, 58.3261, 'Asia/Ashgabat'],
    ['Баку', 40.4093, 49.8671, 'Asia/Baku'],
    ['Ереван', 40.1792, 44.4991, 'Asia/Yerevan'],
    ['Тбилиси', 41.7151, 44.8271, 'Asia/Tbilisi'],
    ['Кишинёв', 47.0105, 28.8638, 'Europe/Chisinau'],
    ['Рига', 56.9496, 24.1052, 'Europe/Riga'],
    ['Вильнюс', 54.6872, 25.2797, 'Europe/Vilnius'],
    ['Таллин', 59.4370, 24.7536, 'Europe/Tallinn'],
    ['Сухум', 43.0015, 41.0234, 'Europe/Moscow'],
    ['Тирасполь', 46.8403, 29.6433, 'Europe/Chisinau'],
  ];

  function key(s) { return (s || '').toLowerCase().replace(/ё/g, 'е').replace(/[\s-]+/g, ' ').trim(); }
  var LIST = DATA.map(function (r) { return { name: r[0], lat: r[1], lon: r[2], tz: r[3], _k: key(r[0]) }; });

  function find(name) {
    var q = key(name);
    if (!q) return null;
    var exact = LIST.find(function (c) { return c._k === q; });
    if (exact) return exact;
    var pref = LIST.find(function (c) { return c._k.indexOf(q) === 0; });
    if (pref) return pref;
    return LIST.find(function (c) { return c._k.indexOf(q) >= 0; }) || null;
  }
  function suggest(q, limit) {
    var k = key(q); if (!k) return [];
    var pref = [], sub = [];
    LIST.forEach(function (c) {
      var i = c._k.indexOf(k);
      if (i === 0) pref.push(c); else if (i > 0) sub.push(c);
    });
    return pref.concat(sub).slice(0, limit || 8);
  }

  window.CITIES = { list: LIST, find: find, suggest: suggest };
})();
