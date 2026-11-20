import unittest
from app.services.pii_sanitizer import PiiSanitizer
from app.services.knowledge_service import KnowledgeService
from app.services.rag_service import RagService

class TestRagAndPiiPipeline(unittest.TestCase):
    def test_pii_sanitization_and_restoration(self):
        text = "Hello, my name is Robert Langdon, phone is 555-234-5678, email robert@harvard.edu. I feel dizzy."
        sanitized, token_map = PiiSanitizer.sanitize(
            text,
            patient_name="Robert Langdon",
            phone="555-234-5678",
            email="robert@harvard.edu",
        )

        # Ensure raw PII is stripped
        self.assertNotIn("Robert Langdon", sanitized)
        self.assertNotIn("robert@harvard.edu", sanitized)
        self.assertIn("[PATIENT_NAME]", sanitized)

        # Restore
        restored = PiiSanitizer.restore(sanitized, token_map)
        self.assertEqual(restored, text)

    def test_chromadb_guideline_retrieval(self):
        query = "Chest discomfort radiating to left arm and shoulder, diaphoresis"
        res = KnowledgeService.query_guidelines(query, top_k=2)

        self.assertIn("citations", res)
        self.assertGreaterEqual(len(res["citations"]), 1)
        top_citation = res["citations"][0]
        self.assertIn("guideline_id", top_citation)
        self.assertIn("Cardiology", top_citation["category"])
        self.assertEqual(res["confidence"], "HIGH")

    def test_rag_soap_draft_generation(self):
        draft = RagService.generate_soap_draft_sync(
            transcript="Patient Jane Doe has severe productive cough and sore throat for 4 days.",
            patient_info={"name": "Jane Doe", "age": 35, "gender": "Female"},
            language="en",
        )
        self.assertIn("subjective", draft)
        self.assertIn("objective", draft)
        self.assertIn("assessment", draft)
        self.assertIn("plan", draft)
        self.assertIn("citations", draft)
        self.assertIn("disclaimer", draft)
        # Ensure patient name was preserved post-generation
        self.assertIn("Jane Doe", draft["subjective"])

if __name__ == "__main__":
    unittest.main()
