import re
from typing import Dict, List, Any, Optional

class RedFlagEngine:
    """
    Deterministic Clinical Red-Flag Escalation Engine.
    Operates independently of LLM reasoning to ensure zero hallucination or missed life-threatening emergencies.
    Supports multilingual medical symptom tokens across English and Hindi.
    """

    # Comprehensive deterministic clinical emergency rule sets
    RULES = {
        "ACUTE_CORONARY_SYNDROME": {
            "name": "Acute Coronary Syndrome / Suspected Myocardial Infarction",
            "severity": "EMERGENCY",
            "keywords_en": [
                r"\bchest\s*(pain|pressure|tightness|heaviness|discomfort|crushing)\b",
                r"\bradiat(ing|ion)\s*to\s*(left\s*arm|jaw|neck|shoulder|back)\b",
                r"\bsubsternal\b",
                r"\bdiaphoresis\b",
                r"\bcold\s*sweats?\b",
                r"\bheart\s*attack\b",
            ],
            "keywords_hi": [
                r"सीने\s*में[^।.!?]{0,30}?(दर्द|जकड़न|दबाव|भारीपन)",
                r"बाईं\s*भुजा\s*में\s*दर्द",
                r"जबड़े\s*में\s*दर्द",
                r"दिल\s*का\s*दौरा",
                r"ठंडा\s*पसीना",
            ],
            "action": "CALL_EMERGENCY_SERVICES_IMMEDIATELY",
            "advisory_en": "EMERGENCY ADVISORY: Symptoms suggest possible acute cardiac emergency. Please call emergency services (911/112) or proceed to the nearest emergency room immediately.",
            "advisory_hi": "आपातकालीन चेतावनी: लक्षण संभावित गंभीर हृदय समस्या का संकेत देते हैं। कृपया तुरंत आपातकालीन सेवाओं (112/108) पर कॉल करें या नजदीकी अस्पताल के आपातकालीन वार्ड में जाएं।",
        },
        "ACUTE_STROKE": {
            "name": "Suspected Acute Stroke (FAST Criteria)",
            "severity": "EMERGENCY",
            "keywords_en": [
                r"\bface\s*(droop|numb|paraly)\b",
                r"\barm\s*(weak|drift|numb)\b",
                r"\bslurr(ed|ing)\s*(speech|words)\b",
                r"\bunable\s*to\s*(speak|talk)\b",
                r"\bsudden\s*(confusion|vision\s*loss|blindness)\b",
                r"\bhemiplegia\b",
                r"\baphasia\b",
                r"\bstroke\b",
            ],
            "keywords_hi": [
                r"चेहरे\s*का\s*टेढ़ापन",
                r"हाथ\s*में\s*कमजोरी",
                r"बोलने\s*में\s*दिक्कत|लड़खड़ाहट",
                r"अचानक\s*अंधापन",
                r"लकवा|स्ट्रोक",
            ],
            "action": "CALL_EMERGENCY_SERVICES_IMMEDIATELY",
            "advisory_en": "EMERGENCY ADVISORY: Sudden neurological deficit or stroke symptoms detected. Time is critical. Call emergency services immediately.",
            "advisory_hi": "आपातकालीन चेतावनी: अचानक न्यूरोलॉजिकल कमी या स्ट्रोक के लक्षण। समय अत्यंत महत्वपूर्ण है। तुरंत आपातकालीन सहायता लें।",
        },
        "SEVERE_RESPIRATORY_DISTRESS": {
            "name": "Severe Respiratory Distress / Impending Respiratory Failure",
            "severity": "EMERGENCY",
            "keywords_en": [
                r"\bcan('?t|not)\s*breathe\b",
                r"\bsevere\s*shortness\s*of\s*breath\b",
                r"\bgasping\s*for\s*air\b",
                r"\bcyanosis\b",
                r"\bblue\s*(lips|fingers|nails)\b",
                r"\bstridor\b",
                r"\basphyxi\b",
                r"\bsuffocat(ing|ion)\b",
            ],
            "keywords_hi": [
                r"सांस\s*नहीं\s*आ\s*रही",
                r"गंभीर\s*सांस\s*की\s*तकलीफ",
                r"दम\s*घुटना",
                r"होंठ\s*नीले\s*पड़ना",
            ],
            "action": "CALL_EMERGENCY_SERVICES_IMMEDIATELY",
            "advisory_en": "EMERGENCY ADVISORY: Acute severe breathing difficulty detected. Seek urgent emergency oxygen and medical intervention.",
            "advisory_hi": "आपातकालीन चेतावनी: गंभीर सांस की रुकावट। तुरंत ऑक्सीजन और आपातकालीन चिकित्सा सहायता प्राप्त करें।",
        },
        "ANAPHYLAXIS": {
            "name": "Anaphylaxis / Severe Systemic Allergic Reaction",
            "severity": "EMERGENCY",
            "keywords_en": [
                r"\banaphyla(xis|ctic)\b",
                r"\bthroat\s*closing\b",
                r"\bswollen\s*(tongue|throat|lips)\b",
                r"\bdifficulty\s*swallowing\b",
                r"\bwidespread\s*hives\b",
            ],
            "keywords_hi": [
                r"गला\s*बंद\s*होना",
                r"जीभ\s*या\s*होंठों\s*में\s*सूजन",
                r"गंभीर\s*एलर्जी",
                r"निगलने\s*में\s*कठिनाई",
            ],
            "action": "ADMINISTER_EPINEPHRINE_CALL_EMERGENCY",
            "advisory_en": "EMERGENCY ADVISORY: Signs of severe allergic reaction / anaphylaxis. Administer epinephrine auto-injector if prescribed and dial emergency services.",
            "advisory_hi": "आपातकालीन चेतावनी: गंभीर एलर्जी के लक्षण। यदि एपिनेफ्रीन ऑटो-इंजेक्टर उपलब्ध हो तो उपयोग करें और तुरंत आपातकालीन सहायता लें।",
        },
        "SEVERE_HEMORRHAGE": {
            "name": "Severe Active Hemorrhage / Massive Bleeding",
            "severity": "EMERGENCY",
            "keywords_en": [
                r"\buncontrolled\s*bleed(ing)?\b",
                r"\bvomit(ing)?\s*blood\b",
                r"\bhematemesis\b",
                r"\bcough(ing)?\s*up\s*blood\b",
                r"\bhemoptysis\b",
                r"\bprofuse\s*bleeding\b",
            ],
            "keywords_hi": [
                r"खून\s*की\s*उल्टी",
                r"खांसी\s*में\s*खून",
                r"अनियंत्रित\s*रक्तस्राव",
                r"अत्यधिक\s*खून\s*बहना",
            ],
            "action": "CALL_EMERGENCY_SERVICES_IMMEDIATELY",
            "advisory_en": "EMERGENCY ADVISORY: Significant active hemorrhage or internal bleeding symptoms detected. Immediate trauma care required.",
            "advisory_hi": "आपातकालीन चेतावनी: अनियंत्रित रक्तस्राव या आंतरिक रक्तस्राव के संकेत। तुरंत आपातकालीन उपचार प्राप्त करें।",
        },
    }

    @classmethod
    def evaluate(cls, text: str, language: str = "en") -> Dict[str, Any]:
        """
        Evaluates input text against all deterministic emergency rules.
        """
        if not text:
            return {
                "is_red_flag": False,
                "severity": "LOW",
                "triggered_rules": [],
                "matched_patterns": [],
                "advisory": None,
                "action": "ROUTINE_TRIAGE",
            }

        text_lower = text.lower()
        triggered_rules: List[str] = []
        matched_patterns: List[str] = []
        primary_advisory: Optional[str] = None
        recommended_action = "ROUTINE_TRIAGE"
        highest_severity = "LOW"

        for rule_key, rule_def in cls.RULES.items():
            is_matched = False
            # Check English regex patterns
            for pattern in rule_def["keywords_en"]:
                for match in re.finditer(pattern, text_lower, re.IGNORECASE):
                    # Check if preceded by negation (e.g., "no chest pain", "denies shortness of breath")
                    prefix = text_lower[max(0, match.start() - 35):match.start()]
                    if re.search(r"\b(no|not|denies|denying|denied|without|negative\s*for)\s+[\w\s]{0,15}$", prefix):
                        continue
                    is_matched = True
                    matched_patterns.append(match.group(0))

            # Check Hindi regex patterns
            for pattern in rule_def["keywords_hi"]:
                for match in re.finditer(pattern, text, re.IGNORECASE):
                    prefix = text[max(0, match.start() - 35):match.start()]
                    if re.search(r"(नहीं|बिना)\s*$", prefix):
                        continue
                    is_matched = True
                    matched_patterns.append(match.group(0))

            if is_matched:
                triggered_rules.append(rule_def["name"])
                highest_severity = "EMERGENCY"
                recommended_action = rule_def["action"]
                if not primary_advisory:
                    primary_advisory = (
                        rule_def["advisory_hi"]
                        if language.lower().startswith("hi")
                        else rule_def["advisory_en"]
                    )

        is_red_flag = len(triggered_rules) > 0

        return {
            "is_red_flag": is_red_flag,
            "severity": highest_severity if is_red_flag else "LOW",
            "triggered_rules": triggered_rules,
            "matched_patterns": list(set(matched_patterns)),
            "advisory": primary_advisory,
            "action": recommended_action,
        }
