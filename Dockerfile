FROM python:3.11-slim

WORKDIR /app

# libsqlite3 как страховка; manylinux-колесо pyswisseph везёт своё.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libsqlite3-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Площадка обычно задаёт порт через $PORT; иначе слушаем 8080.
EXPOSE 8080
CMD ["sh", "-c", "gunicorn app:app --bind 0.0.0.0:${PORT:-8080} --workers 2"]
