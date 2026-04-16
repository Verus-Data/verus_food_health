FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    wget \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

RUN python -c "from transformers import AutoImageProcessor, AutoModelForImageClassification; \
    AutoModelForImageClassification.from_pretrained('matthijs/food-classifier'); \
    AutoImageProcessor.from_pretrained('matthijs/food-classifier')" || true

COPY . .

EXPOSE 8001

CMD ["python", "main.py"]