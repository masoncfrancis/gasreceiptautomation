<h1 align="center">
  Gas Receipt Automation
  <br>
</h1>

<h4 align="center">A tool to automate the process of entering gas receipts into <a href="https://lubelogger.com/" target="_blank">LubeLogger</a>.</h4>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#usage">Usage</a> •
  <a href="#architecture">Architecture</a>
</p>

---

Gas Receipt Automation is a full-stack application designed to streamline the process of logging fuel expenses. Users can submit a photo of their gas receipt and odometer, and the application will automatically extract the relevant information using AI and record it in [LubeLogger](https://lubelogger.com/), a self-hosted service for vehicle maintenance tracking.

## Features

- **Automated Data Extraction**: Uses the OpenAI SDK to parse receipt photos and extract total cost, gallons purchased, date, store, and address.
- **Flexible Odometer Input**: Supports multiple methods for odometer entry, including manual input, a separate photo of the odometer, or extracting it from the receipt photo itself.
- **HEIC/HEIF Support**: Automatically handles iOS HEIC/HEIF image formats for receipt and odometer photos.
- **Vehicle Management**: Fetches and displays a list of vehicles from your LubeLogger instance, allowing you to associate each gas receipt with the correct vehicle.
- **Secure Authentication**: Integrated with OpenID Connect (OIDC) to ensure that access to the application is secure and user-specific.
- **Containerized Deployment**: The entire application is containerized using Docker, making setup and deployment straightforward.

## Tech Stack

| Component | Technology |
| :--- | :--- |
| **Frontend** | [Vite](https://vite.dev/), [React](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Tailwind CSS](https://tailwindcss.com/), [oidc-client-ts](https://github.com/authts/oidc-client-ts), [nginx](https://nginx.org/) |
| **Backend** | [FastAPI](https://fastapi.tiangolo.com/), [Python](https://www.python.org/), [uv](https://docs.astral.sh/uv/), [OpenAI SDK](https://pypi.org/project/openai/) (LLM-agnostic), [PyJWT](https://pyjwt.readthedocs.io/) (OIDC), [Pillow](https://python-pillow.org/) |
| **Deployment** | [Docker](https://www.docker.com/), [Docker Compose](https://docs.docker.com/compose/) |

## Getting Started

### Prerequisites

- [Docker](https://www.docker.com/get-started)
- [Docker Compose](https://docs.docker.com/compose/install/)
- A running instance of [LubeLogger](https://lubelogger.com/)
- An OIDC identity provider (e.g. Auth0) for authentication
- An LLM API key (e.g. Google Gemini, OpenAI, etc.)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/FrancisLaboratories/gasreceiptautomation.git
    cd gasreceiptautomation
    ```

2.  **Configure the environment:**
    Create a `.env` file in the `server` directory and add the following environment variables:

    ```env
    LUBELOGGER_URL=<your-lubelogger-url>
    LLM_API_KEY=<your-llm-api-key>
    LLM_BASE_URL=<your-llm-base-url>  # optional, defaults to Google Gemini OpenAI-compat endpoint
    LLM_MODEL=<model-name>            # optional, defaults to gemini-2.5-flash-lite
    OIDC_ISSUER=<your-oidc-issuer>
    OIDC_AUDIENCE=<your-oidc-api-audience>
    ```

    Create a `.env` file in the `client` directory and add the following environment variables:
    ```env
    VITE_OIDC_ISSUER=<your-oidc-issuer>
    VITE_OIDC_CLIENT_ID=<your-oidc-client-id>
    VITE_OIDC_REDIRECT_URI=<your-oidc-redirect-uri>
    VITE_OIDC_AUDIENCE=<your-oidc-api-audience>
    ```

3.  **Build and run the application:**
    ```bash
    docker compose up --build
    ```

    To also spin up a bundled LubeLogger instance:
    ```bash
    docker compose -f docker-compose.yaml -f docker-compose.lubelogger.yml up --build
    ```

    The application will be available at `http://localhost:8003`.

## Usage

1.  **Log in**: Access the application and log in using your OIDC provider (e.g. Auth0) credentials.
2.  **Select a vehicle**: Choose the vehicle you are logging a gas receipt for from the dropdown menu.
3.  **Upload receipt**: Upload a clear photo of your gas receipt.
4.  **Provide odometer reading**: Enter the odometer reading manually or upload a photo of the odometer.
5.  **Review**: Click "Review Receipt". The application extracts receipt and odometer details without contacting LubeLogger.
6.  **Confirm and submit**: Correct any extracted values, then click "Send to LubeLogger" to create the gas record.

## Architecture

The application is composed of two main services:

-   **Client**: A [Vite](https://vite.dev/)-built React single-page application served by [nginx](https://nginx.org/). It provides the user interface for submitting gas receipts and communicates with the backend API.
-   **Server**: A FastAPI backend that extracts receipt and odometer data, returns it for user confirmation, then creates a gas record in LubeLogger from confirmed values.

Both services are containerized with Docker and orchestrated using Docker Compose.

> [!NOTE]
> This project is designed to be used with a self-hosted LubeLogger instance. For more information on setting up LubeLogger, please refer to the [official documentation](https://docs.lubelogger.com/).
