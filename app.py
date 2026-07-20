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


def _first(items):
    return items[0] if isinstance(items, list) and items else items


# ── PRESENTATION: страницы ──────────────────────────────────────────────
@app.route("/")
def index():
    # Страница 1 — публичная: «небо на сейчас» + шкала времени
    return render_template("index.html")


@app.route("/settings")
def settings():
    # Бесплатные настройки: ввод данных + блок махадаш
    return render_template("settings.html")


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
    data["drishti"] = aspects.compute(data["planets"], ASPECT_RULES)
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
