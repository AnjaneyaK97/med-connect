import unittest
from app.services.whisper_service import WhisperService

class TestWhisperService(unittest.TestCase):
    def test_transcribe_english_fallback(self):
        # Create minimal simulated WebM audio bytes
        mock_audio = b"\x1a\x45\xdf\xa3" + b"\x00" * 64

        res = WhisperService.transcribe_audio_bytes_sync(
            audio_bytes=mock_audio,
            filename="patient_symptoms.webm",
            language="en",
        )
        self.assertIn("text", res)
        self.assertIn("chest", res["text"].lower())
        self.assertEqual(res["language"], "en")
        self.assertGreater(res["duration_seconds"], 0)
        self.assertIsInstance(res["segments"], list)

    def test_transcribe_hindi_multilingual(self):
        mock_audio = b"\x1a\x45\xdf\xa3" + b"\x00" * 64

        res = WhisperService.transcribe_audio_bytes_sync(
            audio_bytes=mock_audio,
            filename="patient_symptoms_hindi.webm",
            language="hi",
        )
        self.assertEqual(res["language"], "hi")
        self.assertIn("दर्द", res["text"])

if __name__ == "__main__":
    unittest.main()
