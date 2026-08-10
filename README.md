# Madar Tech

Bilingual Arabic and English one-page website for technical field services in Saudi Arabia's Eastern Province.

## Services

- CCTV installation and maintenance
- Computer repair and upgrades
- Network and router configuration
- Servers, NAS, and basic virtualization

## Integrated local server

Run the API and website together:

```powershell
..\venv\Scripts\python.exe -m uvicorn server:app --host 127.0.0.1 --port 8082
```

- Website: `http://127.0.0.1:8082/`
- Customer tracking: `http://127.0.0.1:8082/track`
- Administration: `http://127.0.0.1:8082/admin`
- API docs: `http://127.0.0.1:8082/api/docs`

Before production, set strong environment values for `MADAR_ADMIN_PASSWORD` and
`MADAR_SESSION_SECRET`. The local development password is `ChangeMe123!`.

## Business configuration

The public phone and WhatsApp links are configured in `index.html`. Customer
requests are stored in the local SQLite database and managed from `/admin`.
GitHub Pages can host only the static public page; production request tracking
requires deploying `server.py` on a Python hosting service.
