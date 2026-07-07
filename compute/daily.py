"""Дневной слой (/api/daily).

ЗАГЛУШКА. На следующем этапе — транзит Луны через pyswisseph:
знак/градус Луны сидерически, накшатра, Чандра-бала, Тара-бала.
Форма ответа фиксирована; оценка считается из config/scoring.yaml
уже сейчас, чтобы формула не переписывалась при подключении движка.
"""
from ._util import seed_int, pick

_SIGNS = ["Овен", "Телец", "Близнецы", "Рак", "Лев", "Дева", "Весы",
          "Скорпион", "Стрелец", "Козерог", "Водолей", "Рыбы"]
_NAKSHATRAS = [
    "Ашвини", "Бхарани", "Криттика", "Рохини", "Мригашира", "Ардра",
    "Пунарвасу", "Пушья", "Ашлеша", "Магха", "Пурва Пхалгуни", "Уттара Пхалгуни",
    "Хаста", "Читра", "Свати", "Вишакха", "Анурадха", "Джйештха",
    "Мула", "Пурва Ашадха", "Уттара Ашадха", "Шравана", "Дхаништха",
    "Шатабхиша", "Пурва Бхадрапада", "Уттара Бхадрапада", "Ревати",
]


def _grade_for(score: int, cfg: dict) -> dict:
    for g in cfg["grades"]:
        if g["min"] <= score <= g["max"]:
            return g
    return cfg["grades"][-1]


def _score_day(chandra_pos: int, tara: int, cfg: dict) -> dict:
    cb = cfg["chandra_bala"][chandra_pos]
    tb = cfg["tara_bala"][tara]
    w = cfg["weights"]
    score = round(cb * w["chandra"] + tb * w["tara"])
    grade = _grade_for(score, cfg)
    return {
        "score": score,
        "chandra_score": cb,
        "tara_score": tb,
        "grade": grade["code"],
        "color": grade["color"],
        "grade_label": grade["label"],
    }


def _day_payload(birth: dict, day_offset: int, cfg: dict) -> dict:
    s = seed_int(birth.get("date"), birth.get("place"), "day", day_offset)
    sign = pick(s, _SIGNS)
    nak_idx = s % 27
    chandra_pos = (s % 12) + 1          # 1..12 позиция от натальной Луны
    tara = (s % 9) + 1                  # 1..9 тара
    natal_moon_house = ((s // 3) % 12) + 1
    scored = _score_day(chandra_pos, tara, cfg)
    return {
        "offset": day_offset,
        "moon_sign": sign,
        "moon_from_natal": natal_moon_house,
        "nakshatra": _NAKSHATRAS[nak_idx],
        "chandra_bala": chandra_pos,
        "tara": tara,
        **scored,
    }


def calculate(birth: dict, cfg: dict, days: int = 7) -> dict:
    """birth + config -> дневной слой на сегодня + прогноз на N дней.

    В проде это отдаётся из суточного кэша SQLite (крон предрассчитывает
    ≤27 комбинаций на день). Здесь считается на лету — заглушка.
    """
    today = _day_payload(birth, 0, cfg)
    week = [_day_payload(birth, i, cfg) for i in range(days)]
    return {"today": today, "week": week, "_stub": True}
