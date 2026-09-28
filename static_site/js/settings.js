// «Моя карта»: форма рождения -> window.Jyotish.natal -> карта + махадаша.
// Профиль хранится в localStorage браузера. Расчёт полностью клиентский.
(function () {
  var J = window.Jyotish;
  var KEY = 'astronav_profile';
  var form = document.getElementById('birth-form');
  var formWrap = document.getElementById('form-wrap');
  var result = document.getElementById('result');
  var msg = document.getElementById('form-msg');
  var SIGN_ORDER = ['Su', 'Mo', 'Ma', 'Me', 'Ju', 'Ve', 'Sa', 'Ra', 'Ke'];
  if (!form) return;

  function getProfile() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } }

  // ── автодополнение городов (место рождения / проживания) ──────────────────
  function bindCity(input) {
    if (!input || !window.CITIES) return;
    var list = document.createElement('datalist');
    list.id = 'dl-' + Math.random().toString(36).slice(2);
    document.body.appendChild(list);
    input.setAttribute('list', list.id);
    input.addEventListener('input', function () {
      var opts = window.CITIES.suggest(input.value, 8);
      list.innerHTML = opts.map(function (c) { return '<option value="' + c.name + '"></option>'; }).join('');
    });
  }
  bindCity(form.querySelector('[name=place]'));
  bindCity(form.querySelector('[name=residence]'));

  function renderPlanets(planets) {
    return SIGN_ORDER.map(function (code) {
      var p = planets[code]; if (!p) return '';
      var retro = p.retrograde ? ' <span style="color:#854F0B">℞</span>' : '';
      return '<div class="pos-row"><span class="pos-p">' + p.name_ru + '</span>' +
        '<span class="pos-s">' + p.sign_ru + ' ' + p.degree.toFixed(1) + '° · дом ' + p.house + retro + '</span>' +
        '<span class="pos-n muted">D9 ' + p.nav_sign_ru + '</span></div>';
    }).join('');
  }

  function show(data) {
    formWrap.style.display = 'none';
    result.style.display = 'block';
    document.getElementById('r-birth').textContent = data.birth.local + ' · ' + data.birth.city;
    var lg = data.lagna;
    var setv = function (id, v) { var el = document.getElementById(id); if (el) el.textContent = v; };
    setv('r-lagna-sign', lg.sign_ru);
    setv('r-lagna-deg', lg.degree.toFixed(1) + '°');
    setv('r-lagna-nak', lg.nakshatra_ru);
    setv('r-lagna-nav', lg.nav_sign_ru);
    document.getElementById('r-planets').innerHTML = renderPlanets(data.planets);
    drawRasiChart(document.getElementById('natal-chart'), data, { lagnaSign: lg.sign, title: 'Раси', subtitle: 'D1' });
    var c = data.cascade;
    document.getElementById('md-value').textContent = c.mahadasha.ruler_ru + ' · до ' + c.mahadasha.ends;
    document.getElementById('md-bg').textContent = c.mahadasha.background;
    document.getElementById('ad-value').textContent = c.antardasha.ruler_ru + ' · до ' + c.antardasha.ends;
    document.getElementById('ad-bg').textContent = c.antardasha.background;
  }

  // ── Таблицы: Аштакаварга (8 квадратов, как в Дж.Хоре) ─────────────────────
  var AV_RU = { Su: 'Солнце', Mo: 'Луна', Ma: 'Марс', Me: 'Меркурий', Ju: 'Юпитер', Ve: 'Венера', Sa: 'Сатурн' };
  function showTables(profile) {
    var grid = document.getElementById('av-grid');
    if (!grid || !J.ashtakavarga) return;
    var av = J.ashtakavarga(profile);
    if (av.error) { grid.innerHTML = '<p class="muted">' + av.error + '</p>'; return; }
    var order = ['Su', 'Mo', 'Ma', 'Me', 'Ju', 'Ve', 'Sa'];
    grid.innerHTML = order.map(function (p) { return '<div class="av-cell" data-k="' + p + '"></div>'; }).join('') +
      '<div class="av-cell" data-k="SAV"></div>';
    order.forEach(function (p) { drawGridChart(grid.querySelector('[data-k="' + p + '"]'), av.bav[p], { title: AV_RU[p], max: 8 }); });
    drawGridChart(grid.querySelector('[data-k="SAV"]'), av.sav, { title: 'САВ', max: 56, strong: true });

    // Сила планет: Вимшопака · Шадбала (рупы·доля) · САВ(в знаке планеты)
    var st = document.getElementById('strength-table');
    if (st) {
      var vm = J.vimsopaka ? J.vimsopaka(profile) : { error: 1 };
      var sb = J.shadbala ? J.shadbala(profile) : { error: 1 };
      var rows = order.map(function (p) {
        var vv = (vm && !vm.error) ? vm.score[p] : null;
        var vcls = vv == null ? '' : (vv > 15 ? 's-hi' : (vv > 10 ? 's-mid' : 's-lo'));
        var sp = (sb && !sb.error) ? sb.planets[p] : null;
        var scls = sp == null ? '' : (sp.ratio >= 1 ? 's-hi' : 's-lo');
        var savv = av.sav[av.signsUsed[p] - 1];
        var savcls = savv >= 30 ? 's-hi' : (savv >= 25 ? 's-mid' : 's-lo');
        return '<tr><td>' + AV_RU[p] + '</td>' +
          '<td class="' + vcls + '">' + (vv == null ? '—' : vv.toFixed(2)) + '</td>' +
          '<td class="' + scls + '">' + (sp == null ? '—' : sp.rupa.toFixed(2) + ' · ' + (sp.ratio * 100).toFixed(1) + '%') + '</td>' +
          '<td class="' + savcls + '">' + savv + '</td></tr>';
      }).join('');
      st.innerHTML = '<table class="tbl"><thead><tr><th>Планета</th><th>Вимшопака</th><th>Шадбала (рупы · %)</th><th>САВ</th></tr></thead><tbody>' + rows + '</tbody></table>';
    }
  }

  // свёртывание полосы «ТАБЛИЦЫ»
  (function () {
    var t = document.getElementById('tables-toggle'), body = document.getElementById('tables-body');
    if (!t || !body) return;
    t.addEventListener('click', function () {
      var open = body.hidden;
      body.hidden = !open;
      t.setAttribute('aria-expanded', open ? 'true' : 'false');
      t.classList.toggle('open', open);
    });
  })();

  function calculate(profile) {
    msg.textContent = 'Считаю карту…';
    try {
      var data = J.natal(profile);
      if (data.error) { msg.textContent = data.error; return; }
      localStorage.setItem(KEY, JSON.stringify(profile));
      msg.textContent = 'Бесплатно · без регистрации';
      show(data);
      showTables(profile);
    } catch (e) {
      msg.textContent = 'Не удалось рассчитать карту. Проверьте дату и город.';
      if (window.console) console.error(e);
    }
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var fd = new FormData(form);
    calculate({
      name: fd.get('name') || '', date: fd.get('date') || '', time: fd.get('time') || '',
      time_unknown: !!fd.get('time_unknown'),
      place: fd.get('place') || '', residence: fd.get('residence') || '',
    });
  });

  document.getElementById('edit-btn').addEventListener('click', function (e) {
    e.preventDefault();
    result.style.display = 'none';
    formWrap.style.display = 'block';
  });

  var saved = getProfile();
  if (saved && saved.date && saved.place) {
    ['name', 'date', 'time', 'place', 'residence'].forEach(function (k) {
      var inp = form.querySelector('[name=' + k + ']'); if (inp && saved[k]) inp.value = saved[k];
    });
    calculate(saved);
  }
})();
