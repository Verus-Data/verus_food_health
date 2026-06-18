FROM python:3.11-slim AS builder

RUN pip install --no-cache-dir uv

WORKDIR /app
COPY pyproject.toml requirements.txt ./
RUN uv pip install --system -r requirements.txt 2>/dev/null || pip install --no-cache-dir -r requirements.txt

FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    wget \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

RUN python -c "from transformers import AutoImageProcessor, AutoModelForImageClassification; \
    AutoModelForImageClassification.from_pretrained('matthijs/food-classifier'); \
    AutoImageProcessor.from_pretrained('matthijs/food-classifier')" || true

COPY . .

EXPOSE 8001

CMD ["python", "main.py"]
