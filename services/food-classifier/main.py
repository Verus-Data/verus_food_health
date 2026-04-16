from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from transformers import AutoImageProcessor, AutoModelForImageClassification
from PIL import Image
import torch
import io
import logging
from typing import List, Dict
from pydantic import BaseModel

from food_to_ingredients import FOOD_101_TO_INGREDIENTS

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Food Classifier Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = None
processor = None
device = None


class ClassificationResult(BaseModel):
    dish: str
    confidence: float
    ingredients: List[str]


class ClassifyResponse(BaseModel):
    predictions: List[ClassificationResult]
    service_version: str


class IngredientsResponse(BaseModel):
    dish: str
    confidence: float
    ingredients: List[Dict[str, str]]
    service_version: str


@app.on_event("startup")
async def load_model():
    global model, processor, device
    try:
        logger.info("Loading Food-101 model...")
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        logger.info(f"Using device: {device}")

        model = AutoModelForImageClassification.from_pretrained(
            "torch/food-classifier", local_files_only=True
        )
        processor = AutoImageProcessor.from_pretrained(
            "torch/food-classifier", local_files_only=True
        )
        model.to(device)
        model.eval()
        logger.info("Food-101 model loaded successfully")
    except Exception as e:
        logger.warning(f"Could not load model from cache, will try huggingface: {e}")
        try:
            model = AutoModelForImageClassification.from_pretrained(
                "matthijs/food-classifier", local_files_only=False
            )
            processor = AutoImageProcessor.from_pretrained(
                "matthijs/food-classifier", local_files_only=False
            )
            model.to(device)
            model.eval()
            logger.info("Food-101 model loaded from HuggingFace")
        except Exception as e2:
            logger.error(f"Failed to load model: {e2}")
            model = None
            processor = None


@app.get("/health")
async def health_check():
    return {
        "status": "healthy" if model is not None else "degraded",
        "model_loaded": model is not None,
        "device": str(device) if device else None,
    }


@app.post("/classify", response_model=ClassifyResponse)
async def classify_food(file: UploadFile = File(...)):
    if model is None or processor is None:
        raise HTTPException(
            status_code=503, detail="AI model not available. Please use manual entry."
        )

    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")

        inputs = processor(images=image, return_tensors="pt")
        inputs = {k: v.to(device) for k, v in inputs.items()}

        with torch.no_grad():
            outputs = model(**inputs)
            logits = outputs.logits
            probabilities = torch.nn.functional.softmax(logits[0], dim=-1)
            top5_prob, top5_indices = torch.topk(probabilities, 5)

        predictions = []
        for i in range(5):
            idx = top5_indices[i].item()
            conf = top5_prob[i].item()
            label = model.config.id2label.get(idx, "unknown")
            ingredients = FOOD_101_TO_INGREDIENTS.get(label, [])
            predictions.append(
                {
                    "dish": label,
                    "confidence": round(conf, 4),
                    "ingredients": ingredients,
                }
            )

        return ClassifyResponse(predictions=predictions, service_version="1.0.0")

    except Exception as e:
        logger.error(f"Classification error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/ingredients", response_model=IngredientsResponse)
async def predict_ingredients(file: UploadFile = File(...)):
    if model is None or processor is None:
        raise HTTPException(
            status_code=503, detail="AI model not available. Please use manual entry."
        )

    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")

        inputs = processor(images=image, return_tensors="pt")
        inputs = {k: v.to(device) for k, v in inputs.items()}

        with torch.no_grad():
            outputs = model(**inputs)
            logits = outputs.logits
            probabilities = torch.nn.functional.softmax(logits[0], dim=-1)
            top1_prob, top1_idx = torch.topk(probabilities, 1)

        top_label = model.config.id2label.get(top1_idx[0].item(), "unknown")
        top_conf = top1_prob[0].item()

        ingredient_list = FOOD_101_TO_INGREDIENTS.get(top_label, [])
        ingredients_with_conf = [
            {"name": ing, "confidence": 0.8, "source": "ai"} for ing in ingredient_list
        ]

        return IngredientsResponse(
            dish=top_label,
            confidence=round(top_conf, 4),
            ingredients=ingredients_with_conf,
            service_version="1.0.0",
        )

    except Exception as e:
        logger.error(f"Ingredient prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001)
