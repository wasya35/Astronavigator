# ПЕРЕНЕСЕНО ИЗ БОТА (wasya35/Dliotish1). Не редактировать здесь без синхронизации с ботом.
# TODO: вынести в общий пакет, чтобы бот и сайт не дублировали логику (см. ROADMAP).
"""
astro_engine.py
Расчёт натальной карты: pyswisseph + геокодинг + UTC конвертация.
Сидерический зодиак, аянамша Лахири.
"""
import logging
import swisseph as swe
import httpx
from geopy.geocoders import Nominatim
from timezonefinder import TimezoneFinder
import pytz
from datetime import datetime, timedelta
from dataclasses import dataclass
from typing import Optional

logger = logging.getLogger(__name__)

# ── Справочники ────────────────────────────────────────────────────────────

SIGNS_RU = [
    'Овен','Телец','Близнецы','Рак','Лев','Дева',
    'Весы','Скорпион','Стрелец','Козерог','Водолей','Рыбы'
]

# 27 накшатр по порядку (Ашвини = 1, Ревати = 27). Каждая ≈13°20'.
NAKSHATRAS_RU = [
    'Ашвини','Бхарани','Криттика','Рохини','Мригашира','Ардра',
    'Пунарвасу','Пушья','Ашлеша','Магха','Пурва Пхалгуни','Уттара Пхалгуни',
    'Хаста','Читра','Свати','Вишакха','Анурадха','Джйештха',
    'Мула','Пурвашадха','Уттарашадха','Шравана','Дхаништха','Шатабхиша',
    'Пурва Бхадрапада','Уттара Бхадрапада','Ревати',
]

PLANETS_RU = {
    'Su':'Солнце','Mo':'Луна','Ma':'Марс','Me':'Меркурий',
    'Ju':'Юпитер','Ve':'Венера','Sa':'Сатурн','Ra':'Раху','Ke':'Кету'
}

HOUSES_MEANING = {
    1:'личность, тело, характер',
    2:'финансы, речь, семья',
    3:'усилия, братья, коммуникации',
    4:'дом, мать, внутренний мир',
    5:'творчество, дети, интеллект',
    6:'препятствия, здоровье, конкуренты',
    7:'партнёр, брак, бизнес',
    8:'трансформация, кризисы, тайное',
    9:'удача, дхарма, учителя',
    10:'карьера, статус, действия в мире',
    11:'доходы, мечты, круг общения',
    12:'потери, духовность, заграница'
}

SWE_BODIES = {
    'Su': swe.SUN,
    'Mo': swe.MOON,
    'Ma': swe.MARS,
    'Me': swe.MERCURY,
    'Ju': swe.JUPITER,
    'Ve': swe.VENUS,
    'Sa': swe.SATURN,
    'Ra': swe.MEAN_NODE,
}

# Стартовые знаки навамши по стихиям
_NAV_START = {
    1:1, 5:1, 9:1,      # огонь  → Овен (1)
    2:10, 6:10, 10:10,  # земля  → Козерог (10)
    3:7,  7:7,  11:7,   # воздух → Весы (7)
    4:4,  8:4,  12:4,   # вода   → Рак (4)
}


# ── Dataclasses ────────────────────────────────────────────────────────────

@dataclass
class PlanetInfo:
    code:        str
    name_ru:     str
    longitude:   float    # полная сидерическая долгота 0–360
    sign:        int      # знак 1–12
    sign_ru:     str
    degree:      float    # градус внутри знака 0–30
    house:       int      # дом 1–12
    retrograde:  bool
    nakshatra:    int      # накшатра 1–27
    nakshatra_ru: str
    nav_sign:    int      # знак в навамше D9
    nav_sign_ru: str


@dataclass
class Chart:
    lagna:           int
    lagna_ru:        str
    lagna_degree:    float
    lagna_nakshatra: int       # накшатра восходящего знака (1-27)
    lagna_nak_ru:    str
    nav_lagna:    int         # знак лагны в навамше D9
    nav_lagna_ru: str
    planets:      dict        # code -> PlanetInfo
    house_cusps:  list        # 12 куспов в градусах
    birth_utc:    datetime
    birth_local:  str         # читаемая строка
    city:         str
    lat:          float
    lon:          float


# ── Вспомогательные функции ────────────────────────────────────────────────

def _navamsha_sign(sign: int, degree: float) -> int:
    """Знак планеты в навамше D9."""
    part = int(degree / (30 / 9))          # отдел 0–8
    start = _NAV_START[sign]
    return ((start - 1 + part) % 12) + 1


class CityNotFound(ValueError):
    """Город не найден ни одним провайдером (а не сетевая ошибка)."""


