from fastapi import APIRouter
from app.services.eval_harness import ClinicalEvaluationHarness

router = APIRouter(prefix="/evaluation", tags=["Evaluation & Benchmarks"])

@router.get("/benchmark")
def run_evaluation_benchmark():
    """
    Runs automated clinical benchmark harness across red-flag detection,
    PII sanitization, and structured SOAP note completeness.
    """
    metrics = ClinicalEvaluationHarness.run_benchmark()
    return {
        "status": "success",
        "benchmark_summary": metrics,
    }
