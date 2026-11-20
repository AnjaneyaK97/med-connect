import unittest
from app.services.red_flag_engine import RedFlagEngine
from app.services.triage_service import TriageService

class TestRedFlagAndTriageEngine(unittest.TestCase):
    def test_acute_coronary_syndrome_english(self):
        text = "I am having sudden crushing chest pain radiating to my left arm and cold sweats for 45 minutes."
        result = RedFlagEngine.evaluate(text, language="en")

        self.assertTrue(result["is_red_flag"])
        self.assertEqual(result["severity"], "EMERGENCY")
        self.assertTrue(any("Acute Coronary Syndrome" in r for r in result["triggered_rules"]))
        self.assertIn("911/112", result["advisory"])

    def test_acute_coronary_syndrome_hindi(self):
        text = "मेरे सीने में गंभीर दर्द और भारीपन है और सांस लेने में बहुत तकलीफ हो रही है।"
        result = RedFlagEngine.evaluate(text, language="hi")

        self.assertTrue(result["is_red_flag"])
        self.assertEqual(result["severity"], "EMERGENCY")
        self.assertIn("आपातकालीन", result["advisory"])

    def test_acute_stroke_detection(self):
        text = "Patient developed sudden facial droop and slurred speech 20 minutes ago while eating lunch."
        result = RedFlagEngine.evaluate(text, language="en")

        self.assertTrue(result["is_red_flag"])
        self.assertTrue(any("Stroke" in r for r in result["triggered_rules"]))
        self.assertEqual(result["severity"], "EMERGENCY")

    def test_severe_anaphylaxis_detection(self):
        text = "Ate peanuts and now throat closing up, swollen lips and widespread hives, cannot breathe."
        result = RedFlagEngine.evaluate(text, language="en")

        self.assertTrue(result["is_red_flag"])
        self.assertTrue(any("Anaphylaxis" in r for r in result["triggered_rules"]))

    def test_routine_symptom_negative_control(self):
        text = "Mild headache and runny nose for 2 days after working on laptop."
        result = RedFlagEngine.evaluate(text, language="en")

        self.assertFalse(result["is_red_flag"])
        self.assertEqual(result["severity"], "LOW")
        self.assertEqual(len(result["triggered_rules"]), 0)
        self.assertIsNone(result["advisory"])

    def test_triage_service_structured_summary(self):
        text = "Mild cough, slight fever and fatigue for 3 days. No chest pain."
        summary = TriageService.analyze_triage(text, language="en")

        self.assertFalse(summary["is_red_flag"])
        self.assertIn("Cough", summary["symptoms"])
        self.assertIn("Fever", summary["symptoms"])
        self.assertIn("3 days", summary["duration"])
        self.assertIn(summary["severity"], ["LOW", "MEDIUM"])
        self.assertIn(summary["recommended_specialty"], ["Pulmonology", "General Medicine"])

if __name__ == "__main__":
    unittest.main()
