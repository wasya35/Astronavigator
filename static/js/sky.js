// Страница 1 — «небо сейчас»: тянет /api/sky, рисует карту, ведёт шкалу времени.
(function () {
  var chartEl = document.getElementById('sky-chart');
  var posEl = document.getElementById('positions');
  var slider = document.getElementById('time-slider');
  var timeVal = document.getElementById('time-value');
  var resetBtn = document.getElementById('reset-time');
  if (!chartEl || !slider) return;

  var SIGN_ORDER = ['Su', 'Mo', 'Ma', 'Me', 'Ju', 'Ve', 'Sa', 'Ra', 'Ke'];

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

  var timer = null;
  function load(offset) {
    timeVal.textContent = fmtOffset(offset);
    fetch('/api/sky?offset=' + offset)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        drawRasiChart(chartEl, data, {
          title: 'Небо', subtitle: offset === 0 ? 'сейчас' : fmtOffset(offset),
        });
        renderPositions(data.planets);
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
