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
import proc
import uvicorn

load_dotenv()

# Check if LUBELOGGER_URL is set in the environment. Quit if not set.
lube_logger_url = os.environ.get("LUBELOGGER_URL")
if not lube_logger_url:
    raise ValueError("[ACTION REQUIRED] LubeLogger server URL environment variable (LUBELOGGER_URL) is not set")


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


# Function to send image and text prompt to AI and get structured data
def sendDataToAI(imageFile, odometerInputMethod: str, getOdometerOnly: bool = False):
    """
    Sends an image file to the AI to extract structured data from it.
    """

    imageType = "receipt"
    if odometerInputMethod == "separate_photo":
        imageType = "odometer"

    if getOdometerOnly:
        # If only odometer data is needed, use the odometer prompt
        odometerPrompt, odometerSchema = proc.getOdometerPromptInfo(imageType)
        return proc.sendImagePromptWithSchema(imageFile, odometerPrompt, odometerSchema)

    receiptDataPrompt, receiptDataSchema = proc.getReceiptPromptInfo()
    return proc.sendImagePromptWithSchema(imageFile, receiptDataPrompt, receiptDataSchema)

@app.post("/submitGas")
async def submit_gas(
    receiptPhoto: UploadFile = File(..., description="Photo of the gas receipt (required)"),
    odometerPhoto: Optional[UploadFile] = File(None, description="Photo of the odometer (required if odometerInputMethod is 'separate_photo')"),
    odometerReading: Optional[str] = Form(None, description="Manual odometer reading (required if odometerInputMethod is 'manual')"),
    odometerInputMethod: str = Form(..., description="How the odometer reading is provided"),
    filledToFull: str = Form(..., description="Whether the car was filled to full"),
    filledLastTime: str = Form(..., description="Whether the form was filled last time"),
    ):
    # Validate conditional requirements
    if odometerInputMethod == "separate_photo" and odometerPhoto is None:
        raise HTTPException(status_code=400, detail="odometerPhoto is required when odometerInputMethod is 'separate_photo'")
    if odometerInputMethod == "manual" and not odometerReading:
        raise HTTPException(status_code=400, detail="odometerReading is required when odometerInputMethod is 'manual'")

    # Send the receipt photo to the AI to extract data
    receipt_data = sendDataToAI(receiptPhoto, odometerInputMethod)

    odometer_data = { "odometerReading": 999999 }

    if odometerInputMethod == "separate_photo":
        # If using a separate photo for odometer, send that photo to the AI
        odometer_data = sendDataToAI(odometerPhoto, odometerInputMethod, getOdometerOnly=True)

    elif odometerInputMethod == "on_receipt_photo":
        # If using a separate photo for odometer, send that photo to the AI
        odometer_data = sendDataToAI(receiptPhoto, odometerInputMethod, getOdometerOnly=True)

    elif odometerInputMethod == "manual":
        odometer_data = { "odometerReading": int(odometerReading) if odometerReading.isdigit() else 999999 }

    receipt_data["odometerReading"] = odometer_data.get("odometerReading")


    return JSONResponse(content={
        "message": "Form submitted successfully",
        "receiptData": receipt_data
    })

@app.get("/vehicles")
async def get_vehicles():
    # Get LUBELOGGER_URL from environment
    lube_logger_url = os.environ.get("LUBELOGGER_URL")
    if not lube_logger_url:
        raise HTTPException(status_code=503, detail="LubeLogger server URL not set in environment, cannot access LubeLogger")

    try:
        resp = requests.get(f"{lube_logger_url}/api/vehicles")
        resp.raise_for_status()
        vehicles_data = resp.json()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to fetch vehicles: {e}")

    # Filter vehicles: exclude if showInReceiptApp == "false"
    def should_include(vehicle):
        extra_fields = vehicle.get("extraFields", [])
        for field in extra_fields:
            if field.get("name") == "showInReceiptApp" and field.get("value") == "false":
                return False
        return True

    vehicles = [
        {
            "vehicleId": v.get("id"),
            "year": v.get("year"),
            "make": v.get("make"),
            "model": v.get("model")
        }
        for v in vehicles_data if should_include(v)
    ]

    return {"vehicles": vehicles}

@app.get("/health")
async def health_check():
    lube_logger_url = os.environ.get("LUBELOGGER_URL")
    if not lube_logger_url:
        return JSONResponse(content={"error": "LubeLogger server URL not set in environment, cannot access LubeLogger"}, status_code=503)
    try:
        resp = requests.get(f"{lube_logger_url}/api/vehicles", timeout=5)
        if resp.status_code == 200:
            return JSONResponse(content={"status": "ok"}, status_code=200)
        else:
            return JSONResponse(content={"error": f"LubeLogger returned status {resp.status_code}"}, status_code=502)
    except Exception as e:
        return JSONResponse(content={"error": f"Failed to reach LubeLogger: {e}"}, status_code=502)


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