def _resolve_tz(lat: float, lon: float, tz_name: Optional[str]) -> str:
    """Возвращает IANA-таймзону: из ответа провайдера либо по координатам."""
    if tz_name:
        return tz_name
    tz_name = TimezoneFinder().timezone_at(lat=lat, lng=lon)
    if not tz_name:
        raise ValueError("Не удалось определить часовой пояс.")
    return tz_name


def _geocode_open_meteo(city: str) -> tuple[float, float, str]:
    """
    Open-Meteo Geocoding — бесплатно, без ключа, дружелюбно к серверам
    (в отличие от публичного Nominatim, блокирующего облачные IP).
    Отдаёт координаты и IANA-таймзону в одном запросе.
    """
    resp = httpx.get(
        "https://geocoding-api.open-meteo.com/v1/search",
        params={"name": city, "count": 1, "language": "ru", "format": "json"},
        timeout=10,
    )
    resp.raise_for_status()
    results = resp.json().get("results") or []
    if not results:
        raise CityNotFound(f"Город не найден: «{city}».")
    r = results[0]
    lat, lon = float(r["latitude"]), float(r["longitude"])
    return lat, lon, _resolve_tz(lat, lon, r.get("timezone"))


def _geocode_nominatim(city: str) -> tuple[float, float, str]:
    """Запасной геокодер: Nominatim (OpenStreetMap)."""
    geo = Nominatim(user_agent="jyotish_bot_v1", timeout=10)
    loc = geo.geocode(city, language="ru")
    if not loc:
        raise CityNotFound(f"Город не найден: «{city}».")
    return loc.latitude, loc.longitude, _resolve_tz(loc.latitude, loc.longitude, None)


def geocode_city(city: str) -> tuple[float, float, str]:
    """
    Название города → (lat, lon, timezone_name).
    Пробует провайдеров по очереди: Open-Meteo → Nominatim.
    Если один заблокирован/недоступен — используется следующий.
    """
    not_found = False
    for provider in (_geocode_open_meteo, _geocode_nominatim):
        try:
            return provider(city)
        except CityNotFound:
            not_found = True              # ответ есть, города нет — пробуем другого
        except Exception as e:
            logger.warning("Геокодер %s недоступен: %s", provider.__name__, e)

    if not_found:
        raise ValueError(
            f"Город не найден: «{city}». Попробуй по-английски или уточни страну "
            "(например: «Neryungri, Russia»)."
        )
    raise ValueError(
        "Сервисы геокодинга временно недоступны. Попробуй ещё раз через минуту."
    )


def local_to_utc(
    year: int, month: int, day: int,
    hour: int, minute: int,
    tz_name: str
) -> tuple[datetime, Optional[str]]:
    """
    Локальное время → UTC.
    Учитывает историю переходов через базу данных Олсона (pytz):
    — декретное время СССР (+1 ч к поясному, 1930–1991)
    — летнее/зимнее по годам
    — республиканские особенности
    Возвращает (utc_datetime, warning_text_or_None).
    """
    tz = pytz.timezone(tz_name)
    local_dt = datetime(year, month, day, hour, minute)
    warning = None

    try:
        localized = tz.localize(local_dt, is_dst=None)
    except pytz.exceptions.AmbiguousTimeError:
        # Время попало в «дублирующийся» час при переводе часов
        localized = tz.localize(local_dt, is_dst=False)
        warning = (
            "⚠️ Время рождения попадает на перевод часов — "
            "взято зимнее время. Если рождение летом, результат "
            "может отличаться на 1 час."
        )
    except pytz.exceptions.NonExistentTimeError:
        # Время «пропало» при переходе на летнее
        localized = tz.localize(local_dt + timedelta(hours=1), is_dst=True)
        warning = (
            "⚠️ Это время не существовало из-за перевода часов. "
            "Автоматически скорректировано +1 час."
        )

    utc_dt = localized.astimezone(pytz.utc)
    return utc_dt, warning


def _whole_sign_house(sign: int, lagna_sign: int) -> int:
    """Дом планеты по системе whole sign (знак = дом) — стандарт джйотиш."""
    return ((sign - lagna_sign) % 12) + 1


def calc_charakarakas(planets: dict) -> dict:
    """
    Джаймини-каракары по градусу в знаке.
    АК (атмакарака)  = планета с максимальным градусом
    АмК (аматьякарака) = второй по убыванию
    Раху и Кету не участвуют.
    """
    eligible = [
        (code, pi.degree)
        for code, pi in planets.items()
        if code not in ('Ra', 'Ke')
    ]
    eligible.sort(key=lambda x: x[1], reverse=True)
    roles = ['AK', 'AmK', 'BK', 'MK', 'PiK', 'GK', 'DK']
    return {roles[i]: eligible[i][0] for i in range(min(len(roles), len(eligible)))}


