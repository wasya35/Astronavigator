"""Натальный слой (каскад Даш).

ЗАГЛУШКА. На следующем этапе — расчёт Вимшоттари-даши через pyswisseph,
переиспользуя движок бота. Форма ответа фиксирована.
"""
from ._util import seed_int, pick

# Управители Вимшоттари-даши (ключи совпадают с content/templates.yaml)
_RULERS = ["ketu", "venus", "sun", "moon", "mars",
           "rahu", "jupiter", "saturn", "mercury"]
_RULER_RU = {
    "ketu": "Кету", "venus": "Венера", "sun": "Солнце", "moon": "Луна",
    "mars": "Марс", "rahu": "Раху", "jupiter": "Юпитер",
    "saturn": "Сатурн", "mercury": "Меркурий",
}


def calculate(birth: dict) -> dict:
    """birth: {date, time, place, time_unknown} -> натальный каскад.

    ЭТАП 1 (MVP): считаются только Махадаша и Антардаша.
    Мунтха и Мудда-даша (плашки 3-4) — этап 2 (Варшапхала), пока None.
    """
    s = seed_int(birth.get("date"), birth.get("time"), birth.get("place"))
    maha = pick(s, _RULERS)
    antar = pick(s // 7, _RULERS)

    return {
        "profile": {
            "name": birth.get("name") or "Гость",
            "residence": birth.get("residence") or birth.get("place") or "",
            "time_unknown": bool(birth.get("time_unknown")),
        },
        "cascade": {
            "mahadasha": {
                "ruler": maha, "ruler_ru": _RULER_RU[maha],
                "ends": f"{2027 + (s % 6)}",
                "needs_time": bool(birth.get("time_unknown")),
            },
            "antardasha": {
                "ruler": antar, "ruler_ru": _RULER_RU[antar],
                "ends": pick(s, ["март", "май", "август", "ноябрь"]) + f" {2026 + (s % 2)}",
                "needs_time": bool(birth.get("time_unknown")),
            },
            # Этап 2 (Варшапхала) — заглушены осознанно:
            "year_muntha": None,
            "weeks_window": None,
        },
        "_stub": True,
    }
