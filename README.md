<h1 align="center">
  Gas Receipt Automation
  <br>
</h1>

<h4 align="center">A tool to automate entering gas receipts into <a href="https://lubelogger.com/" target="_blank">LubeLogger</a>.</h4>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#usage">Usage</a> •
  <a href="#architecture">Architecture</a>
</p>

---

Gas Receipt Automation is a full-stack application for logging fuel expenses. Users upload a gas receipt and provide an odometer reading. An LLM extracts receipt details, the user reviews and corrects those details, and the application submits the confirmed record to [LubeLogger](https://lubelogger.com/).

## Features

- **Automated data extraction**: Extracts total cost, gallons purchased, date, store, and address from receipt photos using an OpenAI-compatible LLM API.
- **Receipt review**: Shows extracted values for review and correction before submitting anything to LubeLogger.
- **Flexible odometer input**: Supports manual entry, a separate odometer photo, or an odometer reading written on the receipt.
- **HEIC/HEIF support**: Converts iOS receipt and odometer images through `pillow-heif`.
- **Vehicle management**: Loads vehicles from LubeLogger and hides vehicles marked with the `showInReceiptApp=false` extra field.
- **OIDC authentication**: Protects the application and API with OpenID Connect bearer-token authentication.
- **Validation**: Validates required fields and confirmed numeric/date values before uploading files or creating a LubeLogger record.
- **Containerized deployment**: Builds the React client and FastAPI server into one Docker image and runs it with Docker Compose.

## Tech Stack

| Component | Technology |
| :--- | :--- |
| **Frontend** | [Vite](https://vite.dev/), [React](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Tailwind CSS](https://tailwindcss.com/), [react-oidc-context](https://github.com/authts/react-oidc-context), [Sentry](https://sentry.io/) |
| **Backend** | [FastAPI](https://fastapi.tiangolo.com/), [Python](https://www.python.org/) 3.13+, [uv](https://docs.astral.sh/uv/), [OpenAI SDK](https://pypi.org/project/openai/), [Pillow](https://python-pillow.org/), [pillow-heif](https://github.com/bigcatyelps/pillow_heif), [PyJWT](https://pyjwt.readthedocs.io/) |
| **Deployment** | [Docker](https://www.docker.com/), [Docker Compose](https://docs.docker.com/compose/) |

## Getting Started

### Prerequisites

- [Docker](https://www.docker.com/get-started) with Docker Compose
- A running [LubeLogger](https://lubelogger.com/) instance, or use the bundled Compose service
- An OIDC identity provider
- An LLM API key for an OpenAI-compatible provider, such as Google Gemini or OpenAI

### Production-style Docker setup

1. Clone the repository:

   ```bash
   git clone https://github.com/masoncfrancis/gasreceiptautomation.git
   cd gasreceiptautomation
   ```

2. Copy the root environment template and fill in its values:

   ```bash
   cp .env.example .env.production
   ```

   Configure these groups in `.env.production`:

   - **Server**: `PORT`, `LUBELOGGER_URL`, `LLM_API_KEY`, optional `LLM_BASE_URL`, `LLM_MODEL`, and optional `SENTRY_DSN`
   - **OIDC validation**: `OIDC_ISSUER`, `OIDC_AUDIENCE`, and optional `OIDC_ALGORITHMS`
   - **Browser runtime configuration**: `PUBLIC_OIDC_ISSUER`, `PUBLIC_OIDC_CLIENT_ID`, `PUBLIC_OIDC_AUDIENCE`, and `PUBLIC_OIDC_REDIRECT_URI`
   - **Browser monitoring**: optional `PUBLIC_SENTRY_DSN`

   `PUBLIC_*` values are served to the browser through `/config.js`. They are not secrets. Keep LLM keys and other private values out of source control.

3. Build and start the application and bundled LubeLogger instance:

   ```bash
   docker compose up --build
   ```

   The application is available at `http://localhost:8003`. The bundled LubeLogger instance is available at `http://localhost:8080`.

### Local development

For the split client/server Docker setup, create environment files from the checked-in examples:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Start the application without bundled LubeLogger:

```bash
docker compose -f docker/dev.docker-compose.yaml up --build
```

Start it with bundled LubeLogger:

```bash
docker compose -f docker/dev.lubelogger.docker-compose.yml up --build
```

For frontend-only development, install dependencies in `client` and run Vite:

```bash
cd client
npm ci
npm run dev
```

The Vite proxy targets `http://localhost:8002` during local development.

## Usage

1. **Log in** through the configured OIDC provider.
2. **Select a vehicle** loaded from LubeLogger.
3. **Upload a receipt photo**.
4. **Choose an odometer method**:
   - Take or upload a separate odometer photo.
   - Use an odometer reading written on the receipt.
   - Enter the reading manually.
5. **Answer fuel-history questions** about whether the tank was filled fully and whether the form was completed during the previous fill-up.
6. **Review the receipt**. The application sends images to the configured LLM and displays extracted values. This preview does not submit a record to LubeLogger.
7. **Correct missing or incorrect values**, then select **Submit Receipt**.
8. The server uploads receipt images to LubeLogger and creates the gas record using the confirmed values.

## API

The authenticated API is served under `/api`:

- `GET /api/vehicles`: Return vehicles available for receipt logging.
- `POST /api/previewGas`: Extract receipt and odometer values for review.
- `POST /api/submitGas`: Submit confirmed values and attachments to LubeLogger.
- `GET /api/health`: Check whether the server can reach LubeLogger.

FastAPI also exposes its generated documentation at `/docs` when the application is running.

## Architecture

The production deployment contains two services:

- **App**: A multi-stage Docker image builds the Vite React client, serves its static files from FastAPI, and exposes the authenticated `/api` endpoints on port `8003`.
- **LubeLogger**: The official LubeLogger image stores vehicle and gas records, plus uploaded documents, in Docker volumes and exposes port `8080`.

The server uses the configured LLM provider to extract data from images. It returns extracted data to the client for confirmation, then sends only confirmed values to LubeLogger. Docker Compose provides service networking and the application health check at `/api/health`.

> [!NOTE]
> This project is designed to work with a self-hosted LubeLogger instance. See the [LubeLogger documentation](https://docs.lubelogger.com/) for setup and configuration details.
