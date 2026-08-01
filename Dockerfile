FROM python:3.11-slim

WORKDIR /app

# libsqlite3 как страховка; manylinux-колесо pyswisseph везёт своё.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libsqlite3-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Слушаем фиксированно 8080 (совпадает с EXPOSE и с портом, который
# площадка обнаруживает и проверяет healthcheck-ом).
# --preload: импорт приложения один раз в мастере -> быстрее старт, меньше памяти.
EXPOSE 8080
CMD ["gunicorn", "app:app", "--bind", "0.0.0.0:8080", "--workers", "2", \
     "--timeout", "120", "--preload", "--access-logfile", "-", "--error-logfile", "-"]
