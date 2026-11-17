FROM python:3.14-alpine

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

ENV PATH="/app/.venv/bin:$PATH"

# COPY requirements.txt .
COPY . .

ENV PATH="/app/.venv/bin:$PATH"

# RUN pip install --no-cache-dir -r requirements.txt

RUN uv sync --locked --no-cache --no-dev --compile-bytecode

# COPY . .

EXPOSE 8002

CMD ["fastapi", "run", "main.py", "--port", "8002"]
