"""
adapter.py — мост между движком (перенесён из бота) и фронтом.
Оборачивает натальный расчёт и Вимшоттари-дашу в JSON-совместимые dict.

Геокодинг: сначала штатные провайдеры движка (Open-Meteo → Nominatim),
при недоступности — локальный справочник основных городов (офлайн-фолбэк,
чтобы сервис не падал и работал в средах без выхода к геосервисам).
"""
from datetime import datetime, timedelta, timezone

from . import astro_engine as ae
from . import dasha_calc

_DAYS_PER_YEAR = 365.25

# code -> ключ в content/templates.yaml
RULER_KEY = {
    'Ke': 'ketu', 'Ve': 'venus', 'Su': 'sun', 'Mo': 'moon', 'Ma': 'mars',
    'Ra': 'rahu', 'Ju': 'jupiter', 'Sa': 'saturn', 'Me': 'mercury',
}

# Офлайн-фолбэк: (lat, lon, IANA-tz). Дополняется по мере надобности.
LOCAL_CITIES = {
    'нерюнгри': (56.6588, 124.7208, 'Asia/Yakutsk'),
    'москва': (55.7558, 37.6173, 'Europe/Moscow'),
    'санкт-петербург': (59.9391, 30.3159, 'Europe/Moscow'),
    'питер': (59.9391, 30.3159, 'Europe/Moscow'),
    'новосибирск': (55.0084, 82.9357, 'Asia/Novosibirsk'),
    'екатеринбург': (56.8389, 60.6057, 'Asia/Yekaterinburg'),
    'якутск': (62.0339, 129.7331, 'Asia/Yakutsk'),
    'владивосток': (43.1155, 131.8855, 'Asia/Vladivostok'),
    'краснодар': (45.0355, 38.9753, 'Europe/Moscow'),
    'казань': (55.7963, 49.1088, 'Europe/Moscow'),
    'киев': (50.4501, 30.5234, 'Europe/Kyiv'),
    'минск': (53.9006, 27.5590, 'Europe/Minsk'),
    'алматы': (43.2380, 76.9452, 'Asia/Almaty'),
}

_orig_geocode = ae.geocode_city


def _geocode_with_fallback(city: str):
    try:
        return _orig_geocode(city)
    except Exception:
        key = (city or '').strip().lower().split(',')[0].strip()
        if key in LOCAL_CITIES:
            return LOCAL_CITIES[key]
        raise


# Внедряем фолбэк в движок (build_chart зовёт module-level geocode_city).
ae.geocode_city = _geocode_with_fallback


def _parse_birth(birth: dict):
    """{date:'ДД.ММ.ГГГГ', time:'ЧЧ:ММ', place, ...} -> компоненты."""
    d, m, y = [int(x) for x in birth['date'].replace('/', '.').split('.')]
    tstr = (birth.get('time') or '12:00').strip()
    hh, mm = [int(x) for x in tstr.split(':')] if ':' in tstr else (12, 0)
    return y, m, d, hh, mm, birth['place']


def _planet_json(pi):
    return {
        'code': pi.code, 'name_ru': pi.name_ru,
        'sign': pi.sign, 'sign_ru': pi.sign_ru,
        'degree': round(pi.degree, 2), 'house': pi.house,
        'retrograde': pi.retrograde,
        'nakshatra_ru': pi.nakshatra_ru,
        'nav_sign': pi.nav_sign, 'nav_sign_ru': pi.nav_sign_ru,
    }


def _period_row(p):
    """DashaPeriod -> dict с ключом шаблона."""
    return {
        'ruler': RULER_KEY[p.planet], 'ruler_ru': p.planet_ru,
        'start': p.start_str, 'end': p.end_str,
        'years': p.years, 'is_current': p.is_current,
    }


def _pratyantardashas(antara) -> list:
    """Пратьянтар-даша (3-й уровень) внутри текущей антардаши.

    Та же вложенная пропорция Вимшоттари, на уровень глубже.
    Начинается с управителя антардаши.
    """
    order = dasha_calc.DASHA_ORDER
    years = dasha_calc.DASHA_YEARS
    ru = dasha_calc.PLANETS_RU
    now = datetime.now(timezone.utc)

    lord_idx = order.index(antara.planet)
    total = antara.years  # длительность антардаши в годах
    out = []
    cur = antara.start
    for i in range(9):
        p = order[(lord_idx + i) % 9]
        yrs = (years[p] / 120.0) * total
        end = cur + timedelta(days=yrs * _DAYS_PER_YEAR)
        out.append({
            'ruler': RULER_KEY[p], 'ruler_ru': ru[p],
            'start': cur.strftime('%m.%Y'), 'end': end.strftime('%m.%Y'),
            'years': round(yrs, 2), 'is_current': (cur <= now <= end),
        })
        cur = end
    return out


def periods_json(birth: dict) -> dict:
    """Каскад Вимшоттари: махадаши, антардаши текущей махи, пратьянтар текущей антары."""
    y, m, d, hh, mm, city = _parse_birth(birth)
    chart, warning = ae.build_chart(y, m, d, hh, mm, city)
    dd = dasha_calc.calc_vimshottari(chart.planets['Mo'].longitude, chart.birth_utc)

    return {
        'profile': {
            'name': birth.get('name') or 'Гость',
            'residence': birth.get('residence') or city,
        },
        'birth': {'local': chart.birth_local, 'city': chart.city},
        'mahadashas': [_period_row(p) for p in dd['mahadashas']],
        'current_maha': _period_row(dd['current_maha']),
        'antardashas': [_period_row(p) for p in dd['antardashas']],
        'current_antara': _period_row(dd['current_antara']),
        'pratyantardashas': _pratyantardashas(dd['current_antara']),
        'warning': warning,
    }


def natal_json(birth: dict) -> dict:
    """Полный натальный расчёт -> JSON (лагна, планеты, Навамша, махадаша)."""
    y, m, d, hh, mm, city = _parse_birth(birth)
    chart, warning = ae.build_chart(y, m, d, hh, mm, city)
    dd = dasha_calc.calc_vimshottari(chart.planets['Mo'].longitude, chart.birth_utc)

    maha = dd['current_maha']
    antar = dd['current_antara']
    cascade = {
        'mahadasha': {
            'ruler': RULER_KEY[maha.planet], 'ruler_ru': maha.planet_ru,
            'ends': maha.end.strftime('%m.%Y'),
        },
        'antardasha': {
            'ruler': RULER_KEY[antar.planet], 'ruler_ru': antar.planet_ru,
            'ends': antar.end.strftime('%m.%Y'),
        },
    }

    return {
        'profile': {
            'name': birth.get('name') or 'Гость',
            'residence': birth.get('residence') or city,
            'time_unknown': bool(birth.get('time_unknown')),
        },
        'birth': {
            'local': chart.birth_local, 'city': chart.city,
            'lat': round(chart.lat, 4), 'lon': round(chart.lon, 4),
        },
        'lagna': {
            'sign': chart.lagna, 'sign_ru': chart.lagna_ru,
            'degree': round(chart.lagna_degree, 2),
            'nav_sign_ru': chart.nav_lagna_ru,
            'nakshatra_ru': chart.lagna_nak_ru,
        },
        'planets': {c: _planet_json(pi) for c, pi in chart.planets.items()},
        'cascade': cascade,
        'mahadashas': [
            {'ruler_ru': p.planet_ru, 'start': p.start_str, 'end': p.end_str,
             'years': p.years, 'is_current': p.is_current}
            for p in dd['mahadashas']
        ],
        'warning': warning,
    }
