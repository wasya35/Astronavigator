// Навигатор дня: читает профиль из localStorage, тянет /api/calculate и
// /api/daily, отрисовывает каскад, «Сегодня» и полосу 7 дней под гейтом.
(function () {
  const KEY = 'astronav_profile';
  const GATE_KEY = 'astronav_week_unlocked';

  function getProfile() {
    try { return JSON.parse(localStorage.getItem(KEY)) || null; }
    catch (e) { return null; }
  }

  const demoProfile = { date: '15.04.1988', time: '09:30', place: 'Нерюнгри', residence: 'Нерюнгри' };

  function fillCascade(data) {
    const c = data.cascade;
    document.getElementById('md-value').textContent = c.mahadasha.ruler_ru + ' · до ' + c.mahadasha.ends;
    document.getElementById('md-bg').textContent = c.mahadasha.background;
    document.getElementById('ad-value').textContent = c.antardasha.ruler_ru + ' · до ' + c.antardasha.ends;
    document.getElementById('ad-bg').textContent = c.antardasha.background;
    const p = data.profile;
    document.getElementById('profile-name').textContent = p.name || 'Гость';
    document.getElementById('profile-city').textContent = p.residence || '—';
  }

  function fillToday(t) {
    const badge = document.getElementById('today-badge');
    badge.style.background = t.color;
    document.getElementById('badge-text').textContent = t.badge_text;
    document.getElementById('m-moon').textContent = t.moon_sign + ' · ' + t.moon_from_natal + '-й от вашей Луны';
    document.getElementById('m-tara').textContent = t.tara_word;
    document.getElementById('m-nak').textContent = t.nakshatra;
    document.getElementById('in-flow').textContent = t.in_flow;
    document.getElementById('with-care').textContent = t.with_care;
  }

  function fillWeek(week) {
    const box = document.getElementById('week');
    box.innerHTML = '';
    const days = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];
    week.forEach(function (d, i) {
      const bar = document.createElement('div');
      bar.className = 'bar';
      bar.style.height = (35 + d.score * 0.75) + '%';
      bar.style.background = d.color;
      const label = document.createElement('span');
      label.textContent = days[i % 7];
      bar.appendChild(label);
      box.appendChild(bar);
    });
  }

  function applyGate() {
    const unlocked = localStorage.getItem(GATE_KEY) === '1'
      || /[?&]start=site_daily/.test(window.location.search);
    if (/[?&]start=site_daily/.test(window.location.search)) {
      localStorage.setItem(GATE_KEY, '1');
    }
    const gate = document.getElementById('gate');
    const week = document.getElementById('week');
    if (unlocked) { gate.classList.add('hidden'); week.classList.remove('blurred'); }
  }

  function load() {
    const profile = getProfile() || demoProfile;
    const q = new URLSearchParams(profile).toString();

    fetch('/api/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    }).then(r => r.json()).then(fillCascade).catch(function () {});

    fetch('/api/daily?' + q).then(r => r.json()).then(function (d) {
      fillToday(d.today);
      fillWeek(d.week);
    }).catch(function () {});

    applyGate();
  }

  // форма «Пересчитать» на самой странице навигатора
  const form = document.getElementById('entry-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const fd = new FormData(form);
      localStorage.setItem(KEY, JSON.stringify({
        date: fd.get('date') || '', time: fd.get('time') || '',
        time_unknown: !!fd.get('time_unknown'),
        place: fd.get('place') || '', residence: fd.get('residence') || '',
      }));
      window.location.reload();
    });
  }

  // «изменить» разворачивает форму
  const edit = document.getElementById('edit-profile');
  if (edit) {
    edit.addEventListener('click', function (e) {
      e.preventDefault();
      const w = document.getElementById('entry-form-wrap');
      w.style.display = w.style.display === 'none' ? 'block' : 'none';
    });
  }

  document.addEventListener('DOMContentLoaded', load);
})();
