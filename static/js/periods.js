// Страница 3 — каскад даш. Берёт профиль из localStorage, тянет /api/periods.
(function () {
  var KEY = 'astronav_profile';
  var need = document.getElementById('need-data');
  var result = document.getElementById('periods-result');

  function getProfile() {
    try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; }
  }

  function row(p) {
    var cls = 'tl-row' + (p.is_current ? ' current' : '');
    var mark = p.is_current ? '<span class="tl-now">сейчас</span>' : '';
    var yrs = p.years != null ? '<span class="muted tl-yrs">' + p.years + ' лет</span>' : '';
    return '<div class="' + cls + '">' +
      '<div class="tl-main"><span class="tl-ruler">' + p.ruler_ru + '</span>' + mark + '</div>' +
      '<div class="tl-dates muted">' + p.start + ' — ' + p.end + ' ' + yrs + '</div>' +
      (p.background ? '<div class="tl-bg">' + p.background + '</div>' : '') +
      '</div>';
  }

  function render(data) {
    need.style.display = 'none';
    result.style.display = 'block';
    document.getElementById('p-birth').textContent = data.birth.local + ' · ' + data.birth.city;

    var cm = data.current_maha, ca = data.current_antara;
    document.getElementById('cur-maha').textContent = cm.ruler_ru + ' · до ' + cm.end;
    document.getElementById('cur-maha-advice').textContent = cm.advice || cm.background || '';
    document.getElementById('cur-antar').textContent = ca.ruler_ru + ' · до ' + ca.end;
    document.getElementById('cur-antar-advice').textContent = ca.advice || ca.background || '';

    document.getElementById('maha-list').innerHTML = data.mahadashas.map(row).join('');
    document.getElementById('antar-list').innerHTML = data.antardashas.map(row).join('');
    document.getElementById('prat-list').innerHTML = data.pratyantardashas.map(row).join('');
  }

  var profile = getProfile();
  if (!profile || !profile.date || !profile.place) {
    need.style.display = 'block';
    return;
  }

  fetch('/api/periods', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
    .then(function (res) {
      if (!res.ok) { need.style.display = 'block'; return; }
      render(res.j);
    })
    .catch(function () { need.style.display = 'block'; });
})();
