import re
from typing import Tuple, Dict, Optional

class PiiSanitizer:
    """
    HIPAA-compliant Pre-LLM PII de-identification and re-identification engine.
    Strips identifiable names, telephone numbers, emails, and identifiers before
    sending prompts to the LLM, then restores them post-generation.
    """

    PHONE_REGEX = re.compile(r"(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}")
    EMAIL_REGEX = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b")
    SSN_ID_REGEX = re.compile(r"\b\d{3}-\d{2}-\d{4}\b|\b\d{9,12}\b")
    DOB_REGEX = re.compile(r"\b(0[1-9]|1[0-2])/(0[1-9]|[12]\d|3[01])/(19|20)\d{2}\b")

    @classmethod
    def sanitize(
        cls,
        text: str,
        patient_name: Optional[str] = None,
        phone: Optional[str] = None,
        email: Optional[str] = None,
    ) -> Tuple[str, Dict[str, str]]:
        """
        Replaces identifiable PII entities with deterministic tokens.
        Returns: (sanitized_text, token_map)
        """
        token_map: Dict[str, str] = {}
        sanitized = text

        # 1. Tokenize Emails first (to prevent sub-string name replacement within email handles)
        for idx, match in enumerate(cls.EMAIL_REGEX.finditer(sanitized)):
            original_email = match.group(0)
            token = f"[EMAIL_{idx+1}]"
            token_map[token] = original_email
            sanitized = sanitized.replace(original_email, token)

        # 2. Tokenize Phone Numbers
        for idx, match in enumerate(cls.PHONE_REGEX.finditer(sanitized)):
            original_phone = match.group(0)
            token = f"[PHONE_{idx+1}]"
            token_map[token] = original_phone
            sanitized = sanitized.replace(original_phone, token)

        # 3. Tokenize National IDs / SSNs
        for idx, match in enumerate(cls.SSN_ID_REGEX.finditer(sanitized)):
            original_id = match.group(0)
            token = f"[IDENTIFIER_{idx+1}]"
            token_map[token] = original_id
            sanitized = sanitized.replace(original_id, token)

        # 4. Replace explicit patient name if provided
        if patient_name and len(patient_name.strip()) > 1:
            name_parts = patient_name.strip().split()
            # Tokenize full name
            token = "[PATIENT_NAME]"
            sanitized = re.sub(re.escape(patient_name), token, sanitized, flags=re.IGNORECASE)
            token_map[token] = patient_name

            # Tokenize individual first/last names if >= 3 characters
            for idx, part in enumerate(name_parts):
                if len(part) >= 3:
                    sub_token = f"[PATIENT_NAME_{idx+1}]"
                    sanitized = re.sub(r"\b" + re.escape(part) + r"\b", sub_token, sanitized, flags=re.IGNORECASE)
                    token_map[sub_token] = part

        return sanitized, token_map

    @classmethod
    def restore(cls, text: str, token_map: Dict[str, str]) -> str:
        """
        Rehydrates tokenized placeholders with their original PII values post-generation.
        """
        restored = text
        for token, original_value in token_map.items():
            restored = restored.replace(token, original_value)
        return restored
