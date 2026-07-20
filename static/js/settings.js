// Настройки: форма рождения -> /api/calculate -> карта + махадаша. Профиль в localStorage.
(function () {
  var KEY = 'astronav_profile';
  var form = document.getElementById('birth-form');
  var formWrap = document.getElementById('form-wrap');
  var result = document.getElementById('result');
  var msg = document.getElementById('form-msg');
  var SIGN_ORDER = ['Su', 'Mo', 'Ma', 'Me', 'Ju', 'Ve', 'Sa', 'Ra', 'Ke'];

  function getProfile() {
    try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; }
  }

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
    document.getElementById('r-lagna').innerHTML =
      '<strong>' + lg.sign_ru + '</strong> ' + lg.degree.toFixed(1) + '° · накшатра ' + lg.nakshatra_ru +
      '<br><span class="muted">Навамша-лагна: ' + lg.nav_sign_ru + '</span>';
    document.getElementById('r-planets').innerHTML = renderPlanets(data.planets);
    drawRasiChart(document.getElementById('natal-chart'), data, {
      lagnaSign: lg.sign, title: 'Раси', subtitle: 'D1',
    });
    var c = data.cascade;
    document.getElementById('md-value').textContent = c.mahadasha.ruler_ru + ' · до ' + c.mahadasha.ends;
    document.getElementById('md-bg').textContent = c.mahadasha.background;
    document.getElementById('ad-value').textContent = c.antardasha.ruler_ru + ' · до ' + c.antardasha.ends;
    document.getElementById('ad-bg').textContent = c.antardasha.background;
  }

  function calculate(profile) {
    msg.textContent = 'Считаю карту…';
    fetch('/api/calculate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (!res.ok) { msg.textContent = res.j.error || 'Ошибка расчёта'; return; }
        localStorage.setItem(KEY, JSON.stringify(profile));
        show(res.j);
      })
      .catch(function () { msg.textContent = 'Сервис расчёта недоступен, попробуйте позже.'; });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var fd = new FormData(form);
    calculate({
      date: fd.get('date') || '', time: fd.get('time') || '',
      time_unknown: !!fd.get('time_unknown'),
      place: fd.get('place') || '', residence: fd.get('residence') || '',
    });
  });

  document.getElementById('edit-btn').addEventListener('click', function (e) {
    e.preventDefault();
    result.style.display = 'none';
    formWrap.style.display = 'block';
  });

  // автозагрузка сохранённого профиля
  var saved = getProfile();
  if (saved && saved.date && saved.place) {
    // предзаполнить форму
    ['date', 'time', 'place', 'residence'].forEach(function (k) {
      var inp = form.querySelector('[name=' + k + ']'); if (inp && saved[k]) inp.value = saved[k];
    });
    calculate(saved);
  }
})();
