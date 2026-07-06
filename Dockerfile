FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
        netcat \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN groupadd -r app && useradd -r -g app app
RUN chown -R app:app /app

USER app
EXPOSE 8000
CMD ["sh", "-c", "while ! nc -z db 5432; do echo 'Waiting for db'; sleep 2; done; uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2"]