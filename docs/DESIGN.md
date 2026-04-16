# Technical Design - Gut Health Tracker

## Architecture Overview
Three-service architecture with clear separation of concerns:
1. **Frontend Service**: Next.js 14 (port 3000) - User interface, data visualization
2. **Food Classifier Service**: FastAPI + HuggingFace Food-101 (port 8001) - Image classification
3. **Trigger Analyzer Service**: FastAPI + scipy (port 8002) - Statistical analysis

All services communicate via REST APIs and share a common SQLite database.

## Data Models (Prisma Schema)
### User
- id (UUID)
- createdAt (DateTime)
- updatedAt (DateTime)

### FoodEntry
- id (UUID)
- userId (UUID)
- photoUrl (String)
- ingredients (String[])
- createdAt (DateTime)

### HealthOutcome
- id (UUID)
- userId (UUID)
- bmRating (Int 1-7)
- notes (String)
- createdAt (DateTime)

### Ingredient
- id (UUID)
- name (String)
- confirmed (Boolean)
- createdAt (DateTime)

### PersonalTrigger
- id (UUID)
- userId (UUID)
- ingredientId (UUID)
- zScore (Float)
- confidence (Float)
- lastUpdated (DateTime)

### DailyTrend
- id (UUID)
- userId (UUID)
- date (Date)
- avgBmRating (Float)
- triggerCount (Int)
- createdAt (DateTime)

## API Design Patterns
- RESTful endpoints with consistent naming (/api/v1/...)
- JSON responses with standardized error formats
- Authentication via JWT tokens (NextAuth)
- Rate limiting on prediction endpoints
- CORS enabled for frontend communication

## AI Integration Strategy
1. **Self-hosted Models**: Food-101 model runs locally in FastAPI service
2. **Human-in-the-loop**: Predictions require user confirmation before storage
3. **Batch Processing**: Trigger analysis runs nightly or on-demand
4. **Caching**: Recent predictions cached to reduce model inference load

## Statistical Analysis Approach
- **Z-test**: Calculate z-scores for ingredient-BM correlations
- **Lookback Window**: 24-hour period for correlation detection
- **Confidence Threshold**: Only report triggers with >95% confidence
- **Trend Detection**: Weekly moving averages for longitudinal tracking

## Deployment Considerations
- **Local Development**: Docker Compose for easy setup
- **Production**: Kubernetes-ready container images
- **Data Persistence**: SQLite files mounted as volumes
- **Scalability**: Stateless services allow horizontal scaling
- **Security**: UUID-based anonymous users, no PII stored