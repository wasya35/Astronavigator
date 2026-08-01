FROM python:3.11-slim

WORKDIR /app

# libsqlite3 — страховка (manylinux-колесо pyswisseph везёт своё);
# curl/wget нужны площадке для проверки здоровья контейнера (slim их не содержит).
RUN apt-get update \
    && apt-get install -y --no-install-recommends libsqlite3-0 curl wget \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Слушаем фиксированно 8080 (совпадает с EXPOSE и с портом, который
# площадка обнаруживает и проверяет healthcheck-ом).
# --preload: импорт приложения один раз в мастере -> быстрее старт, меньше памяти.
EXPOSE 8080

# Явная проверка здоровья: curl теперь есть в образе.
HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=5 \
    CMD curl -fsS http://localhost:8080/healthz || exit 1

CMD ["gunicorn", "app:app", "--bind", "0.0.0.0:8080", "--workers", "2", \
     "--timeout", "120", "--preload", "--access-logfile", "-", "--error-logfile", "-"]
