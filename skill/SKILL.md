---
name: food-health-analyzer
description: Analyze food images to extract ingredients, nutritional data, and correlate with health outcomes (bowel movements, energy levels, etc.). Supports weak label datasets, ingredient recognition, and health impact prediction.
tools:
  - web_fetch
  - web_search
  - image
  - exec
  - read
  - write
  - edit
---

# Food Health Analyzer

Analyze food images to understand dietary impact on health. Extract ingredients, estimate nutrition, and correlate with health outcomes like bowel movements, energy levels, and symptoms.

## Use Cases

- Process folder of food images with weak/uncertain labels
- Extract ingredients from food photos (manual or AI-assisted)
- Correlate food intake with health outcomes (BM, energy, symptoms)
- Build predictive models for dietary triggers
- Generate health insights from eating patterns

## Data Sources

### Public Datasets for Training/Transfer Learning

| Dataset | Size | Health Data | Link |
|---------|------|-------------|------|
| **Nutrition5k** | 5k plates | Full nutrition + ingredient mass | github.com/google-research-datasets/Nutrition5k |
| **SNAPMe** | 3,311 photos | Paired with ASA24 dietary records | USDA ARS (DOI: 10.15482/USDA.ADC/1528346) |
| **FoodLogAthl-218** | 6,925 images | Real meal logs from dietary app | huggingface.co/datasets/FoodLog/FoodLogAthl-218 |
| **AI4Food-NutritionDB** | 4,800 weekly behaviors | Health index + eating profiles | arxiv.org/abs/2309.06308 |
| **ACETADA** | Dietitian-verified | GPS + timestamp metadata | arxiv.org/abs/2507.07048 |

### Pre-trained Models

| Model | Task | Platform |
|-------|------|----------|
| openfoodfacts/ingredient-detection | Ingredient OCR | Hugging Face |
| SunnyAgarwal4274/Food_Ingredient_classification_51 | 51 ingredients | Hugging Face |
| Hiratax/food-recognition-model | 256 food categories | Hugging Face |
| sirunchained/Food-101-image-classifier | 101 dishes | Hugging Face |

## Workflow

### Phase 1: Image Processing
1. **Batch Load**: Load folder of food images
2. **Preprocess**: Resize, normalize, augmentation
3. **Ingredient Extraction**: Run vision model (Clarifai/Edamam/custom)
4. **Label**: Store extracted ingredients as structured data

### Phase 2: Health Correlation
1. **Log Outcomes**: Track BM, energy, symptoms with timestamps
2. **Time Window**: Correlate food within 24-48 hour window
3. **Pattern Detection**: Identify trigger foods
4. **Prediction**: Build simple classifier for symptoms

### Phase 3: Analysis
1. **Statistics**: Frequency analysis of ingredients vs outcomes
2. **Visualization**: Timeline charts, correlation heatmaps
3. **Insights**: Generate personalized dietary recommendations

## Implementation Approaches

### Option A: Manual + AI Hybrid (Recommended for MVP)
- User reviews AI-extracted ingredients
- Confirms/corrects before saving
- Higher accuracy, human-in-the-loop

### Option B: Full Auto (Phase 2)
- Pure AI extraction
- Accepts ~70-80% accuracy
- Scales better, needs validation

## Local Tools Available

- `image` - Analyze single or batch images with vision models
- `web_fetch` - Query nutrition APIs (Edamam, USDA FoodData Central)
- `exec` - Run Python scripts for preprocessing/analysis

## External APIs (Cloud)

| Service | Use | Cost |
|---------|-----|------|
| **Edamam Food API** | Ingredient parsing, nutrition | Free tier: 10k calls/month |
| **Clarifai Food Model** | Visual food recognition | Pay per image |
| **USDA FoodData Central** | Nutrition data | Free |
| **OpenAI Vision** | General food analysis | Pay per token |

## References

- [USDA SNAPMe Study](https://doi.org/10.15482/USDA.ADC/1528346) - Benchmark dataset
- [FoodLogAthl-218](https://huggingface.co/datasets/FoodLog/FoodLogAthl-218) - Real-world meal dataset
- [AI4Food Framework](https://arxiv.org/abs/2309.06308) - Synthetic eating behavior generation
- [ACETADA Benchmark](https://arxiv.org/abs/2507.07048) - Context-aware nutrition analysis

## Notes

- Start with manual ingredient tagging for highest accuracy
- AI extraction (Clarifai/Edamam) for Phase 2 automation
- Keep all data local-first (privacy for health data)
- SQLite for MVP, consider TimescaleDB if time-series scales
