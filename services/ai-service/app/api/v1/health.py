import datetime
from fastapi import APIRouter

router = APIRouter(tags=["Health"])

@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "ai-service",
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
    }

@router.get("/ready")
async def readiness_check():
    return {
        "status": "ready",
        "service": "ai-service",
        "checks": {
            "chroma": "available",
            "redis": "available",
            "ollama": "available",
        },
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
    }
