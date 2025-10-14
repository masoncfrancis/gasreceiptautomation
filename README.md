# Gas Receipt Automation

A tool to automate the process of entering gas receipts into [LubeLogger](https://lubelogger.com/). Users can submit a photo of their gas receipt and odometer reading, and the tool will automatically extract the relevant information using AI and enter it into LubeLogger.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [Option 1: Running with Docker Compose (Recommended)](#option-1-running-with-docker-compose-recommended)
  - [Option 2: Local Development Setup](#option-2-local-development-setup)
- [Environment Variables](#environment-variables)
  - [Server Environment Variables](#server-environment-variables)
  - [Client Environment Variables](#client-environment-variables)
- [Configuration](#configuration)
  - [Setting up Auth0](#setting-up-auth0)
  - [Setting up Google Gemini API](#setting-up-google-gemini-api)
  - [Setting up LubeLogger](#setting-up-lubelogger)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Troubleshooting](#troubleshooting)

## Features

- 📸 Upload gas receipt photos and automatically extract data using AI
- 🚗 Support for multiple vehicles via LubeLogger
- 📊 Automatic odometer reading extraction
- 🔐 Secure authentication via Auth0
- 🐳 Docker support for easy deployment
- 🎨 Modern, responsive UI built with Next.js and Tailwind CSS

## Tech Stack

### Frontend

- React
- Next.js
- TypeScript
- Node.js
- Tailwind CSS
- Docker
- Auth0 (authentication)

### Backend

- FastAPI (Python)
- Google Gemini API (AI-powered receipt processing)
- Python 3.12
- Docker
- Auth0 (authentication)
- LubeLogger API (vehicle maintenance tracking)

## Prerequisites

Before you begin, ensure you have the following installed:

- **Docker** and **Docker Compose** (for Docker setup)
- **Python 3.12+** (for local development)
- **Node.js 20+** and **npm** (for local development)
- **LubeLogger instance** (running and accessible)
- **Auth0 account** (for authentication)
- **Google Gemini API key** (for AI receipt processing)

## Getting Started

### Option 1: Running with Docker Compose (Recommended)

This is the easiest way to get the application running.

#### 1. Clone the repository

```bash
git clone https://github.com/masoncfrancis/gasreceiptautomation.git
cd gasreceiptautomation
```

#### 2. Configure environment variables

**Server configuration:**

```bash
cd server
cp .env.example .env
# Edit .env with your actual values
nano .env  # or use your preferred editor
cd ..
```

**Client configuration (if building client with Docker):**

For Docker builds, environment variables need to be set at build time. You can either:

1. Pass them as build args in your docker-compose file, or
2. Create a `.env` file in the client directory (not committed to git)

```bash
cd client
cp .env.example .env
# Edit .env with your actual values
nano .env  # or use your preferred editor
cd ..
```

See the [Environment Variables](#environment-variables) section for details on what values to set.

#### 3. Run with Docker Compose

**To run the app with LubeLogger included:**

```bash
docker-compose -f docker-compose.lubelogger.yml up -d
```

This will start:
- Client (Frontend) on port 8003
- Server (Backend) - accessed internally via client proxy at `/api/`
- LubeLogger on port 8080

**To run just the app (if you have LubeLogger running separately):**

```bash
docker-compose up -d
```

#### 4. Access the application

- **Frontend:** http://localhost:8003
- **Backend API:** Accessible via the frontend at http://localhost:8003/api/
- **LubeLogger:** http://localhost:8080 (if using docker-compose.lubelogger.yml)

**Note:** In Docker mode, the backend is accessed through an nginx proxy in the client container and is not exposed directly.

### Option 2: Local Development Setup

For active development, running locally provides faster iteration.

#### 1. Clone the repository

```bash
git clone https://github.com/masoncfrancis/gasreceiptautomation.git
cd gasreceiptautomation
```

#### 2. Set up LubeLogger

You can run LubeLogger with Docker:

```bash
docker-compose -f docker-compose-dev.yaml up -d
```

This starts LubeLogger on port 8080.

#### 3. Set up the Backend (Server)

```bash
cd server

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env with your actual values
nano .env  # or use your preferred editor

# Run the server
fastapi dev main.py --port 8002
```

The backend will be available at http://localhost:8002

#### 4. Set up the Frontend (Client)

In a new terminal:

```bash
cd client

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env.local
# Edit .env.local with your actual values
# Important: Set NEXT_PUBLIC_SERVER_URL=http://localhost:8002 for local development
nano .env.local  # or use your preferred editor

# Run the development server
npm run dev
```

The frontend will be available at http://localhost:3000

**Important for local development:** Make sure to set `NEXT_PUBLIC_SERVER_URL=http://localhost:8002` in your `.env.local` file so the frontend can connect to your local backend server.

## Environment Variables

### Server Environment Variables

Create a `.env` file in the `server/` directory with the following variables:

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `LUBELOGGER_URL` | URL of your LubeLogger instance | ✅ Yes | `http://localhost:8080` or `http://lubelogger:8080` (Docker) |
| `GEMINI_API_KEY` | Google Gemini API key for AI processing | ✅ Yes | `AIza...` |
| `AUTH0_DOMAIN` | Your Auth0 domain | ✅ Yes | `your-app.us.auth0.com` |
| `AUTH0_API_AUDIENCE` | Auth0 API audience identifier | ✅ Yes | `https://your-api-identifier` |
| `AUTH0_ISSUER` | Auth0 issuer URL | ✅ Yes | `https://your-app.us.auth0.com/` |
| `AUTH0_ALGORITHMS` | JWT algorithm (default: RS256) | ❌ No | `RS256` |

**Example `.env` file:**

See `server/.env.example` for a complete template.

### Client Environment Variables

Create a `.env.local` file in the `client/` directory (for local dev) or `.env` (for Docker build):

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `NEXT_PUBLIC_AUTH0_DOMAIN` | Your Auth0 domain | ✅ Yes | `your-app.us.auth0.com` |
| `NEXT_PUBLIC_AUTH0_CLIENT_ID` | Auth0 application client ID | ✅ Yes | `abc123...` |
| `NEXT_PUBLIC_AUTH0_REDIRECT_URI` | Redirect URI after authentication | ✅ Yes | `http://localhost:3000` (local) or `http://localhost:8003` (Docker) |
| `NEXT_PUBLIC_AUTH0_AUDIENCE` | Auth0 API audience (must match server) | ✅ Yes | `https://your-api-identifier` |
| `NEXT_PUBLIC_SERVER_URL` | Direct server URL (optional) | ❌ No | `http://localhost:8002` (only for local dev) |

**Note:** 
- All Next.js environment variables that need to be available in the browser must be prefixed with `NEXT_PUBLIC_`.
- `NEXT_PUBLIC_SERVER_URL` is only needed for local development when running the client and server separately. In Docker deployments, the nginx proxy handles routing to the backend automatically.

**Example `.env.local` file:**

See `client/.env.example` for a complete template.

## Configuration

### Setting up Auth0

1. **Create an Auth0 account** at [auth0.com](https://auth0.com)

2. **Create an Auth0 API:**
   - Go to **Applications → APIs** in the Auth0 dashboard
   - Click **Create API**
   - Set a name (e.g., "Gas Receipt API")
   - Set an identifier (e.g., `https://gasreceipt-api`)
   - Note the identifier - this becomes your `AUTH0_API_AUDIENCE`

3. **Create an Auth0 Application:**
   - Go to **Applications → Applications**
   - Click **Create Application**
   - Choose **Single Page Application**
   - Note the **Domain** and **Client ID**

4. **Configure Application Settings:**
   - In your application settings, add to **Allowed Callback URLs**:
     - `http://localhost:3000` (for local development)
     - Your production URL (e.g., `https://yourdomain.com`)
   - Add to **Allowed Logout URLs** and **Allowed Web Origins**: same URLs as above

5. **Set environment variables:**
   - `AUTH0_DOMAIN`: Your Auth0 domain (e.g., `your-app.us.auth0.com`)
   - `AUTH0_API_AUDIENCE`: The API identifier you created
   - `AUTH0_ISSUER`: `https://` + your Auth0 domain + `/`
   - `NEXT_PUBLIC_AUTH0_DOMAIN`: Same as AUTH0_DOMAIN
   - `NEXT_PUBLIC_AUTH0_CLIENT_ID`: Your application's Client ID
   - `NEXT_PUBLIC_AUTH0_AUDIENCE`: Same as AUTH0_API_AUDIENCE

### Setting up Google Gemini API

1. **Get an API key:**
   - Visit [Google AI Studio](https://ai.google.dev/gemini-api/docs/api-key)
   - Sign in with your Google account
   - Click **Get API Key**
   - Create a new API key

2. **Set the environment variable:**
   - Add `GEMINI_API_KEY=your_api_key_here` to `server/.env`

### Setting up LubeLogger

1. **Option 1: Use the included Docker Compose configuration**
   ```bash
   docker-compose -f docker-compose.lubelogger.yml up -d
   ```
   LubeLogger will be available at http://localhost:8080

2. **Option 2: Use an existing LubeLogger instance**
   - Set `LUBELOGGER_URL` in your server `.env` file to your LubeLogger URL
   - Example: `LUBELOGGER_URL=http://your-lubelogger-server:8080`

3. **Configure LubeLogger:**
   - Access LubeLogger and complete initial setup
   - Add your vehicles
   - Note your vehicle IDs for use in the application

## Usage

1. **Access the application** at http://localhost:3000 (local dev) or http://localhost:8003 (Docker)

2. **Log in** using Auth0 authentication

3. **Select your vehicle** from the list

4. **Upload a gas receipt photo:**
   - Take a clear photo of your gas receipt
   - Optionally, upload a separate odometer photo or enter the reading manually
   - The AI will extract:
     - Total cost
     - Gallons purchased
     - Date and time
     - Store brand and location
     - Odometer reading

5. **Review and submit** the extracted data to LubeLogger

## API Documentation

The backend FastAPI server provides interactive API documentation:

**Local Development:**
- **Swagger UI:** http://localhost:8002/docs
- **ReDoc:** http://localhost:8002/redoc

**Docker Deployment:**
- **Swagger UI:** http://localhost:8003/api/docs
- **ReDoc:** http://localhost:8003/api/redoc

### Key Endpoints

- `GET /health` - Health check endpoint (checks LubeLogger connectivity)
- `POST /submitGas` - Submit a gas receipt with photos (requires authentication)
- `GET /authTest` - Test Auth0 authentication

## Troubleshooting

### Common Issues

**Backend fails to start with "LUBELOGGER_URL is not set"**
- Ensure you've created a `.env` file in the `server/` directory
- Verify `LUBELOGGER_URL` is set correctly

**"Missing required environment variables for Auth0Provider"**
- Ensure all Auth0 environment variables are set in the client `.env.local` or `.env`
- Variables must be prefixed with `NEXT_PUBLIC_` for Next.js

**"Please set the GEMINI_API_KEY environment variable"**
- Verify your Gemini API key is set in `server/.env`
- Ensure the key is valid and has not expired

**Cannot reach LubeLogger**
- If using Docker Compose, use the service name as hostname: `http://lubelogger:8080`
- If running locally, use `http://localhost:8080`
- Check that LubeLogger is running and accessible

**Auth0 authentication errors**
- Verify all Auth0 URLs are configured in your Auth0 application settings
- Ensure `AUTH0_AUDIENCE` matches between client and server
- Check that the Auth0 domain doesn't have `https://` prefix in environment variables

### Docker Issues

**Port already in use**
- Change the port mappings in `docker-compose.yaml` if needed
- Example: `"8004:8003"` to use port 8004 instead of 8003

**Container fails to start**
- Check logs: `docker-compose logs server` or `docker-compose logs client`
- Verify all environment variables are set correctly
- Try rebuilding: `docker-compose up --build`

### Need Help?

If you encounter issues not covered here, please [open an issue](https://github.com/masoncfrancis/gasreceiptautomation/issues) on GitHub.
