# Free cloud deployment

## Render Blueprint

The repository includes `render.yaml`, which creates the web service and its
PostgreSQL database together.

1. Open Render's **New Blueprint** page and connect this GitHub repository.
2. Enter a strong value for `MADAR_ADMIN_PASSWORD` when prompted.
3. Review the free plans, then apply the Blueprint.
4. Wait for `/health` to report `{"status":"ok"}`.

Render provides an `onrender.com` address and HTTPS automatically. Free web
services sleep when idle, and the free PostgreSQL database is intended only
for previews and currently expires after 30 days. Move to a persistent
database before accepting real customer requests.

## Manual deployment

The project is ready for a Koyeb Web Service and PostgreSQL Database Service.

## Required environment variables

- `DATABASE_URL`: PostgreSQL connection string supplied by the database service.
- `MADAR_ADMIN_PASSWORD`: a unique strong administration password.
- `MADAR_SESSION_SECRET`: at least 32 random characters.
- `MADAR_COOKIE_SECURE`: `true` on the public HTTPS service.

## Service settings

- Source: `deadlyalashram-sudo/madar-tech`, branch `main`
- Builder: Dockerfile
- Instance: Free
- Health check path: `/health`
- Port: `8000` (or the platform-provided `PORT`)

Do not publish the values of the environment variables in GitHub.
