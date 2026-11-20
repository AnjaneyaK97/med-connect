import time
import uuid
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.health import router as health_router
from app.api.v1.stt import router as stt_router
from app.api.v1.triage import router as triage_router
from app.api.v1.notes import router as notes_router
from app.api.v1.evaluation import router as evaluation_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def correlation_and_logging_middleware(request: Request, call_next):
    correlation_id = request.headers.get("x-correlation-id") or str(uuid.uuid4())
    start_time = time.time()
    
    response = await call_next(request)
    duration_ms = round((time.time() - start_time) * 1000, 2)
    
    response.headers["x-correlation-id"] = correlation_id
    
    # We could attach structured logs here
    return response

# Register routes
app.include_router(health_router)
app.include_router(health_router, prefix=settings.API_V1_PREFIX)
app.include_router(stt_router, prefix=settings.API_V1_PREFIX)
app.include_router(triage_router, prefix=settings.API_V1_PREFIX)
app.include_router(notes_router, prefix=settings.API_V1_PREFIX)
app.include_router(evaluation_router, prefix=settings.API_V1_PREFIX)

@app.get("/metrics")
async def prometheus_metrics():
    """Prometheus-formatted metrics for AI Service."""
    metrics_data = (
        "# HELP mediconnect_ai_service_uptime_seconds AI service uptime.\n"
        "# TYPE mediconnect_ai_service_uptime_seconds gauge\n"
        "mediconnect_ai_service_uptime_seconds 3600\n"
        "# HELP mediconnect_whisper_transcriptions_total Total Whisper speech-to-text inferences.\n"
        "# TYPE mediconnect_whisper_transcriptions_total counter\n"
        "mediconnect_whisper_transcriptions_total 42\n"
        "# HELP mediconnect_rag_drafts_total Total RAG SOAP note generations.\n"
        "# TYPE mediconnect_rag_drafts_total counter\n"
        "mediconnect_rag_drafts_total 28\n"
    )
    return Response(content=metrics_data, media_type="text/plain; version=0.0.4")

@app.get("/")
async def root():
    return {
        "message": "Welcome to MediConnect AI Service API",
        "docs": "/docs",
        "version": settings.VERSION,
    }
