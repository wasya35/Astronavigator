// Страница 1 — «небо сейчас»: тянет /api/sky, рисует карту, ведёт шкалу времени.
(function () {
  var chartEl = document.getElementById('sky-chart');
  var posEl = document.getElementById('positions');
  var slider = document.getElementById('time-slider');
  var timeVal = document.getElementById('time-value');
  var resetBtn = document.getElementById('reset-time');
  if (!chartEl || !slider) return;

  var SIGN_ORDER = ['Su', 'Mo', 'Ma', 'Me', 'Ju', 'Ve', 'Sa', 'Ra', 'Ke'];

  // Мерцающие звёзды по краям сцены (обходим центр, где карта)
  (function makeStars() {
    var sf = document.getElementById('starfield');
    if (!sf) return;
    var pts = [
      [4, 8], [12, 22], [8, 88], [3, 62], [18, 4], [22, 95],
      [50, 2], [48, 97], [78, 6], [70, 93], [90, 20], [95, 70],
      [92, 90], [88, 44], [6, 40], [30, 92],
    ];
    var colors = ['#854F0B', '#534AB7', '#B8B6AD'];
    pts.forEach(function (p, i) {
      var s = document.createElement('span');
      s.className = 'star';
      var size = 2 + (i % 3);
      s.style.top = p[0] + '%';
      s.style.left = p[1] + '%';
      s.style.width = size + 'px';
      s.style.height = size + 'px';
      s.style.color = colors[i % colors.length];
      s.style.animationDelay = (i * 0.37 % 3.6).toFixed(2) + 's';
      sf.appendChild(s);
    });
  })();

  function fmtDate(off) {
    var d = new Date(Date.now() + off * 86400000);
    var dm = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
    var wd = d.toLocaleDateString('ru-RU', { weekday: 'long' });
    return dm + ', ' + wd;
  }

  function fmtOffset(off) {
    if (off === 0) return 'сейчас';
    var d = new Date(Date.now() + off * 86400000);
    var s = d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });
    return s + (off > 0 ? ' (+' + off + ' дн)' : ' (' + off + ' дн)');
  }

  function renderPositions(planets) {
    var rows = SIGN_ORDER.map(function (code) {
      var p = planets[code];
      if (!p) return '';
      var retro = p.retrograde ? ' <span style="color:#854F0B">℞</span>' : '';
      return '<div class="pos-row"><span class="pos-p">' + p.name_ru + '</span>' +
        '<span class="pos-s">' + p.sign_ru + ' ' + p.degree.toFixed(1) + '°' + retro + '</span>' +
        '<span class="pos-n muted">' + p.nakshatra_ru + '</span></div>';
    });
    posEl.innerHTML = rows.join('');
  }

  var ORDER_IDX = {};
  SIGN_ORDER.forEach(function (c, i) { ORDER_IDX[c] = i; });
  var aspectsEl = document.getElementById('aspects');

  function renderAspects(dr) {
    if (!aspectsEl) return;
    function note(t) { return t ? '<div class="asp-note muted">' + t + '</div>' : ''; }
    var rows = [];
    (dr.conjunctions || []).forEach(function (c) {
      rows.push('<div class="asp-item"><div class="asp-row"><span class="asp-tag conj">соединение</span>' +
        c.a_ru + ' + ' + c.b_ru + ' <span class="muted">· ' + c.sign_ru + '</span></div>' + note(c.note) + '</div>');
    });
    var seen = {};
    (dr.aspects || []).forEach(function (a) {
      if (a.mutual) {
        var key = [a.from, a.to].sort().join('-');
        if (seen[key]) return; seen[key] = 1;
        rows.push('<div class="asp-item"><div class="asp-row"><span class="asp-tag mut">взаимный</span>' +
          a.from_ru + ' ↔ ' + a.to_ru + ' <span class="muted">· ' + a.distance + '-й</span></div>' + note(a.note) + '</div>');
      } else {
        rows.push('<div class="asp-item"><div class="asp-row"><span class="asp-tag spec">аспект</span>' +
          a.from_ru + ' → ' + a.to_ru + ' <span class="muted">· ' + a.distance + '-й</span></div>' + note(a.note) + '</div>');
      }
    });
    aspectsEl.innerHTML = rows.length ? rows.join('') : '<span class="muted">Заметных аспектов нет.</span>';
  }

  function renderMoon(m) {
    if (!m) return;
    var set = function (id, val) { var el = document.getElementById(id); if (el) el.textContent = val; };
    set('m-tithi', m.tithi + '-й · ' + m.paksha);
    set('m-sign', m.sign_ru + ' ' + m.degree.toFixed(1) + '°');
    set('m-phase', m.phase_label + ' · ' + m.illumination + '%');
    set('m-nak', m.nakshatra_ru);
    // блок накшатры (описание из документов владельца)
    set('nak-title', m.nakshatra_ru);
    set('nak-fon', m.fon || '');
    set('nak-amp', m.amplifies || '');
    set('nak-dist', m.distorts || '');
    var list = function (id, items, empty) {
      var el = document.getElementById(id); if (!el) return;
      if (items && items.length) {
        el.innerHTML = items.map(function (x) { return '<li>' + x + '</li>'; }).join('');
      } else { el.innerHTML = '<li>' + empty + '</li>'; }
    };
    list('nak-good', m.good, 'ровный фон');
    list('nak-avoid', m.avoid, 'особых ограничений нет');
    set('nak-tuning', m.tuning ? ('«' + m.tuning + '»') : '');
  }

  var timer = null;
  function load(offset) {
    timeVal.textContent = fmtOffset(offset);
    var md = document.getElementById('moon-date');
    if (md) md.textContent = fmtDate(offset);
    fetch('/api/sky?offset=' + offset)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var dr = data.drishti || {};
        drawRasiChart(chartEl, data, {
          title: 'Небо', subtitle: offset === 0 ? 'сейчас' : fmtOffset(offset),
          aspects: dr.aspects,
        });
        renderPositions(data.planets);
        renderAspects(dr);
        renderMoon(data.moon);
      })
      .catch(function () { chartEl.innerHTML = '<p class="muted">Не удалось загрузить небо.</p>'; });
  }

  slider.addEventListener('input', function () {
    var off = parseInt(slider.value, 10);
    timeVal.textContent = fmtOffset(off);
    clearTimeout(timer);
    timer = setTimeout(function () { load(off); }, 120); // дебаунс
  });
  resetBtn.addEventListener('click', function () {
    slider.value = 0; load(0);
  });

  load(0);
})();
