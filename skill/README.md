# Food-Health Analyzer

Analyze food images to understand dietary impact on health.

## Quick Start

```bash
# 1. Process a folder of food images
python scripts/process_images.py ~/photos/food_photos --db food_health.db

# 2. Interactive ingredient labeling (manual mode)
python scripts/extract_ingredients.py ~/photos/food_photos --interactive --output ingredients.json

# 3. Log health outcomes (bowel movement, energy, symptoms)
# (Use your own app/script to insert into database)

# 4. Generate correlation report
python scripts/correlate_health.py --db food_health.db --report --output report.txt

# 5. View dashboard (optional)
python scripts/dashboard.py
```

## Database Schema

### food_entries
- `id`: Primary key
- `image_path`: Path to food image
- `timestamp`: When photo was taken
- `extracted_ingredients`: AI-extracted ingredients (JSON)
- `manual_ingredients`: User-corrected ingredients (JSON)
- `confidence`: AI confidence score
- `nutrition_estimate`: Estimated nutrition (JSON)

### health_outcomes
- `id`: Primary key
- `entry_id`: Reference to food_entries
- `outcome_type`: 'bm', 'energy', 'symptom', 'mood'
- `severity`: 1-5 scale
- `timestamp`: When outcome occurred
- `notes`: Free text notes

## Correlation Analysis

The correlator matches food intake with health outcomes within a configurable time window (default 24 hours).

**Trigger Detection**: Foods appearing frequently before negative outcomes.

**Example Output**:
```
🚽 POTENTIAL BOWEL MOVEMENT TRIGGERS
- dairy                | Count: 12 | Avg Severity: 3.8
- wheat                | Count: 8  | Avg Severity: 3.5
- garlic               | Count: 6  | Avg Severity: 3.2
```

## Integration Options

### Phase 1: Manual (Current)
- User labels ingredients manually
- Logs BM/energy/symptoms in database
- Runs correlation analysis

### Phase 2: AI-Assisted (Future)
- Integrate Hugging Face food models
- Pre-fill ingredients, user confirms
- Higher throughput, ~70-80% accuracy

### Phase 3: API Integration (Future)
- Edamam Food API for nutrition data
- Clarifai for visual food recognition
- Automated end-to-end pipeline

## Datasets for Training

| Dataset | Use Case |
|---------|----------|
| Nutrition5k | Portion estimation, ingredient mass |
| SNAPMe | Photo-based dietary assessment benchmark |
| FoodLogAthl-218 | Real-world meal classification |
| AI4Food-NutritionDB | Synthetic eating behavior generation |

## Privacy Notes

- All data stored locally in SQLite
- No cloud uploads in current implementation
- Health data stays on your device
