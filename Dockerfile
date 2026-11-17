FROM node:lts-alpine AS client-builder

WORKDIR /client

COPY client/package*.json ./
RUN npm ci

COPY client/ ./
RUN npm run build

FROM python:3.14-alpine
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app
# ENV PATH="/app/.venv/bin:$PATH"

COPY server/pyproject.toml server/uv.lock ./
RUN uv sync --no-dev --compile-bytecode

RUN apk add --no-cache curl

COPY server/ ./
COPY --from=client-builder /client/dist /app/static

EXPOSE 8003

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl --fail http://localhost:8003/api/health || exit 1

CMD ["uv", "run", "fastapi", "run", "main.py", "--port", "8003"]
