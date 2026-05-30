FROM python:3.12-alpine

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

ENV PATH="/app/.venv/bin:$PATH"

# COPY requirements.txt .
COPY . .

# RUN pip install --no-cache-dir -r requirements.txt

RUN uv sync --locked --no-cache --no-dev

# COPY . .

EXPOSE 8002

CMD ["uv", "run", "fastapi", "run", "main.py", "--port", "8002"]