# ── Главная функция ────────────────────────────────────────────────────────

def build_chart(
    year: int, month: int, day: int,
    hour: int, minute: int,
    city: str
) -> tuple[Chart, Optional[str]]:
    """
    Полный расчёт натальной карты.
    Возвращает (Chart, warning_or_None).
    """
    # 1. Координаты и timezone
    lat, lon, tz_name = geocode_city(city)

    # 2. Конвертация в UTC (с учётом исторических переходов)
    utc_dt, warning = local_to_utc(year, month, day, hour, minute, tz_name)

    # 3. Julian Day Number
    jd = swe.julday(
        utc_dt.year, utc_dt.month, utc_dt.day,
        utc_dt.hour + utc_dt.minute / 60.0 + utc_dt.second / 3600.0
    )

    # 4. Сидерический зодиак — аянамша Лахири (стандарт джйотиш)
    swe.set_sid_mode(swe.SIDM_LAHIRI)

    # 5. Дома и лагна (система Плацидус)
    cusps, ascmc = swe.houses_ex(jd, lat, lon, b'P', swe.FLG_SIDEREAL)
    lagna_lon    = ascmc[0]
    lagna_sign   = int(lagna_lon / 30) + 1
    lagna_degree = lagna_lon % 30

    # 6. Планеты
    planets = {}
    for code, swe_id in SWE_BODIES.items():
        pos, _ = swe.calc_ut(jd, swe_id, swe.FLG_SIDEREAL | swe.FLG_SPEED)
        lon_val = pos[0]
        speed   = pos[3]

        sign     = int(lon_val / 30) + 1
        degree   = lon_val % 30
        nak      = int(lon_val / (360 / 27)) + 1
        nav_sign = _navamsha_sign(sign, degree)

        planets[code] = PlanetInfo(
            code        = code,
            name_ru     = PLANETS_RU[code],
            longitude   = lon_val,
            sign        = sign,
            sign_ru     = SIGNS_RU[sign - 1],
            degree      = degree,
            house       = _whole_sign_house(sign, lagna_sign),
            retrograde  = (speed < 0 and code not in ('Ra', 'Ke')),
            nakshatra   = nak,
            nakshatra_ru = NAKSHATRAS_RU[nak - 1],
            nav_sign    = nav_sign,
            nav_sign_ru = SIGNS_RU[nav_sign - 1],
        )

    # 7. Кету = Раху + 180°
    rahu_lon  = planets['Ra'].longitude
    ketu_lon  = (rahu_lon + 180) % 360
    ke_sign   = int(ketu_lon / 30) + 1
    ke_degree = ketu_lon % 30
    ke_nav    = _navamsha_sign(ke_sign, ke_degree)

    planets['Ke'] = PlanetInfo(
        code        = 'Ke',
        name_ru     = 'Кету',
        longitude   = ketu_lon,
        sign        = ke_sign,
        sign_ru     = SIGNS_RU[ke_sign - 1],
        degree      = ke_degree,
        house       = _whole_sign_house(ke_sign, lagna_sign),
        retrograde  = False,
        nakshatra   = (ke_nak := int(ketu_lon / (360 / 27)) + 1),
        nakshatra_ru = NAKSHATRAS_RU[ke_nak - 1],
        nav_sign    = ke_nav,
        nav_sign_ru = SIGNS_RU[ke_nav - 1],
    )

    local_str = (
        f"{day:02d}.{month:02d}.{year} "
        f"{hour:02d}:{minute:02d} "
        f"({tz_name})"
    )

    nav_lagna_sign = _navamsha_sign(lagna_sign, lagna_degree)
    lagna_nak = int(lagna_lon / (360 / 27)) + 1

    chart = Chart(
        lagna           = lagna_sign,
        lagna_ru        = SIGNS_RU[lagna_sign - 1],
        lagna_degree    = lagna_degree,
        lagna_nakshatra = lagna_nak,
        lagna_nak_ru    = NAKSHATRAS_RU[lagna_nak - 1],
        nav_lagna       = nav_lagna_sign,
        nav_lagna_ru    = SIGNS_RU[nav_lagna_sign - 1],
        planets      = planets,
        house_cusps  = list(cusps),
        birth_utc    = utc_dt,
        birth_local  = local_str,
        city         = city,
        lat          = lat,
        lon          = lon,
    )

    return chart, warning
