// Страница 1 — «небо сейчас». Всё считается в браузере (window.Jyotish.sky).
(function () {
  var J = window.Jyotish;
  var chartEl = document.getElementById('sky-chart');
  var posEl = document.getElementById('positions');
  var slider = document.getElementById('time-slider');
  var timeVal = document.getElementById('time-value');
  var resetBtn = document.getElementById('reset-time');
  if (!chartEl || !slider || !J) return;

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
      s.style.top = p[0] + '%'; s.style.left = p[1] + '%';
      s.style.width = size + 'px'; s.style.height = size + 'px';
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
    posEl.innerHTML = SIGN_ORDER.map(function (code) {
      var p = planets[code]; if (!p) return '';
      var retro = p.retrograde ? ' <span style="color:#854F0B">℞</span>' : '';
      return '<div class="pos-row"><span class="pos-p">' + p.name_ru + '</span>' +
        '<span class="pos-s">' + p.sign_ru + ' ' + p.degree.toFixed(1) + '°' + retro + '</span>' +
        '<span class="pos-n muted">' + p.nakshatra_ru + '</span></div>';
    }).join('');
  }

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
    set('nak-title', m.nakshatra_ru);
    set('nak-fon', m.fon || '');
    set('nak-amp', m.amplifies || '');
    set('nak-dist', m.distorts || '');
    var list = function (id, items, empty) {
      var el = document.getElementById(id); if (!el) return;
      if (items && items.length) el.innerHTML = items.map(function (x) { return '<li>' + x + '</li>'; }).join('');
      else el.innerHTML = '<li>' + empty + '</li>';
    };
    list('nak-good', m.good, 'ровный фон');
    list('nak-avoid', m.avoid, 'особых ограничений нет');
    set('nak-tuning', m.tuning ? ('«' + m.tuning + '»') : '');
  }

  // ── Барометр дня (СБЧ) ────────────────────────────────────────────────────
  var SBC_MAX = 3;                                   // шкала гаджета: −3…+3
  function sbcBand(v) {
    if (v >= 2) return { lbl: 'поддерживающий', cls: 'up', note: 'фон дня складывается в вашу пользу — хорошее окно для активных дел и начинаний.' };
    if (v >= 0.6) return { lbl: 'спокойный плюс', cls: 'up2', note: 'умеренно благоприятный фон, можно двигать дела без спешки.' };
    if (v > -0.6) return { lbl: 'ровный фон', cls: 'flat', note: 'нейтральный день без выраженного крена — обычный рабочий ритм.' };
    if (v > -2) return { lbl: 'сдержанный', cls: 'dn2', note: 'фон приглушён — лучше рутина и завершение начатого, чем новые старты.' };
    return { lbl: 'бережный', cls: 'dn', note: 'бережный день — снизьте темп, отложите важные начинания на потом.' };
  }
  function readJanma() {
    // джанма (1..27) из сохранённого профиля «Моей карты», иначе null
    try {
      var p = JSON.parse(localStorage.getItem('astronav_profile'));
      if (!p || !p.date || !p.place || !window.Jyotish || !window.LunSBC) return null;
      var ts = window.Jyotish.birthUtc(p); if (ts == null) return null;
      return { janma: window.LunSBC.janmaOf(ts), name: p.name || '' };
    } catch (e) { return null; }
  }
  var sbcPanel = document.getElementById('sbc-panel');
  function renderSBC(offset) {
    if (!sbcPanel || !window.LunSBC) return;
    var set = function (id, v) { var el = document.getElementById(id); if (el) el.textContent = v; };
    var jn = readJanma();
    var badge = document.getElementById('sbc-badge'), fill = document.getElementById('sbc-fill');
    var spark = document.getElementById('sbc-spark'), cta = document.getElementById('sbc-cta');
    if (!jn) {                                         // нет профиля — приглашение
      sbcPanel.classList.add('sbc-empty');
      set('sbc-scope', 'по вашей накшатре рождения');
      badge.textContent = '—'; badge.className = 'sbc-badge';
      fill.style.width = '0'; spark.innerHTML = '';
      set('sbc-note', 'Постройте карту, чтобы увидеть барометр дня по вашей накшатре рождения.');
      if (cta) cta.hidden = false;
      return;
    }
    sbcPanel.classList.remove('sbc-empty');
    if (cta) cta.hidden = true;
    set('sbc-scope', 'джанма: ' + window.Jyotish.NAK[jn.janma - 1] + (jn.name ? ' · ' + jn.name : ''));
    var day = 86400000, base = Date.now() + offset * day;
    var val = window.LunSBC.scoreAt(base, { janma: jn.janma });
    var band = sbcBand(val);
    badge.textContent = (val > 0 ? '+' : '') + val.toFixed(1) + ' · ' + band.lbl;
    badge.className = 'sbc-badge ' + band.cls;
    var pct = Math.max(-1, Math.min(1, val / SBC_MAX)) * 50;
    if (pct >= 0) { fill.style.left = '50%'; fill.style.right = 'auto'; fill.style.width = pct + '%'; }
    else { fill.style.right = '50%'; fill.style.left = 'auto'; fill.style.width = (-pct) + '%'; }
    fill.className = 'sbc-fill ' + band.cls;
    set('sbc-note', band.note);
    // спарклайн ±15 дней
    var N = 31, W = 300, H = 46, pts = [];
    for (var i = 0; i < N; i++) {
      var v = window.LunSBC.scoreAt(base + (i - 15) * day, { janma: jn.janma });
      var x = i / (N - 1) * W;
      var y = H / 2 - Math.max(-1, Math.min(1, v / SBC_MAX)) * (H / 2 - 3);
      pts.push([x, y]);
    }
    var poly = pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ');
    var cx = pts[15][0], cy = pts[15][1];
    spark.innerHTML =
      '<line x1="0" y1="' + (H / 2) + '" x2="' + W + '" y2="' + (H / 2) + '" class="sbc-axis"/>' +
      '<polyline points="' + poly + '" class="sbc-line ' + band.cls + '"/>' +
      '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="3.2" class="sbc-dot ' + band.cls + '"/>';
  }

  function load(offset) {
    timeVal.textContent = fmtOffset(offset);
    var md = document.getElementById('moon-date');
    if (md) md.textContent = fmtDate(offset);
    renderSBC(offset);
    try {
      var data = J.sky(Date.now() + offset * 86400000);
      var dr = data.drishti || {};
      drawRasiChart(chartEl, data, {
        title: 'Небо', subtitle: offset === 0 ? 'сейчас' : fmtOffset(offset),
        aspects: dr.aspects,
      });
      renderPositions(data.planets);
      renderAspects(dr);
      renderMoon(data.moon);
    } catch (e) {
      chartEl.innerHTML = '<p class="muted">Не удалось рассчитать небо.</p>';
      if (window.console) console.error(e);
    }
  }

  var timer = null;
  slider.addEventListener('input', function () {
    var off = parseInt(slider.value, 10);
    timeVal.textContent = fmtOffset(off);
    clearTimeout(timer);
    timer = setTimeout(function () { load(off); }, 60);
  });
  resetBtn.addEventListener('click', function () { slider.value = 0; load(0); });

  var lo = parseInt(slider.min, 10), hi = parseInt(slider.max, 10);
  Array.prototype.forEach.call(document.querySelectorAll('.time-steps .step'), function (btn) {
    btn.addEventListener('click', function () {
      var nv = parseInt(slider.value, 10) + parseInt(btn.getAttribute('data-step'), 10);
      nv = Math.max(lo, Math.min(hi, nv));
      slider.value = nv; load(nv);
    });
  });

  load(0);
})();
