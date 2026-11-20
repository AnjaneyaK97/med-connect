from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, status
from app.services.rag_service import RagService

router = APIRouter(prefix="/notes", tags=["Clinical Documentation"])

class DraftNoteRequest(BaseModel):
    transcript: str = Field(..., min_length=2, description="Patient symptoms or transcribed text")
    patient_info: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Patient metadata (name, age, gender, allergies)")
    language: Optional[str] = Field("en", description="Language ('en' or 'hi')")

@router.post("/draft")
async def generate_draft_note(request: DraftNoteRequest):
    """
    Retrieves evidence-based medical guidelines from ChromaDB, sanitizes PII,
    and drafts a structured SOAP clinical note with source citations using Llama-3.
    """
    if not request.transcript.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Transcript text is required to generate a draft clinical note.",
        )

    draft_result = await RagService.generate_soap_draft(
        transcript=request.transcript,
        patient_info=request.patient_info,
        language=request.language or "en",
    )

    return {
        "success": True,
        "data": draft_result,
    }
