import hashlib
import hmac
import os
import secrets
import time
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request, Response, status
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import create_engine, text


ROOT = Path(__file__).resolve().parent
DB_PATH = ROOT / "madar_service.db"
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DB_PATH.as_posix()}")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)
ADMIN_PASSWORD = os.getenv("MADAR_ADMIN_PASSWORD", "ChangeMe123!")
SESSION_SECRET = os.getenv("MADAR_SESSION_SECRET", "local-development-secret").encode()
SESSION_MAX_AGE = 8 * 60 * 60
COOKIE_SECURE = os.getenv("MADAR_COOKIE_SECURE", "false").lower() == "true"

engine = create_engine(DATABASE_URL, pool_pre_ping=True)

app = FastAPI(title="Madar Service Center", docs_url="/api/docs")
app.mount("/assets", StaticFiles(directory=ROOT / "assets"), name="assets")


def init_db() -> None:
    id_definition = (
        "INTEGER PRIMARY KEY AUTOINCREMENT"
        if DATABASE_URL.startswith("sqlite")
        else "BIGSERIAL PRIMARY KEY"
    )
    with engine.begin() as connection:
        connection.execute(text(f"""
            CREATE TABLE IF NOT EXISTS service_requests (
                id {id_definition},
                ticket_code TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                phone TEXT NOT NULL,
                customer_type TEXT NOT NULL,
                city TEXT NOT NULL,
                service TEXT NOT NULL,
                visit_type TEXT NOT NULL,
                visit_day TEXT NOT NULL,
                timing TEXT NOT NULL,
                details TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'new',
                admin_note TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """))


init_db()


class ServiceRequestCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    phone: str = Field(min_length=10, max_length=16)
    customer_type: str = Field(min_length=2, max_length=60)
    city: str = Field(min_length=2, max_length=60)
    service: str = Field(min_length=2, max_length=100)
    visit_type: str = Field(min_length=2, max_length=100)
    visit_day: str = Field(min_length=2, max_length=60)
    timing: str = Field(min_length=2, max_length=60)
    details: str = Field(min_length=10, max_length=2000)

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str) -> str:
        normalized = value.replace(" ", "").replace("-", "")
        if normalized.startswith("+9665") and len(normalized) == 13:
            return normalized
        if normalized.startswith("9665") and len(normalized) == 12:
            return "+" + normalized
        if normalized.startswith("05") and len(normalized) == 10:
            return normalized
        raise ValueError("Invalid Saudi mobile number")


class AdminLogin(BaseModel):
    password: str


class RequestUpdate(BaseModel):
    status: str
    admin_note: str = Field(default="", max_length=1000)

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        allowed = {"new", "contacted", "scheduled", "in_progress", "completed", "cancelled"}
        if value not in allowed:
            raise ValueError("Invalid status")
        return value


def ticket_code() -> str:
    return f"MT-{datetime.now():%y%m}-{secrets.token_hex(2).upper()}"


def make_session() -> str:
    expires = str(int(time.time()) + SESSION_MAX_AGE)
    signature = hmac.new(SESSION_SECRET, expires.encode(), hashlib.sha256).hexdigest()
    return f"{expires}.{signature}"


def require_admin(request: Request) -> None:
    madar_admin = request.cookies.get("madar_admin")
    if not madar_admin:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Login required")
    try:
        expires, signature = madar_admin.split(".", 1)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail="Invalid session") from exc
    expected = hmac.new(SESSION_SECRET, expires.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(signature, expected) or int(expires) < int(time.time()):
        raise HTTPException(status_code=401, detail="Session expired")


@app.get("/")
def home():
    return FileResponse(ROOT / "index.html")


@app.get("/health")
def health():
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))
    return {"status": "ok"}


@app.get("/track")
def tracking_page():
    return FileResponse(ROOT / "tracking.html")


@app.get("/admin")
def admin_page():
    return FileResponse(ROOT / "admin.html")


@app.get("/{filename}")
def static_file(filename: str):
    allowed = {"styles.css", "enhancements.css", "script.js", "i18n.js", "admin.js", "tracking.js"}
    if filename not in allowed:
        raise HTTPException(status_code=404)
    return FileResponse(ROOT / filename)


@app.post("/api/requests", status_code=201)
def create_request(payload: ServiceRequestCreate):
    now = datetime.now(timezone.utc).isoformat()
    code = ticket_code()
    with engine.begin() as connection:
        connection.execute(text("""
            INSERT INTO service_requests (
                ticket_code, name, phone, customer_type, city, service,
                visit_type, visit_day, timing, details, created_at, updated_at
            ) VALUES (
                :ticket_code, :name, :phone, :customer_type, :city, :service,
                :visit_type, :visit_day, :timing, :details, :created_at, :updated_at
            )
            """), {
                "ticket_code": code, "name": payload.name, "phone": payload.phone,
                "customer_type": payload.customer_type, "city": payload.city,
                "service": payload.service, "visit_type": payload.visit_type,
                "visit_day": payload.visit_day, "timing": payload.timing,
                "details": payload.details, "created_at": now, "updated_at": now,
            })
    return {"ticket_code": code, "status": "new"}


@app.get("/api/requests/track")
def track_request(ticket_code: str, phone: str):
    normalized = phone.replace(" ", "").replace("-", "")
    with engine.connect() as connection:
        row = connection.execute(text(
            "SELECT ticket_code, service, city, status, admin_note, created_at, updated_at, phone "
            "FROM service_requests WHERE UPPER(ticket_code) = UPPER(:ticket_code)"
        ), {"ticket_code": ticket_code}).mappings().first()
    if not row or not row["phone"].replace(" ", "").replace("-", "").endswith(normalized[-4:]):
        raise HTTPException(status_code=404, detail="Request not found")
    result = dict(row)
    result.pop("phone", None)
    return result


@app.post("/api/admin/login")
def admin_login(payload: AdminLogin, response: Response):
    if not hmac.compare_digest(payload.password, ADMIN_PASSWORD):
        raise HTTPException(status_code=401, detail="Incorrect password")
    response.set_cookie(
        "madar_admin", make_session(), max_age=SESSION_MAX_AGE,
        httponly=True, samesite="strict", secure=COOKIE_SECURE,
    )
    return {"ok": True}


@app.post("/api/admin/logout")
def admin_logout(response: Response):
    response.delete_cookie("madar_admin")
    return {"ok": True}


@app.get("/api/admin/requests")
def list_requests(request: Request, status_filter: str | None = None):
    require_admin(request)
    query = "SELECT * FROM service_requests"
    if status_filter:
        query += " WHERE status = :status_filter"
        params = {"status_filter": status_filter}
    else:
        params = {}
    query += " ORDER BY id DESC"
    with engine.connect() as connection:
        rows = connection.execute(text(query), params).mappings().all()
    return [dict(row) for row in rows]


@app.patch("/api/admin/requests/{request_id}")
def update_request(request: Request, request_id: int, payload: RequestUpdate):
    require_admin(request)
    now = datetime.now(timezone.utc).isoformat()
    with engine.begin() as connection:
        result = connection.execute(text(
            "UPDATE service_requests SET status = :status, admin_note = :admin_note, "
            "updated_at = :updated_at WHERE id = :request_id"
        ), {
            "status": payload.status, "admin_note": payload.admin_note,
            "updated_at": now, "request_id": request_id,
        })
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Request not found")
    return {"ok": True}
