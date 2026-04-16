from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import init_db
from .routers import users_router, bm_router, analysis_router, auth_router, food_router, health_router

app = FastAPI(
    title="Gut Health Tracker API",
    description="API for tracking food and bowel movement correlations",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(bm_router)
app.include_router(analysis_router)
app.include_router(food_router)
app.include_router(health_router)


@app.on_event("startup")
def startup():
    init_db()


@app.get("/")
def root():
    return {"message": "Gut Health Tracker API", "version": "2.0.0"}


@app.get("/health")
def health():
    return {"status": "healthy"}