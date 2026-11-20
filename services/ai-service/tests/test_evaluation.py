import unittest
from app.services.eval_harness import ClinicalEvaluationHarness

class TestClinicalEvaluationHarness(unittest.TestCase):
    def test_run_clinical_benchmark(self):
        metrics = ClinicalEvaluationHarness.run_benchmark()

        # Validate safety and accuracy thresholds
        self.assertEqual(metrics["total_cases_evaluated"], 6)
        self.assertEqual(metrics["red_flag_accuracy"], 100.0, "Red-flag engine must achieve 100% accuracy on emergency benchmark cases.")
        self.assertEqual(metrics["pii_protection_rate"], 100.0, "Pre-LLM PII de-identification must achieve 100% protection.")
        self.assertEqual(metrics["soap_completeness_rate"], 100.0, "All SOAP note drafts must contain complete S-O-A-P sections.")
        self.assertTrue(metrics["all_benchmarks_passed"])

        # Check breakdown
        for case_result in metrics["case_breakdown"]:
            self.assertTrue(case_result["red_flag_passed"], f"Case {case_result['case_id']} red-flag test failed")
            self.assertTrue(case_result["pii_secure"], f"Case {case_result['case_id']} PII protection failed")
            self.assertTrue(case_result["soap_complete"], f"Case {case_result['case_id']} SOAP completeness failed")

if __name__ == "__main__":
    unittest.main()
