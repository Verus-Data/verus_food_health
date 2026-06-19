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
- **Frontend**: Next.js 14 (React 18), Tailwind CSS, TypeScript — **static export only** (no server-side rendering)
- **Backend**: FastAPI (Python 3.10+) running as **stateless CGI** (no persistent process), Prisma ORM, SQLite
- **AI Services**: HuggingFace Food-101 (image classification), scipy (statistical analysis)
- **Authentication**: JWT-based sessions stored client-side (no server session state)
- **Deployment**: Static files to web host, CGI scripts for API endpoints, GitHub Actions CI/CD

## Architecture Requirements

### Frontend: Static Export
The Next.js frontend **must** be exportable to static HTML/JS. This means:
- **No** `getServerSession()` or server-side auth checks
- **No** API routes that require server-side processing
- All auth state managed client-side via JWT in localStorage/cookies
- API calls go to separate CGI endpoints, not Next.js API routes
- Build output is static files deployable to any web host (DreamHost, etc.)

### Backend: Stateless CGI
The FastAPI backend **must** run as stateless CGI scripts:
- **No** persistent server process
- Each request spins up fresh Python interpreter via CGI
- SQLite database file accessed directly (file-based, no connection pool)
- Authentication via JWT verification on each request (no session store)
- Designed for shared hosting environments (DreamHost CGI)

### Rationale
This architecture prioritizes **deployment flexibility** over developer convenience. By eliminating server-side rendering and persistent processes, the app can run on:
- Cheap shared hosting (DreamHost, etc.)
- Static site hosts (Cloudflare Pages, Netlify) + separate CGI endpoint
- Minimal infrastructure (no container orchestration, no server maintenance)

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