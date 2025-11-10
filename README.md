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

- **Automated Data Extraction**: Utilizes Google's Gemini API to intelligently parse receipt photos and extract key details like total cost, gallons purchased, and transaction date.
- **Flexible Odometer Input**: Supports multiple methods for odometer entry, including manual input, a separate photo of the odometer, or extracting it from the receipt photo itself.
- **Vehicle Management**: Fetches and displays a list of vehicles from your LubeLogger instance, allowing you to associate each gas receipt with the correct vehicle.
- **Secure Authentication**: Integrated with Auth0 to ensure that access to the application is secure and user-specific.
- **Containerized Deployment**: The entire application is containerized using Docker, making setup and deployment straightforward.

## Tech Stack

| Component | Technology |
| :--- | :--- |
| **Frontend** | [Next.js](https://nextjs.org/), [React](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Tailwind CSS](https://tailwindcss.com/), [Auth0](https://auth0.com/) |
| **Backend** | [FastAPI](https://fastapi.tiangolo.com/), [Python](https://www.python.org/), [Google Gemini API](https://ai.google.dev/), [Auth0](https://auth0.com/) |
| **Deployment** | [Docker](https://www.docker.com/), [Docker Compose](https://docs.docker.com/compose/) |

## Getting Started

### Prerequisites

- [Docker](https://www.docker.com/get-started)
- A running instance of [LubeLogger](https://lubelogger.com/)
- An Auth0 account for authentication
- A Google Gemini API key

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/MFRANCIS-git/gasreceiptautomation.git
    cd gasreceiptautomation
    ```

2.  **Configure the environment:**
    Create a `.env` file in the `server` directory and add the following environment variables:

    ```env
    LUBELOGGER_URL=<your-lubelogger-url>
    GOOGLE_API_KEY=<your-google-gemini-api-key>
    AUTH0_DOMAIN=<your-auth0-domain>
    AUTH0_AUDIENCE=<your-auth0-api-audience>
    ```

3.  **Build and run the application:**
    ```bash
    docker-compose up --build
    ```
    The application will be available at `http://localhost:8003`.

## Usage

1.  **Log in**: Access the application and log in using your Auth0 credentials.
2.  **Select a vehicle**: Choose the vehicle you are logging a gas receipt for from the dropdown menu.
3.  **Upload receipt**: Upload a clear photo of your gas receipt.
4.  **Provide odometer reading**: Enter the odometer reading manually or upload a photo of the odometer.
5.  **Submit**: Click the "Submit" button. The application will process the information and create a new gas record in LubeLogger.

## Architecture

The application is composed of two main services:

-   **Client**: A Next.js single-page application that provides the user interface for submitting gas receipts. It communicates with the backend API to submit the data.
-   **Server**: A FastAPI backend that handles the business logic. It receives the receipt and odometer data, uses the Google Gemini API to extract the relevant information, and then creates a new gas record in LubeLogger via its API.

Both services are containerized with Docker and orchestrated using Docker Compose.

> [!NOTE]
> This project is designed to be used with a self-hosted LubeLogger instance. For more information on setting up LubeLogger, please refer to the [official documentation](https://docs.lubelogger.com/).
