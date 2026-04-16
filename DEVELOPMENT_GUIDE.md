# Development Guide: Building the Gut Health Tracker

This guide documents the development process, architectural decisions, and technical choices made while building the Gut Health Tracker. It's intended as a blueprint for building similar data-driven web applications.

## 1. Project Overview & Rationale

The primary goal of this project is to identify trends and correlations between food ingredients and bowel movement (BM) patterns.

### Core Philosophy: "Data First, UI Later"
We prioritized functional data collection and analysis over a polished user interface. This approach allows us to:
- Rapidly iterate on data models.
- Prove the value of the analysis logic before investing in design.
- Collect real-world data to inform future UI/UX decisions.

### Technology Stack Choice
- **Backend: FastAPI (Python)**: High performance, automatic API documentation (Swagger), and native support for asynchronous operations. Python's rich ecosystem for data analysis (Pandas, NumPy) makes it ideal for the correlation layer.
- **Frontend: Next.js 14+ (React)**: Robust framework for building interactive dashboards. The App Router provides a clean organizational structure.
- **Database: SQLite**: Lightweight and file-based, making it perfect for rapid local development and prototyping without the overhead of a managed DB.
- **Styling: Tailwind CSS**: Rapidly build functional UIs without writing custom CSS.

---

## 2. Architectural Decisions

### Directory Structure
```
gut-health-tracker/
├── backend/              # API and Data Processing
│   ├── app/              # Application logic
│   │   ├── models.py     # Database schema (SQLAlchemy)
│   │   ├── schemas.py    # API request/response models (Pydantic)
│   │   ├── routers/      # Modular API endpoints
│   │   └── database.py   # Connection management
│   └── uploads/          # Local photo storage
├── frontend/             # Dashboard and Input Forms
└── README.md
```
We chose a "monorepo-lite" structure to keep the full-stack context together while maintaining a clear separation between services.

### Data Modeling (SQLAlchemy)
We used a relational approach to handle the complex many-to-many relationship between food events and ingredients.
- **Users**: Anonymized via UUIDs to protect privacy while allowing cross-device tracking.
- **Ingredients**: A normalized table to ensure "Milk" and "milk" can be unified.
- **FoodEvent**: Captures the "moment of consumption," including a photo and notes.
- **BMEvent**: Captures characteristics (Bristol Scale 1-7, color) and timing.

### Image Handling
- **Storage**: Photos are stored locally in `backend/app/uploads/` for now. The path is saved in the database.
- **S3-Ready**: The architecture uses a separate `photo_path` field, making it easy to swap local storage for AWS S3 or Google Cloud Storage later by simply changing the upload service.

---

## 3. The Analysis Layer

The heart of the app is the correlation engine.

### Timing Window
We implemented a **24-hour look-back window**. When calculating correlations, we ask: *"What did this user eat in the 24 hours leading up to this specific BM event?"*

### Correlation Metric
We currently track:
1. **Frequency**: How often an ingredient is present before a BM.
2. **Bristol Average**: The average stool consistency associated with an ingredient.
3. **Distribution**: A breakdown of Bristol scale counts to identify outliers (e.g., an ingredient that always leads to a '7' or '1').

---

## 4. Git Workflow

We initialized Git immediately to track decisions from day one.
- **.gitignore**: Carefully configured to exclude `node_modules`, `__pycache__`, virtual environments (`venv`), and sensitive `.env` files.
- **Initial Commit**: Scaffolded the structure before adding logic.
- **Feature Commits**: Grouped backend logic and frontend components into logical commits.

---

## 5. Development "Gotchas" & Lessons Learned

1. **Manual vs. AI Tagging**: We debated starting with an AI food recognition API (Clarifai/Edamam). Decision: **Start manual**. User-typed ingredients are 100% accurate for initial data. AI can be added as a "suggestion" layer later.
2. **CORS**: When running FastAPI and Next.js on different ports (8000 and 3000), Cross-Origin Resource Sharing (CORS) must be explicitly configured in FastAPI's `CORSMiddleware`.
3. **Pydantic Validation**: Using Pydantic for API schemas caught several data type mismatches (e.g., Bristol scale as a string instead of an int) early in the development cycle.

---

## 6. How to Extend This
- **Testing**: We recommend adding `pytest` for the backend routers and `Vitest` for frontend components.
- **S3 Uploads**: Replace the `save_upload_file_locally` function in the food router with an S3 upload utility.
- **ML Layer**: Once enough data is collected, use the existing `photo_path` and `ingredients_text` to train a custom Vision model for ingredient detection.
