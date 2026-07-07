"""Астронавигатор — публичный сайт-сервис (джйотиш без мистики).

Архитектура (ТЗ, раздел 1), три слоя:
  1) COMPUTE       — compute/*.py (сейчас заглушки, дальше pyswisseph)
  2) PRESENTATION  — маршруты страниц + шаблоны Jinja + static/
  3) INTERPRETATION— content/templates.yaml (тексты по ключу из слоя 1)

Один и тот же compute-модуль потом разделят бот и сайт (без дублирования).
"""
from pathlib import Path

import yaml
from flask import Flask, jsonify, render_template, request

from compute import natal, daily

BASE = Path(__file__).resolve().parent
app = Flask(__name__)


# --- Загрузка конфига и текстов (слои 1-параметры и 3) ---
def _load_yaml(rel: str) -> dict:
    with open(BASE / rel, encoding="utf-8") as f:
        return yaml.safe_load(f)


SCORING = _load_yaml("config/scoring.yaml")
TEMPLATES = _load_yaml("content/templates.yaml")


def _first(items):
    """Первый вариант из списка шаблонов (в проде — выбор по ключу/ротация)."""
    return items[0] if isinstance(items, list) and items else items


# --- PRESENTATION: страницы ---
@app.route("/")
def index():
    return render_template("index.html")


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


# --- COMPUTE + INTERPRETATION: API ---
@app.route("/api/calculate", methods=["POST"])
def api_calculate():
    """Натальный расчёт (каскад Даш). ЗАГЛУШКА."""
    birth = request.get_json(silent=True) or {}
    data = natal.calculate(birth)

    # Слой 3: подставить тексты фона к плашкам каскада
    c = data["cascade"]
    md = c["mahadasha"]
    md_tpl = TEMPLATES["mahadasha"][md["ruler"]]
    md["background"] = md_tpl["short"]
    md["background_full"] = md_tpl["full"]
    ad = c["antardasha"]
    ad_tpl = TEMPLATES["antardasha"][ad["ruler"]]
    ad["background"] = ad_tpl["short"]
    ad["background_full"] = ad_tpl["full"]
    return jsonify(data)


@app.route("/api/daily", methods=["GET"])
def api_daily():
    """Дневной слой + прогноз на 7 дней. ЗАГЛУШКА."""
    birth = {
        "date": request.args.get("date", ""),
        "time": request.args.get("time", ""),
        "place": request.args.get("place", ""),
        "residence": request.args.get("residence", ""),
    }
    data = daily.calculate(birth, SCORING, days=7)

    # Слой 3: тексты к блоку «Сегодня»
    t = data["today"]
    grade = t["grade"]
    t["badge_text"] = TEMPLATES["badge"][grade]
    t["tara_word"] = TEMPLATES["tara_word"][t["tara"]]
    t["in_flow"] = _first(TEMPLATES["in_flow"][grade])
    t["with_care"] = _first(TEMPLATES["with_care"][grade])
    return jsonify(data)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
