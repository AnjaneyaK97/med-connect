import re
from typing import Dict, Any, List
from app.services.red_flag_engine import RedFlagEngine

class TriageService:
    """
    Structured Clinical Triage Generator.
    Extracts chief complaints, symptom clusters, duration, and severity,
    integrating deterministic red-flag escalation.
    """

    SYMPTOM_DICTIONARY = {
        "fever": [r"\bfever\b", r"\btemperature\b", r"\bchills\b", r"बुखार"],
        "cough": [r"\bcough\b", r"\bsputum\b", r"\bphlegm\b", r"खांसी"],
        "chest_pain": [r"\bchest\s*(pain|tightness|pressure)\b", r"सीने\s*में\s*दर्द"],
        "shortness_of_breath": [r"\bshortness\s*of\s*breath\b", r"\bdyspnea\b", r"\bbreathless\b", r"सांस\s*लेने\s*में\s*तकलीफ"],
        "headache": [r"\bheadache\b", r"\bmigraine\b", r"सिरदर्द|सर\s*दर्द"],
        "nausea_vomiting": [r"\bnausea\b", r"\bvomit(ing)?\b", r"उल्टी|जी\s*मिचलाना"],
        "fatigue": [r"\bfatigue\b", r"\btiredness\b", r"\bexhaustion\b", r"थकान|कमजोरी"],
        "sore_throat": [r"\bsore\s*throat\b", r"\bthroat\s*pain\b", r"गले\s*में\s*खराश"],
        "abdominal_pain": [r"\bstomach\s*pain\b", r"\babdominal\s*pain\b", r"\bcramps\b", r"पेट\s*में\s*दर्द"],
        "joint_pain": [r"\bjoint\s*pain\b", r"\bswelling\b", r"\bsprain\b", r"जोड़ों\s*में\s*दर्द|सूजन"],
    }

    DURATION_PATTERNS = [
        r"\b(\d+|a|two|three|four|five|six|several)\s*(hours?|days?|weeks?|months?)\b",
        r"\b(since\s*(yesterday|last\s*night|morning))\b",
        r"\b(sudden(ly)?|abrupt(ly)?)\b",
        r"(\d+)\s*(दिन|घंटे|हफ्ते|महीने)\s*से",
    ]

    @classmethod
    def analyze_triage(cls, transcript: str, language: str = "en") -> Dict[str, Any]:
        """
        Generates a comprehensive clinical triage summary with deterministic red-flag screening.
        """
        # 1. Deterministic Red-Flag Safety Screen
        red_flag_result = RedFlagEngine.evaluate(transcript, language=language)

        # 2. Extract Symptoms
        detected_symptoms: List[str] = []
        transcript_lower = transcript.lower()

        for symptom_name, patterns in cls.SYMPTOM_DICTIONARY.items():
            for pat in patterns:
                matched = False
                for match in re.finditer(pat, transcript_lower, re.IGNORECASE):
                    prefix = transcript_lower[max(0, match.start() - 35):match.start()]
                    if re.search(r"\b(no|not|denies|denying|denied|without|negative\s*for)\s+[\w\s]{0,15}$", prefix):
                        continue
                    matched = True
                    break
                if matched:
                    detected_symptoms.append(symptom_name.replace("_", " ").title())
                    break

        if not detected_symptoms:
            detected_symptoms = ["General Malaise / Unspecified Discomfort"]

        # 3. Extract Duration
        detected_duration = "Unspecified duration"
        for dur_pat in cls.DURATION_PATTERNS:
            match = re.search(dur_pat, transcript_lower, re.IGNORECASE)
            if match:
                detected_duration = match.group(0)
                break

        # 4. Determine Clinical Severity
        if red_flag_result["is_red_flag"]:
            severity = "EMERGENCY"
        elif any(s in ["Chest Pain", "Shortness Of Breath"] for s in detected_symptoms):
            severity = "HIGH"
        elif len(detected_symptoms) >= 3 or "Fever" in detected_symptoms:
            severity = "MEDIUM"
        else:
            severity = "LOW"

        # 5. Determine Recommended Specialty
        if red_flag_result["is_red_flag"]:
            recommended_specialty = "Emergency Medicine"
        elif "Chest Pain" in detected_symptoms:
            recommended_specialty = "Cardiology"
        elif "Shortness Of Breath" in detected_symptoms or "Cough" in detected_symptoms:
            recommended_specialty = "Pulmonology"
        elif "Headache" in detected_symptoms:
            recommended_specialty = "Neurology"
        else:
            recommended_specialty = "General Medicine"

        # 6. Build Chief Complaint
        # Truncate cleanly around first sentence or 120 chars
        first_sentence = re.split(r"[.!?।]", transcript.strip())[0].strip()
        chief_complaint = first_sentence if len(first_sentence) > 5 else transcript[:120].strip()

        return {
            "chief_complaint": chief_complaint,
            "symptoms": detected_symptoms,
            "duration": detected_duration,
            "severity": severity,
            "is_red_flag": red_flag_result["is_red_flag"],
            "red_flags": red_flag_result["triggered_rules"],
            "matched_patterns": red_flag_result["matched_patterns"],
            "emergency_advisory": red_flag_result["advisory"],
            "recommended_action": red_flag_result["action"],
            "recommended_specialty": recommended_specialty,
            "language": language,
            "disclaimer": "AI-assisted clinical triage draft for decision support. Requires licensed clinician verification.",
        }
