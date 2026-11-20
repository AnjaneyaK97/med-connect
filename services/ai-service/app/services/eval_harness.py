import time
from typing import Dict, List, Any
from app.services.red_flag_engine import RedFlagEngine
from app.services.pii_sanitizer import PiiSanitizer
from app.services.rag_service import RagService

# Standardized Clinical Evaluation Benchmark Cases
CLINICAL_BENCHMARK_CASES = [
    {
        "case_id": "EVAL-ACS-001",
        "description": "Acute Coronary Syndrome (STEMI Presentation)",
        "transcript": "Patient Johnathan Doe (phone 555-019-2834, john@example.com) presents with sudden crushing retrosternal chest pain radiating down left arm, cold sweats and nausea for 45 minutes.",
        "patient_name": "Johnathan Doe",
        "expected_red_flag": True,
        "expected_rule": "Acute Coronary Syndrome",
        "expected_specialty": "Emergency Medicine",
        "expected_category": "Cardiology",
    },
    {
        "case_id": "EVAL-STRK-002",
        "description": "Acute Stroke (FAST Positive)",
        "transcript": "Patient Maria Garcia suddenly developed right-sided facial droop, arm weakness, and slurred speech 30 minutes ago while eating lunch.",
        "patient_name": "Maria Garcia",
        "expected_red_flag": True,
        "expected_rule": "Stroke",
        "expected_specialty": "Emergency Medicine",
        "expected_category": "Neurology",
    },
    {
        "case_id": "EVAL-ANAPH-003",
        "description": "Severe Anaphylaxis",
        "transcript": "Patient Liam Smith reports throat closing up, swollen tongue and lips, widespread hives, cannot breathe after eating peanuts.",
        "patient_name": "Liam Smith",
        "expected_red_flag": True,
        "expected_rule": "Anaphylaxis",
        "expected_specialty": "Emergency Medicine",
        "expected_category": "Allergy/Immunology",
    },
    {
        "case_id": "EVAL-RESP-004",
        "description": "Acute Viral Bronchitis (Routine Pulmonary)",
        "transcript": "Patient Sarah Connor reports productive cough with clear sputum, mild sore throat and low-grade fever for 3 days. Denies chest pain or severe dyspnea.",
        "patient_name": "Sarah Connor",
        "expected_red_flag": False,
        "expected_rule": None,
        "expected_specialty": "Pulmonology",
        "expected_category": "Pulmonology",
    },
    {
        "case_id": "EVAL-NEUR-005",
        "description": "Tension Headache / Migraine (Non-Emergency)",
        "transcript": "Patient Robert Miller has throbbing unilateral headache with photophobia for 2 days. No sudden onset, no weakness or confusion.",
        "patient_name": "Robert Miller",
        "expected_red_flag": False,
        "expected_rule": None,
        "expected_specialty": "Neurology",
        "expected_category": "Neurology",
    },
    {
        "case_id": "EVAL-HINDI-006",
        "description": "Hindi Acute Coronary Syndrome",
        "transcript": "मेरे सीने में अचानक गंभीर दर्द, दबाव और भारीपन है और बाईं भुजा में दर्द फैल रहा है।",
        "patient_name": "राजेश कुमार",
        "expected_red_flag": True,
        "expected_rule": "Acute Coronary Syndrome",
        "expected_specialty": "Emergency Medicine",
        "expected_category": "Cardiology",
        "language": "hi",
    },
]

class ClinicalEvaluationHarness:
    """
    Automated Clinical Evaluation & Safety Benchmark Harness.
    Evaluates red-flag sensitivity/specificity, PII redaction integrity,
    and SOAP note completeness across clinical test cases.
    """

    @classmethod
    def run_benchmark(cls) -> Dict[str, Any]:
        start_time = time.time()
        results: List[Dict[str, Any]] = []

        red_flag_correct = 0
        pii_leak_count = 0
        soap_completeness_count = 0
        total_cases = len(CLINICAL_BENCHMARK_CASES)

        for case in CLINICAL_BENCHMARK_CASES:
            case_id = case["case_id"]
            transcript = case["transcript"]
            patient_name = case.get("patient_name")
            lang = case.get("language", "en")

            # 1. Evaluate Red-Flag Rule Engine
            rf_res = RedFlagEngine.evaluate(transcript, language=lang)
            is_rf = rf_res["is_red_flag"]
            rf_passed = (is_rf == case["expected_red_flag"])
            if rf_passed and case["expected_rule"]:
                rf_passed = any(case["expected_rule"] in r for r in rf_res["triggered_rules"])

            if rf_passed:
                red_flag_correct += 1

            # 2. Evaluate PII Sanitization
            sanitized, token_map = PiiSanitizer.sanitize(transcript, patient_name=patient_name)
            name_leaked = patient_name in sanitized if patient_name else False
            email_leaked = "@" in sanitized
            phone_leaked = "555-" in sanitized

            pii_secure = not (name_leaked or email_leaked or phone_leaked)
            if not pii_secure:
                pii_leak_count += 1

            # 3. Evaluate SOAP Note Generation Completeness
            soap_draft = RagService.generate_soap_draft_sync(
                transcript=transcript,
                patient_info={"name": patient_name, "age": 42, "gender": "Unspecified"},
                language=lang,
            )

            soap_complete = all([
                bool(soap_draft.get("subjective")),
                bool(soap_draft.get("objective")),
                bool(soap_draft.get("assessment")),
                bool(soap_draft.get("plan")),
                isinstance(soap_draft.get("citations"), list),
                bool(soap_draft.get("disclaimer")),
            ])

            if soap_complete:
                soap_completeness_count += 1

            results.append({
                "case_id": case_id,
                "description": case["description"],
                "red_flag_expected": case["expected_red_flag"],
                "red_flag_actual": is_rf,
                "red_flag_passed": rf_passed,
                "pii_secure": pii_secure,
                "soap_complete": soap_complete,
                "retrieved_citations": len(soap_draft.get("citations", [])),
                "model": soap_draft.get("model"),
            })

        duration_sec = round(time.time() - start_time, 3)

        metrics = {
            "total_cases_evaluated": total_cases,
            "red_flag_accuracy": round((red_flag_correct / total_cases) * 100, 1),
            "pii_protection_rate": round(((total_cases - pii_leak_count) / total_cases) * 100, 1),
            "soap_completeness_rate": round((soap_completeness_count / total_cases) * 100, 1),
            "all_benchmarks_passed": (
                red_flag_correct == total_cases
                and pii_leak_count == 0
                and soap_completeness_count == total_cases
            ),
            "duration_seconds": duration_sec,
            "case_breakdown": results,
        }

        return metrics
