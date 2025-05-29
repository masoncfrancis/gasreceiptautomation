from google import genai
from PIL import Image
from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import io
import os
import json # To parse the JSON response
import requests 

load_dotenv()

app = FastAPI(
    title="Gas Log Submission API",
    version="1.0.0",
    description="API for submitting gas receipts and odometer readings."
)

# Allow CORS for local development (adjust origins as needed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/submitGas")
async def submit_gas(
    receiptPhoto: UploadFile = File(..., description="Photo of the gas receipt (required)"),
    odometerPhoto: Optional[UploadFile] = File(None, description="Photo of the odometer (required if odometerInputMethod is 'separatephoto')"),
    odometerReading: Optional[str] = Form(None, description="Manual odometer reading (required if odometerInputMethod is 'manual')"),
    odometerInputMethod: str = Form(..., description="How the odometer reading is provided"),
    filledToFull: str = Form(..., description="Whether the car was filled to full"),
    filledLastTime: str = Form(..., description="Whether the form was filled last time"),
):
    # Validate conditional requirements
    if odometerInputMethod == "separatephoto" and odometerPhoto is None:
        raise HTTPException(status_code=400, detail="odometerPhoto is required when odometerInputMethod is 'separatephoto'")
    if odometerInputMethod == "manual" and not odometerReading:
        raise HTTPException(status_code=400, detail="odometerReading is required when odometerInputMethod is 'manual'")

    # TODO: Save files and data as needed

    return JSONResponse(content={"message": "Form submitted successfully"})

@app.get("/vehicles")
async def get_vehicles():
    # Get LUBELOGGER_URL from environment
    lube_logger_url = os.environ.get("LUBELOGGER_URL")
    if not lube_logger_url:
        raise HTTPException(status_code=500, detail="LUBELOGGER_URL not set in environment")

    try:
        resp = requests.get(f"{lube_logger_url}/api/vehicles")
        resp.raise_for_status()
        vehicles_data = resp.json()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch vehicles: {e}")

    # Extract only year, make, model for each vehicle
    vehicles = [
        {
            "year": v.get("year"),
            "make": v.get("make"),
            "model": v.get("model")
        }
        for v in vehicles_data
    ]

    return {"vehicles": vehicles}

