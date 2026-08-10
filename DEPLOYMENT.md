# Free cloud deployment

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
