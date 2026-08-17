import json
import sqlite3
import sys
import unittest
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path


BASE_URL = "http://127.0.0.1:8082"
DB_PATH = Path(__file__).with_name("madar_service.db")


def get_status(path: str) -> int:
    try:
        with urllib.request.urlopen(f"{BASE_URL}{path}"):
            return 200
    except urllib.error.HTTPError as exc:
        return exc.code


def post_status(path: str, payload: dict) -> int:
    request = urllib.request.Request(
        f"{BASE_URL}{path}",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request) as response:
            return response.status
    except urllib.error.HTTPError as exc:
        return exc.code


def cleanup_pressure_requests() -> int:
    with sqlite3.connect(DB_PATH) as connection:
        count = connection.execute(
            "SELECT COUNT(*) FROM service_requests "
            "WHERE phone BETWEEN '0503333300' AND '0503333399'"
        ).fetchone()[0]
        connection.execute(
            "DELETE FROM service_requests "
            "WHERE phone BETWEEN '0503333300' AND '0503333399'"
        )
    return count


class LiveServiceTests(unittest.TestCase):
    def test_health(self):
        self.assertEqual(get_status("/health"), 200)

    def test_tracking_rejects_empty_phone(self):
        query = urllib.parse.urlencode({"ticket_code": "MT-0000-NONE", "phone": ""})
        self.assertEqual(get_status(f"/api/requests/track?{query}"), 400)

    def test_tracking_rejects_non_numeric_phone(self):
        query = urllib.parse.urlencode({"ticket_code": "MT-0000-NONE", "phone": "abcd"})
        self.assertEqual(get_status(f"/api/requests/track?{query}"), 400)

    def test_unknown_tracking_data_is_hidden(self):
        query = urllib.parse.urlencode({"ticket_code": "MT-0000-NONE", "phone": "0000"})
        self.assertEqual(get_status(f"/api/requests/track?{query}"), 404)

    def test_admin_requests_require_login(self):
        self.assertEqual(get_status("/api/admin/requests"), 401)

    def test_invalid_request_is_rejected(self):
        payload = {
            "name": "ا",
            "phone": "123",
            "customer_type": "فرد",
            "city": "الجبيل",
            "service": "كاميرات",
            "visit_type": "زيارة",
            "visit_day": "اليوم",
            "timing": "مساء",
            "details": "قصير",
        }
        self.assertEqual(post_status("/api/requests", payload), 422)


if __name__ == "__main__":
    if "--cleanup-pressure" in sys.argv:
        print(f"Deleted pressure-test requests: {cleanup_pressure_requests()}")
    else:
        unittest.main()
