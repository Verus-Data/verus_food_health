FROM python:3.11-slim AS builder

RUN pip install --no-cache-dir uv

WORKDIR /app
COPY pyproject.toml .
RUN uv sync --no-dev --frozen 2>/dev/null || uv pip install --system -r requirements.txt

FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
