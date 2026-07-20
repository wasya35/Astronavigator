"""
transits.py — транзитное («на сейчас» или на заданную дату) положение планет.
Та же база, что в натальном движке: pyswisseph, сидерика, айянамша Лахири.
Для страницы 1 (небо для всех) и шкалы времени.
"""
import swisseph as swe
from datetime import datetime, timezone, timedelta

SIGNS_RU = [
    'Овен', 'Телец', 'Близнецы', 'Рак', 'Лев', 'Дева',
    'Весы', 'Скорпион', 'Стрелец', 'Козерог', 'Водолей', 'Рыбы',
]
NAKSHATRAS_RU = [
    'Ашвини', 'Бхарани', 'Криттика', 'Рохини', 'Мригашира', 'Ардра',
    'Пунарвасу', 'Пушья', 'Ашлеша', 'Магха', 'Пурва Пхалгуни', 'Уттара Пхалгуни',
    'Хаста', 'Читра', 'Свати', 'Вишакха', 'Анурадха', 'Джйештха',
    'Мула', 'Пурвашадха', 'Уттарашадха', 'Шравана', 'Дхаништха', 'Шатабхиша',
    'Пурва Бхадрапада', 'Уттара Бхадрапада', 'Ревати',
]
PLANETS_RU = {
    'Su': 'Солнце', 'Mo': 'Луна', 'Ma': 'Марс', 'Me': 'Меркурий',
    'Ju': 'Юпитер', 'Ve': 'Венера', 'Sa': 'Сатурн', 'Ra': 'Раху', 'Ke': 'Кету',
}
_BODIES = {
    'Su': swe.SUN, 'Mo': swe.MOON, 'Ma': swe.MARS, 'Me': swe.MERCURY,
    'Ju': swe.JUPITER, 'Ve': swe.VENUS, 'Sa': swe.SATURN, 'Ra': swe.MEAN_NODE,
}

NAK_SPAN = 360 / 27


def _planet_dict(code, lon, speed):
    sign = int(lon / 30) + 1
    nak = int(lon / NAK_SPAN) + 1
    return {
        'code': code,
        'name_ru': PLANETS_RU[code],
        'longitude': round(lon, 4),
        'sign': sign,
        'sign_ru': SIGNS_RU[sign - 1],
        'degree': round(lon % 30, 2),
        'retrograde': bool(speed < 0 and code not in ('Ra', 'Ke')),
        'nakshatra': nak,
        'nakshatra_ru': NAKSHATRAS_RU[nak - 1],
    }


def sky_at(dt_utc: datetime = None) -> dict:
    """Положение 9 грах на момент dt_utc (по умолчанию — сейчас).

    Возвращает JSON-совместимый dict: список планет + метаданные времени.
    Без лагны/домов — это «общее небо», одинаковое для всех.
    """
    if dt_utc is None:
        dt_utc = datetime.now(timezone.utc)
    if dt_utc.tzinfo is None:
        dt_utc = dt_utc.replace(tzinfo=timezone.utc)

    jd = swe.julday(
        dt_utc.year, dt_utc.month, dt_utc.day,
        dt_utc.hour + dt_utc.minute / 60.0 + dt_utc.second / 3600.0,
    )
    swe.set_sid_mode(swe.SIDM_LAHIRI)

    planets = {}
    for code, bid in _BODIES.items():
        pos, _ = swe.calc_ut(jd, bid, swe.FLG_SIDEREAL | swe.FLG_SPEED)
        planets[code] = _planet_dict(code, pos[0], pos[3])

    # Кету = Раху + 180°
    rahu_lon = planets['Ra']['longitude']
    planets['Ke'] = _planet_dict('Ke', (rahu_lon + 180) % 360, 0.0)

    return {
        'datetime_utc': dt_utc.isoformat(),
        'ayanamsha': 'lahiri',
        'zodiac': 'sidereal',
        'planets': planets,
    }


def sky_offset(offset_days: float = 0) -> dict:
    """Небо со смещением в днях от текущего момента (для шкалы времени)."""
    return sky_at(datetime.now(timezone.utc) + timedelta(days=offset_days))
