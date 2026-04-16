# Gut Health Tracker

A full-stack application for tracking food intake and bowel movements to identify ingredient correlations and patterns.

## Project Structure

```
gut-health-tracker/
├── backend/           # FastAPI Python backend
│   ├── app/
│   │   ├── routers/   # API endpoints
│   │   ├── models.py  # SQLAlchemy models
│   │   ├── schemas.py # Pydantic schemas
│   │   ├── database.py
│   │   └── uploads/   # Food photo storage
│   ├── main.py
│   └── requirements.txt
├── frontend/          # Next.js 14 frontend
│   └── src/
│       ├── app/
│       ├── components/
│       ├── lib/
│       └── types/
└── README.md
```

## Features

- **User Profiles**: Anonymous UUID-based user identification
- **Food Logging**: Upload photos and enter ingredients manually
- **BM Logging**: Bristol scale (1-7), color picker, and notes
- **Timeline View**: Chronological display of food and BM events
- **Stats & Correlations**: Ingredient correlations with BM patterns within 24h window

## Tech Stack

**Backend:**
- FastAPI
- SQLAlchemy ORM
- SQLite database
- Python-multipart for file uploads

**Frontend:**
- Next.js 14+
- TypeScript
- Tailwind CSS
- Axios for API calls

## Setup Instructions

### Prerequisites
- Python 3.11+
- Node.js 18+
- npm or pnpm

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ..
python -m uvicorn backend.main:app --reload --port 8000
```

The API will be available at http://localhost:8000

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at http://localhost:3000

### Environment Variables (Optional)

Create `frontend/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## API Endpoints

### Users
- `POST /users/` - Create anonymous user
- `GET /users/{user_id}` - Get user info
- `POST /users/{user_id}/food` - Log food event with photo/ingredients
- `GET /users/{user_id}/food` - Get user's food events

### BM Events
- `POST /bm/` - Log bowel movement event
- `GET /bm/user/{user_id}` - Get user's BM events

### Analysis
- `GET /analysis/timeline/{user_id}` - Get timeline (food + BM events)
- `GET /analysis/correlations/{user_id}` - Get ingredient correlations
- `GET /analysis/ingredients/{user_id}` - Get ingredient frequency

## Database Schema

### Tables
- **users**: id (UUID), created_at
- **ingredients**: id, name, created_at
- **food_events**: id, user_id, timestamp, photo_path, notes
- **bm_events**: id, user_id, timestamp, bristol_scale, color, notes
- **food_ingredient**: Junction table (many-to-many)

## Bristol Scale Reference

1. Separate hard lumps (constipation)
2. Lumpy, sausage-shaped (constipation)
3. Sausage with cracks (normal)
4. Smooth, soft sausage (normal/optimal)
5. Soft blobs (normal)
6. Fluffy pieces (diarrhea)
7. Watery, no solid (diarrhea)

## Analysis logic

The correlation analysis:
1. Finds all food events for the user
2. For each food event, finds BM events within 24 hours
3. Aggregates Bristol scale scores per ingredient
4. Calculates average Bristol scale and distribution per ingredient

This helps identify ingredients that correlate with digestive issues.