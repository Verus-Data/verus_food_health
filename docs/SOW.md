# Statement of Work (SOW) - Gut Health Tracker

## Project Scope
4-phase development of a full-stack gut health tracking application with AI-powered food-symptom correlation analysis.

## Deliverables
1. Working web application (Next.js frontend + FastAPI microservices)
2. Docker configuration for local development and production deployment
3. CI/CD pipeline setup (GitHub Actions)
4. Comprehensive documentation (PRD, SOW, DESIGN.md)
5. Test suite covering core functionality

## Technical Stack
- **Frontend**: Next.js 14 (React 18), Tailwind CSS, TypeScript
- **Backend**: FastAPI (Python 3.10+), Prisma ORM, SQLite (MVP)
- **AI Services**: HuggingFace Food-101 (image classification), scipy (statistical analysis)
- **Authentication**: NextAuth (JWT-based sessions)
- **Deployment**: Docker containers, GitHub Actions CI/CD

## Timeline & Milestones
| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| V0: Scaffold | 1 week | Basic CRUD, timeline view, correlation heatmap |
| V1: Real DB + Auth | 1 week | Prisma schema, user auth, export API |
| V2: AI Ingredient Prediction | 2 weeks | Food-101 integration, human-in-the-loop UI, ingredient storage |
| V3: Personalized Learning | 2 weeks | Trigger analyzer, predictions API, daily trends, S3-ready structure |

## Quality Assurance
- All code must pass linting (prettier, black, mypy)
- Build errors = blocking (must fix before merge)
- Lint warnings = acceptable (can be addressed post-merge)
- Unit tests covering 80%+ of core logic
- Manual QA on key user flows (photo upload → prediction → correlation)

## Team Responsibilities
- **Zack (Developer Agent)**: Code implementation, testing, documentation
- **Rosie (Main Agent)**: Requirements gathering, coordination, user feedback
- **Eric (Product Owner)**: Final approval, architectural decisions, deployment oversight