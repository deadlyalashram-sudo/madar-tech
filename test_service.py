import os
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent
TEST_DB = ROOT / "test_launch.db"
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB.as_posix()}"
os.environ["MADAR_ADMIN_PASSWORD"] = "LaunchTestPassword!"
os.environ["MADAR_SESSION_SECRET"] = "launch-test-secret-that-is-long-enough-123"
os.environ["MADAR_COOKIE_SECURE"] = "false"
os.environ["MADAR_ALLOWED_HOSTS"] = "testserver,localhost,127.0.0.1"

from fastapi.testclient import TestClient  # noqa: E402
import server  # noqa: E402

VALID_REQUEST = {
    "name": "عميل الاختبار", "phone": "0503333301",
    "customer_type": "فرد / منزل", "city": "الجبيل",
    "service": "كاميرات المراقبة", "visit_type": "زيارة ميدانية للموقع",
    "visit_day": "خلال هذا الأسبوع", "timing": "مساءً (5 - 8)",
    "payment_method": "أحددها لاحقًا",
    "details": "تركيب أربع كاميرات مع جهاز تسجيل وربط المشاهدة عن بعد.",
}


class LaunchReadinessTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        server.RATE_WINDOWS.clear()
        cls.client = TestClient(server.app)

    def setUp(self):
        server.RATE_WINDOWS.clear()
        with server.engine.begin() as connection:
            connection.execute(server.text("DELETE FROM service_requests"))

    def test_public_pages_and_security_headers(self):
        for path in ("/", "/track", "/admin", "/styles.css", "/script.js"):
            response = self.client.get(path)
            self.assertEqual(response.status_code, 200, path)
            self.assertEqual(response.headers["x-frame-options"], "DENY")
            self.assertIn("frame-ancestors 'none'", response.headers["content-security-policy"])
        self.assertEqual(self.client.get("/private.env").status_code, 404)

    def test_health(self):
        self.assertEqual(self.client.get("/health").json(), {"status": "ok"})

    def test_complete_customer_and_admin_flow(self):
        created = self.client.post("/api/requests", json=VALID_REQUEST)
        self.assertEqual(created.status_code, 201, created.text)
        ticket = created.json()["ticket_code"]
        self.assertRegex(ticket, r"^MT-\d{4}-[A-F0-9]{8}$")
        self.assertEqual(self.client.get("/api/requests/track", params={"ticket_code": ticket, "phone": "9999"}).status_code, 404)
        tracked = self.client.get("/api/requests/track", params={"ticket_code": ticket.lower(), "phone": "3301"})
        self.assertEqual(tracked.status_code, 200)
        self.assertNotIn("phone", tracked.json())
        self.assertEqual(self.client.get("/api/admin/requests").status_code, 401)
        self.assertEqual(self.client.post("/api/admin/login", json={"password": "wrong"}).status_code, 401)
        login = self.client.post("/api/admin/login", json={"password": "LaunchTestPassword!"})
        self.assertEqual(login.status_code, 200)
        self.assertIn("HttpOnly", login.headers["set-cookie"])
        self.assertIn("SameSite=strict", login.headers["set-cookie"])
        requests = self.client.get("/api/admin/requests")
        self.assertEqual(len(requests.json()), 1)
        request_id = requests.json()[0]["id"]
        updated = self.client.patch(f"/api/admin/requests/{request_id}", json={"status": "scheduled", "admin_note": "الموعد مؤكد غدًا."})
        self.assertEqual(updated.status_code, 200)
        tracked = self.client.get("/api/requests/track", params={"ticket_code": ticket, "phone": "3301"})
        self.assertEqual(tracked.json()["status"], "scheduled")
        self.assertEqual(tracked.json()["admin_note"], "الموعد مؤكد غدًا.")
        self.assertEqual(self.client.post("/api/admin/logout").status_code, 200)
        self.assertEqual(self.client.get("/api/admin/requests").status_code, 401)

    def test_validation_rejects_bad_input(self):
        invalid = {**VALID_REQUEST, "phone": "123", "details": "قصير"}
        self.assertEqual(self.client.post("/api/requests", json=invalid).status_code, 422)
        self.assertEqual(self.client.get("/api/requests/track", params={"ticket_code": "MT-0000-NONE", "phone": "abcd"}).status_code, 400)

    def test_rate_limits_sensitive_endpoints(self):
        for _ in range(8):
            self.client.post("/api/admin/login", json={"password": "wrong"})
        self.assertEqual(self.client.post("/api/admin/login", json={"password": "wrong"}).status_code, 429)

    def test_cors_and_oversized_payload_protection(self):
        allowed = self.client.options(
            "/api/requests",
            headers={
                "Origin": "https://abdullah-tech.pages.dev",
                "Access-Control-Request-Method": "POST",
            },
        )
        self.assertEqual(allowed.headers.get("access-control-allow-origin"), "https://abdullah-tech.pages.dev")
        blocked = self.client.options(
            "/api/requests",
            headers={"Origin": "https://attacker.example", "Access-Control-Request-Method": "POST"},
        )
        self.assertNotIn("access-control-allow-origin", blocked.headers)
        oversized = self.client.post(
            "/api/requests",
            content=b"x" * (64 * 1024 + 1),
            headers={"Content-Type": "application/json"},
        )
        self.assertEqual(oversized.status_code, 413)


if __name__ == "__main__":
    unittest.main(verbosity=2)
