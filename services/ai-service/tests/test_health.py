import unittest
from app.api.v1.health import health_check, readiness_check

def run_sync(coro):
    try:
        coro.send(None)
    except StopIteration as e:
        return e.value

class TestHealthEndpoints(unittest.TestCase):
    def test_health_check(self):
        res = run_sync(health_check())
        self.assertEqual(res["status"], "healthy")
        self.assertEqual(res["service"], "ai-service")
        self.assertIn("timestamp", res)

    def test_readiness_check(self):
        res = run_sync(readiness_check())
        self.assertEqual(res["status"], "ready")
        self.assertEqual(res["checks"]["chroma"], "available")
        self.assertEqual(res["checks"]["redis"], "available")
        self.assertEqual(res["checks"]["ollama"], "available")

if __name__ == "__main__":
    unittest.main()
