# ПЕРЕНЕСЕНО ИЗ БОТА (wasya35/Dliotish1). Не редактировать здесь без синхронизации с ботом.
# TODO: вынести в общий пакет, чтобы бот и сайт не дублировали логику (см. ROADMAP).
"""
dasha.py
Расчёт Вимшоттари Даши: маха-даша, антардаша.
Основа: накшатра Луны на момент рождения.
"""
from datetime import datetime, timedelta, timezone
from dataclasses import dataclass

# ── Константы ──────────────────────────────────────────────────────────────

DASHA_ORDER = ['Ke', 'Ve', 'Su', 'Mo', 'Ma', 'Ra', 'Ju', 'Sa', 'Me']

DASHA_YEARS = {
    'Ke': 7,  'Ve': 20, 'Su': 6,  'Mo': 10, 'Ma': 7,
    'Ra': 18, 'Ju': 16, 'Sa': 19, 'Me': 17,
}

PLANETS_RU = {
    'Su':'Солнце', 'Mo':'Луна', 'Ma':'Марс', 'Me':'Меркурий',
    'Ju':'Юпитер', 'Ve':'Венера', 'Sa':'Сатурн',
    'Ra':'Раху',   'Ke':'Кету',
}

NAK_SPAN = 360 / 27      # 13.333...° на накшатру
DAYS_PER_YEAR = 365.25


# ── Dataclass ──────────────────────────────────────────────────────────────

@dataclass
class DashaPeriod:
    planet:     str
    planet_ru:  str
    start:      datetime
    end:        datetime
    is_current: bool
    years:      float

    @property
    def start_str(self) -> str:
        return self.start.strftime("%m.%Y")

    @property
    def end_str(self) -> str:
        return self.end.strftime("%m.%Y")


# ── Основной расчёт ────────────────────────────────────────────────────────

def calc_vimshottari(moon_longitude: float, birth_utc: datetime) -> dict:
    """
    Вимшоттари Даша по долготе Луны и дате рождения (UTC).

    Возвращает:
    {
      'mahadashas':     [DashaPeriod × 9],
      'current_maha':   DashaPeriod,
      'antardashas':    [DashaPeriod × 9]  — внутри текущей маха-даши,
      'current_antara': DashaPeriod,
    }
    """
    now = datetime.now(timezone.utc)

    # ── Накшатра Луны и стартовая даша ────────────────────────────────────
    nak_num   = int(moon_longitude / NAK_SPAN)          # 0–26
    lord_idx  = nak_num % 9                              # 0–8 в DASHA_ORDER
    lord      = DASHA_ORDER[lord_idx]

    # Доля накшатры, пройденная Луной → прошедшая часть первой дашы
    nak_start        = nak_num * NAK_SPAN
    elapsed_in_nak   = moon_longitude - nak_start
    elapsed_fraction = elapsed_in_nak / NAK_SPAN
    remaining_years  = DASHA_YEARS[lord] * (1 - elapsed_fraction)

    # ── 9 маха-даш ─────────────────────────────────────────────────────────
    mahadashas = []
    cur = birth_utc

    for i in range(9):
        p     = DASHA_ORDER[(lord_idx + i) % 9]
        years = remaining_years if i == 0 else DASHA_YEARS[p]
        end   = cur + timedelta(days=years * DAYS_PER_YEAR)

        mahadashas.append(DashaPeriod(
            planet     = p,
            planet_ru  = PLANETS_RU[p],
            start      = cur,
            end        = end,
            is_current = (cur <= now <= end),
            years      = round(years, 2),
        ))
        cur = end

    current_maha = next((d for d in mahadashas if d.is_current), mahadashas[-1])
    cur_idx      = mahadashas.index(current_maha)
    previous_maha = mahadashas[cur_idx - 1] if cur_idx > 0 else None

    # ── Антардаши внутри текущей маха-дашы ────────────────────────────────
    maha_lord_idx  = DASHA_ORDER.index(current_maha.planet)
    total_maha_yrs = DASHA_YEARS[current_maha.planet]

    antardashas = []
    ad_cur = current_maha.start

    for i in range(9):
        ap      = DASHA_ORDER[(maha_lord_idx + i) % 9]
        ad_yrs  = (DASHA_YEARS[ap] / 120) * total_maha_yrs
        ad_end  = ad_cur + timedelta(days=ad_yrs * DAYS_PER_YEAR)

        antardashas.append(DashaPeriod(
            planet     = ap,
            planet_ru  = PLANETS_RU[ap],
            start      = ad_cur,
            end        = ad_end,
            is_current = (ad_cur <= now <= ad_end),
            years      = round(ad_yrs, 2),
        ))
        ad_cur = ad_end

    current_antara = next((d for d in antardashas if d.is_current), antardashas[-1])

    return {
        'mahadashas':     mahadashas,
        'current_maha':   current_maha,
        'previous_maha':  previous_maha,
        'antardashas':    antardashas,
        'current_antara': current_antara,
    }


def format_dasha_timeline(dasha_data: dict) -> str:
    """Форматирует цепочку маха-даш для вывода пользователю."""
    lines = []
    now = datetime.now(timezone.utc)

    for d in dasha_data['mahadashas']:
        marker = "▶ " if d.is_current else "  "
        past   = "✓ " if d.end < now and not d.is_current else ""
        lines.append(
            f"{past}{marker}{d.planet_ru}: "
            f"{d.start_str} — {d.end_str} ({d.years:.1f} лет)"
        )

    return "\n".join(lines)
