"""Астронавигатор — публичный сайт-сервис (джйотиш без мистики).

Архитектура (ТЗ, раздел 1), три слоя:
  1) COMPUTE       — compute/ (движок перенесён из бота Dliotish1: pyswisseph, Лахири)
  2) PRESENTATION  — маршруты страниц + шаблоны Jinja + static/
  3) INTERPRETATION— content/templates.yaml (тексты по ключу из слоя 1)
"""
from datetime import datetime, timezone
from pathlib import Path

import yaml
from flask import Flask, jsonify, render_template, request

from compute import transits, adapter, aspects, daily  # daily — заглушка навигатора дня

BASE = Path(__file__).resolve().parent
app = Flask(__name__)


def _load_yaml(rel: str) -> dict:
    with open(BASE / rel, encoding="utf-8") as f:
        return yaml.safe_load(f)


SCORING = _load_yaml("config/scoring.yaml")
TEMPLATES = _load_yaml("content/templates.yaml")
ASPECT_RULES = _load_yaml("config/aspects.yaml")
NAKSHATRA = _load_yaml("content/nakshatra.yaml")


def _first(items):
    return items[0] if isinstance(items, list) and items else items


# ── PRESENTATION: страницы ──────────────────────────────────────────────
@app.route("/healthz")
def healthz():
    # Лёгкая проверка живости для healthcheck площадки (быстрый 200)
    return "ok", 200


@app.route("/")
def index():
    # Страница 1 — публичная: «небо на сейчас» + шкала времени
    return render_template("index.html")


@app.route("/settings")
def settings():
    # Бесплатные настройки: ввод данных + блок махадаш
    return render_template("settings.html")


@app.route("/periods")
def periods():
    # Страница 3 — каскад даш (по подписке; пока демо-открыта)
    return render_template("periods.html")


@app.route("/navigator")
def navigator():
    return render_template("navigator.html")


@app.route("/method")
def method():
    return render_template("method.html")


@app.route("/order")
def order():
    return render_template("order.html")


@app.route("/privacy")
def privacy():
    return render_template("legal.html", title="Политика конфиденциальности",
                           note="Заглушка. Финальный текст по 152-ФЗ — от владельца.")


@app.route("/offer")
def offer():
    return render_template("legal.html", title="Публичная оферта",
                           note="Заглушка. Финальный текст оферты — от владельца.")


# ── COMPUTE + INTERPRETATION: API ───────────────────────────────────────
@app.route("/api/sky", methods=["GET"])
def api_sky():
    """Небо на сейчас или со смещением в днях (шкала времени). Для стр. 1."""
    try:
        offset = float(request.args.get("offset", 0))
    except (TypeError, ValueError):
        offset = 0
    data = transits.sky_offset(offset)

    # Слой 3: рекомендации по накшатре Луны
    nak = NAKSHATRA.get(data["moon"]["nakshatra"], {})
    data["moon"]["nature"] = nak.get("nature", "")
    data["moon"]["good"] = nak.get("good", [])
    data["moon"]["avoid"] = nak.get("avoid", [])

    dr = aspects.compute(data["planets"], ASPECT_RULES)

    # Слой 3: краткие пояснения к аспектам (по природе аспекта)
    atext = TEMPLATES.get("aspects", {})
    by_planet = atext.get("by_planet", {})
    for a in dr["aspects"]:
        a["note"] = atext.get("seventh", "") if a["distance"] == 7 else by_planet.get(a["from"], "")
    for c in dr["conjunctions"]:
        c["note"] = atext.get("conjunction", "")

    data["drishti"] = dr
    return jsonify(data)


@app.route("/api/calculate", methods=["POST"])
def api_calculate():
    """Реальный натальный расчёт (движок): лагна, планеты, махадаша."""
    birth = request.get_json(silent=True) or {}
    if not birth.get("date") or not birth.get("place"):
        return jsonify({"error": "Нужны дата рождения и место рождения."}), 400
    try:
        data = adapter.natal_json(birth)
    except Exception as e:
        return jsonify({"error": f"Не удалось рассчитать: {e}"}), 422

    # Слой 3: тексты фона к плашкам каскада
    c = data["cascade"]
    md_tpl = TEMPLATES["mahadasha"][c["mahadasha"]["ruler"]]
    c["mahadasha"]["background"] = md_tpl["short"]
    c["mahadasha"]["background_full"] = md_tpl["full"]
    ad_tpl = TEMPLATES["antardasha"][c["antardasha"]["ruler"]]
    c["antardasha"]["background"] = ad_tpl["short"]
    c["antardasha"]["background_full"] = ad_tpl["full"]
    return jsonify(data)


@app.route("/api/periods", methods=["POST"])
def api_periods():
    """Каскад Вимшоттари (Маха/Антар/Пратьянтар) + советы. Для стр. 3."""
    birth = request.get_json(silent=True) or {}
    if not birth.get("date") or not birth.get("place"):
        return jsonify({"error": "Нужны дата рождения и место рождения."}), 400
    try:
        data = adapter.periods_json(birth)
    except Exception as e:
        return jsonify({"error": f"Не удалось рассчитать: {e}"}), 422

    maha_t = TEMPLATES["mahadasha"]
    antar_t = TEMPLATES["antardasha"]

    for row in data["mahadashas"]:
        row["background"] = maha_t.get(row["ruler"], {}).get("short", "")
    for row in data["antardashas"]:
        row["background"] = antar_t.get(row["ruler"], {}).get("short", "")
    for row in data["pratyantardashas"]:
        row["background"] = antar_t.get(row["ruler"], {}).get("short", "")

    # Советы по текущим периодам (2-3 предложения)
    cm = data["current_maha"]
    cm["advice"] = maha_t.get(cm["ruler"], {}).get("full", "")
    ca = data["current_antara"]
    ca["advice"] = antar_t.get(ca["ruler"], {}).get("full", "")
    return jsonify(data)


@app.route("/api/daily", methods=["GET"])
def api_daily():
    """Дневной слой навигатора (пока заглушка; движок дня — отдельный шаг)."""
    birth = {k: request.args.get(k, "") for k in ("date", "time", "place", "residence")}
    data = daily.calculate(birth, SCORING, days=7)
    t = data["today"]
    grade = t["grade"]
    t["badge_text"] = TEMPLATES["badge"][grade]
    t["tara_word"] = TEMPLATES["tara_word"][t["tara"]]
    t["in_flow"] = _first(TEMPLATES["in_flow"][grade])
    t["with_care"] = _first(TEMPLATES["with_care"][grade])
    return jsonify(data)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
