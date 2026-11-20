from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
from app.services.whisper_service import WhisperService

router = APIRouter(prefix="/stt", tags=["Speech-To-Text"])

MAX_AUDIO_SIZE = 25 * 1024 * 1024  # 25 MB

@router.post("/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    language: Optional[str] = Form(None),
):
    """
    Multilingual speech-to-text transcription endpoint using Whisper.
    Automatically detects spoken language or respects language hint.
    """
    # Validate content type / extension
    allowed_types = ["audio/webm", "audio/wav", "audio/mpeg", "audio/mp4", "audio/ogg", "audio/x-m4a"]
    if file.content_type and file.content_type not in allowed_types and not file.filename.endswith((".webm", ".wav", ".mp3", ".mp4", ".ogg", ".m4a")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported audio type '{file.content_type}'. Allowed formats: WebM, WAV, MP3, MP4, OGG.",
        )

    audio_bytes = await file.read()
    if len(audio_bytes) > MAX_AUDIO_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Audio file exceeds maximum size limit of {MAX_AUDIO_SIZE / (1024 * 1024)}MB.",
        )

    if len(audio_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded audio file is empty.",
        )

    result = await WhisperService.transcribe_audio_bytes(
        audio_bytes=audio_bytes,
        filename=file.filename or "audio.webm",
        language=language,
    )

    return {
        "success": True,
        "data": result,
    }
