from google import genai
from PIL import Image
from dotenv import load_dotenv
import io
import os
import json # To parse the JSON response

# --- Install pillowHeif if you plan to use HEIC/HEIF images ---
try:
    from pillow_heif import register_heif_opener
    register_heif_opener()
    print("Pillow-HEIF registered. HEIC/HEIF image support enabled.")
except ImportError:
    print("Pillow-HEIF not found. HEIC/HEIF image support will be limited.")
    print("To enable HEIC/HEIF, run: pip install pillow-heif")
except Exception as e:
    print(f"Error registering Pillow-HEIF: {e}")



def sendImagePromptWithSchema(imageFile, textPrompt, responseSchema):
    """
    Sends a text prompt and an image to the Gemini model, requesting the response
    to follow a specified JSON schema.

    Args:
        imageFile (file-like object or bytes): The received image file.
        textPrompt (str): The text prompt to send with the image.
        responseSchema (dict): The JSON schema the response should follow.
    """
    try:
        # Set up the API key
        try:
            client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
        except ValueError:
            print("Please set the GEMINI_API_KEY environment variable.")
            print("You can get one from https://ai.google.dev/gemini-api/docs/api-key")
            print("Exiting...")
            exit()

        # Open the image from the received file
        if hasattr(imageFile, "file"):
            # FastAPI UploadFile
            img = Image.open(imageFile.file)
        elif hasattr(imageFile, "read"):
            # file-like object
            img = Image.open(imageFile)
        elif isinstance(imageFile, bytes):
            img = Image.open(io.BytesIO(imageFile))
        else:
            raise ValueError("imageFile must be a file, file-like object, or bytes.")

        response = client.models.generate_content(
            model="gemini-2.0-flash-lite",
            contents=[img, textPrompt],
            config={
                "response_mime_type": "application/json",
                "response_schema": responseSchema,
            }
        )

        # Try to parse the JSON response
        try:
            print("Parsing JSON Response")
            parsedResponse = json.loads(response.text)
            return parsedResponse

        except json.JSONDecodeError:
            print("\nError: Model did not return valid JSON despite schema request.")
            print("Please check the model's response and your schema for consistency.")
            return {
                "error": "Invalid JSON response",
                "response": response.text
            }

    except Exception as e:
        print(f"An error occurred: {e}")
        return {
            "error": str(e),
            "response": None
        }
    

def getReceiptPromptInfo():

    # Define the JSON schema for the expected response
    receiptDataSchema = {
        "type": "object",
        "properties": {
            "totalCost": {
                "type": "number",
                "format": "float",
                "description": "Total cost of the fuel purchase"
            },
            "gallonsPurchased": {
                "type": "number",
                "format": "float",
                "description": "Number of gallons purchased"
            },
            "datetime": {
                "type": "string",
                "description": "Date and time of the purchase, formatted as MM/DD/YYYY HH:MM"
            },
            "storeBrand": {
                "type": "string",
                "description": "Brand of the gas station"
            },
            "storeAddress": {
                "type": "string",
                "description": "Address of the gas station"
            }
        },
        "required": [
            "totalCost",
            "gallonsPurchased",
            "datetime",
            "storeBrand",
            "storeAddress"
        ]
    }

    receiptDataPrompt = "Obtain the total cost, gallons purchased, date and time (with time rounded to the whole minute), store brand, and store address from this receipt."

    return receiptDataPrompt, receiptDataSchema


def getOdometerPromptInfo(imageType):

    # Define the JSON schema for the expected response
    odometerDataSchema = {
        "type": "object",
        "properties": {
            "odometerReading": {
                "type": "integer",
                "description": "Odometer reading as an integer value"
            }
        },
        "required": [
            "odometerReading"
        ]
    }

    if imageType == "receipt":
        odometerDataPrompt = "Obtain the odometer number that is handwritten on this receipt."
    elif imageType == "odometer":
        odometerDataPrompt = "Obtain the odometer reading from this photo of a vehicle's dashboard."
    else:
        raise ValueError("Invalid image type. Must be 'receipt' or 'odometer'.")

    return odometerDataPrompt, odometerDataSchema



if __name__ == "__main__":

    load_dotenv()

    receiptImagePath, receiptDataPrompt, receiptDataSchema = getReceiptPromptInfo()

    receiptData = sendImagePromptWithSchema(receiptImagePath, receiptDataPrompt, receiptDataSchema)

    if receiptData:
        if "error" in receiptData:
            print("Error in response:", receiptData["error"])
        else:
            print("Parsed Receipt Data:")
            print(json.dumps(receiptData, indent=4))

    # --- Example with a different prompt (commented out for brevity) ---
    # myImagePath2 = "path/to/another/image.webp"
    # myTextPrompt2 = "What is the main subject of this picture?"
    # if myImagePath2 != "path/to/another/image.webp":
    #     sendImagePromptWithSchema(myImagePath2, myTextPrompt2, myResponseSchema)

