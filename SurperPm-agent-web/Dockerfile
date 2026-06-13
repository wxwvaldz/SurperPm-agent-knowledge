# Stage 1: build frontend
FROM node:20-alpine AS frontend
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: backend + serve frontend statics
FROM python:3.11-slim AS runtime
WORKDIR /app

# Backend deps
COPY backend/pyproject.toml backend/README.md ./backend/
RUN pip install --no-cache-dir -e ./backend

# Backend code
COPY backend/app ./backend/app

# Frontend dist
COPY --from=frontend /app/dist ./frontend/dist

EXPOSE 8000
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
