// Форма входа на главной: сохранить профиль в localStorage -> /navigator.
// Профиль гостя хранится в браузере (ТЗ, раздел 9).
(function () {
  const form = document.getElementById('entry-form');
  if (!form) return;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const fd = new FormData(form);
    const profile = {
      date: fd.get('date') || '',
      time: fd.get('time') || '',
      time_unknown: !!fd.get('time_unknown'),
      place: fd.get('place') || '',
      residence: fd.get('residence') || '',
    };
    localStorage.setItem('astronav_profile', JSON.stringify(profile));
    window.location.href = '/navigator';
  });
})();
