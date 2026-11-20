from typing import Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, status
from app.services.triage_service import TriageService

router = APIRouter(prefix="/triage", tags=["Clinical Triage"])

class TriageAnalyzeRequest(BaseModel):
    transcript: str = Field(..., min_length=2, description="Transcribed or entered symptom text")
    language: Optional[str] = Field("en", description="Spoken/input language ('en' or 'hi')")

@router.post("/analyze")
async def analyze_symptoms(request: TriageAnalyzeRequest):
    """
    Analyzes patient symptoms, extracts structured clinical triage indicators,
    and executes deterministic Red-Flag emergency screening.
    """
    if not request.transcript.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Transcript text cannot be empty.",
        )

    summary = TriageService.analyze_triage(
        transcript=request.transcript,
        language=request.language or "en",
    )

    return {
        "success": True,
        "data": summary,
    }
