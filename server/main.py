from google import genai
from PIL import Image
from dotenv import load_dotenv
from datetime import datetime
from fastapi import FastAPI, File, Form, UploadFile, HTTPException, Security
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Depends, FastAPI  # 👈 new imports
from fastapi.security import HTTPBearer  # 👈 new imports
from typing import Optional
import io
import os
import json # To parse the JSON response
import requests 
import proc
import uvicorn
import pytz

from authutils import VerifyToken

load_dotenv()

# Check if LUBELOGGER_URL is set in the environment. Quit if not set.
lube_logger_url = os.environ.get("LUBELOGGER_URL")
if not lube_logger_url:
    raise ValueError("[ACTION REQUIRED] LubeLogger server URL environment variable (LUBELOGGER_URL) is not set")

token_auth_scheme = HTTPBearer()

app = FastAPI(
    title="Gas Receipt Submission API",
    version="1.0.0",
    description="API for submitting gas receipts and odometer readings."
)
auth = VerifyToken()

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
    auth_result: str = Security(auth.verify),
    receiptPhoto: UploadFile = File(..., description="Photo of the gas receipt (required)"),
    odometerPhoto: Optional[UploadFile] = File(None, description="Photo of the odometer (required if odometerInputMethod is 'separate_photo')"),
    odometerReading: Optional[str] = Form(None, description="Manual odometer reading (required if odometerInputMethod is 'manual')"),
    odometerInputMethod: str = Form(..., description="How the odometer reading is provided"),
    filledToFull: str = Form(..., description="Whether the car was filled to full"),
    filledLastTime: str = Form(..., description="Whether the form was filled last time"),
    vehicleId: str = Form(..., description="Id of Vehicle"),
    userName: str = Form(..., description="Name of User (for notes)"),
):
    print("Starting gas submission process.")

    # Validate conditional requirements
    if odometerInputMethod == "separate_photo" and odometerPhoto is None:
        print("Validation failed: odometerPhoto is required for 'separate_photo' method.")
        raise HTTPException(status_code=400, detail="odometerPhoto is required when odometerInputMethod is 'separate_photo'")
    if odometerInputMethod == "manual" and not odometerReading:
        print("Validation failed: odometerReading is required for 'manual' method.")
        raise HTTPException(status_code=400, detail="odometerReading is required when odometerInputMethod is 'manual'")

    print("Extracting data from receipt photo using AI.")
    receipt_data = sendDataToAI(receiptPhoto, odometerInputMethod)

    # Check to make sure date is present
    dateIncluded = True
    if receipt_data.get("datetime") is None:
        print("No date found in receipt data, setting datetime to current time.")
        receipt_data["datetime"] = datetime.now().strftime("%m/%d/%Y %H:%M")
        dateIncluded = False

    odometer_data = { "odometerReading": 999999 }

    if odometerInputMethod == "separate_photo":
        print("Extracting odometer data from separate odometer photo using AI.")
        odometer_data = sendDataToAI(odometerPhoto, odometerInputMethod, getOdometerOnly=True)

    elif odometerInputMethod == "on_receipt_photo":
        print("Extracting odometer data from receipt photo using AI.")
        odometer_data = sendDataToAI(receiptPhoto, odometerInputMethod, getOdometerOnly=True)

    elif odometerInputMethod == "manual":
        print("Using manual odometer reading provided by user.")
        odometer_data = { "odometerReading": int(odometerReading) if odometerReading.isdigit() else 999999 }

    receipt_data["odometerReading"] = odometer_data.get("odometerReading")

    print("Uploading receipt and odometer photos to /api/documents/upload (if present).")
    files_to_upload = []
    if receiptPhoto:
        files_to_upload.append(("documents", (receiptPhoto.filename, await receiptPhoto.read(), receiptPhoto.content_type)))
    if odometerPhoto:
        files_to_upload.append(("documents", (odometerPhoto.filename, await odometerPhoto.read(), odometerPhoto.content_type)))

    uploaded_files_info = None
    if files_to_upload:
        try:
            lube_logger_url = os.environ.get("LUBELOGGER_URL")
            print(f"Sending POST request to {lube_logger_url}/api/documents/upload with {len(files_to_upload)} file(s).")
            upload_resp = requests.post(
                f"{lube_logger_url}/api/documents/upload",
                files=files_to_upload
            )
            upload_resp.raise_for_status()
            # Keep both the parsed JSON and the raw text exactly as returned
            # by the documents endpoint. Some downstream APIs expect the raw
            # JSON string in the 'files' form field, so preserve it.
            uploaded_files_info = upload_resp.json()
            uploaded_files_text = upload_resp.text
            print(uploaded_files_info)
            print("Files uploaded successfully.")
        except Exception as e:
            print(f"Error uploading documents: {e}")
            raise HTTPException(status_code=502, detail=f"Error uploading documents: {e}")
    else:
        print("No files to upload.")

    # Compose notes for POST: brand, address, and placeholder username
    store_brand = receipt_data.get("storeBrand", "")
    store_address = receipt_data.get("storeAddress", "")
    submitting_user = userName
    receipt_datetime = receipt_data.get("datetime", "unknown time and date")

    # Obtener la hora actual en Eastern Time
    eastern = pytz.timezone("US/Eastern")
    now_et = datetime.now(eastern)
    formatted_time = now_et.strftime("%Y-%m-%d %H:%M:%S %Z")

    notes_value = f"Brand: {store_brand}\nAddress: {store_address}\nReceipt dated {receipt_datetime}\n(Submitted by {submitting_user} at {formatted_time})"

    dateTime = receipt_data.get("datetime")
    if not dateIncluded:
        notes_value += "\n\nNote: The date was not found on the receipt, so the current time was used instead."
        dateTime = formatted_time

    # Build JSON payload. LubeLogger expects a JSON body for the gas record
    # submission and an array under the 'files' key. Use the parsed JSON array
    # returned by the upload endpoint when available; otherwise send an empty
    # list. For the boolean inputs we only consider 'yes' and 'no' (case-insen-
    # sitive). Anything else defaults to False.
    def parse_yes_no(v):
        if v is None:
            return False
        s = str(v).strip().lower()
        if s == 'yes':
            return True
        if s == 'no':
            return False
        return False

    parsed_filledToFull = parse_yes_no(filledToFull)
    parsed_filledLastTime = parse_yes_no(filledLastTime)

    gas_record_payload = {
        "date": dateTime,
        "odometer": receipt_data.get("odometerReading"),
        "fuelConsumed": receipt_data.get("gallonsPurchased"),
        "cost": receipt_data.get("totalCost"),
        # isFillToFull: true when the user input for filledToFull was 'yes'
        "isFillToFull": parsed_filledToFull,
        # missedFuelUp: true when the user input for filledLastTime was 'no'
        "missedFuelUp": (not parsed_filledLastTime),
        "notes": notes_value,
        "files": uploaded_files_info if uploaded_files_info is not None else []
    }

    print("Sending gas record payload to LubeLogger (application/json).")
    # Debug: print the exact JSON payload so we can verify booleans are true/false
    try:
        print("Outgoing gas record payload:", json.dumps(gas_record_payload, default=str))
    except Exception:
        print("Outgoing gas record payload (could not JSON serialize) - showing repr:", repr(gas_record_payload))
    try:
        lube_logger_url = os.environ.get("LUBELOGGER_URL")
        # Send vehicleId as a query parameter and the rest as JSON in the
        # request body.
        resp = requests.post(
            f"{lube_logger_url}/api/vehicle/gasrecords/add",
            params={"vehicleId": vehicleId},
            json=gas_record_payload,
            timeout=30,
        )
        resp.raise_for_status()
        api_response = resp.json()
        print("Gas record submitted successfully to LubeLogger.")
    except Exception as e:
        print(f"Error sending data to LubeLogger: {e}")
        # Print payload for debugging (truncate large 'files' arrays)
        debug_payload = dict(gas_record_payload)
        try:
            if isinstance(debug_payload.get("files"), list):
                debug_payload["files"] = debug_payload["files"][:10]
        except Exception:
            pass
        print("Request payload (partial):", json.dumps(debug_payload, default=str, indent=2))
        raise HTTPException(status_code=502, detail=f"Error sending data to LubeLogger: {e}")

    print("Gas submission process completed successfully.")
    return JSONResponse(content={
        "message": "Form submitted successfully",
        "receiptData": receipt_data,
        "lubeLoggerResponse": api_response
    })

@app.get("/vehicles")
async def get_vehicles(auth_result: str = Security(auth.verify)):

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
            return JSONResponse(content={"status": "OK"}, status_code=200)
        else:
            return JSONResponse(content={"error": f"LubeLogger returned status {resp.status_code}"}, status_code=502)
    except Exception as e:
        return JSONResponse(content={"error": f"Failed to reach LubeLogger: {e}"}, status_code=502)

@app.get("/authTest")
def authTest(auth_result: str = Security(auth.verify)): # 👈 Use Security and the verify method to protect your endpoints
    """A valid access token is required to access this route"""
    return auth_result


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
