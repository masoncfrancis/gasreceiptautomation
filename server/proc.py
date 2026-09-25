from openai import OpenAI
from PIL import Image
from dotenv import load_dotenv
import io
import os
import json
import base64

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
        try:
            client = OpenAI(
                api_key=os.environ["LLM_API_KEY"],
                base_url=os.environ.get(
                    "LLM_BASE_URL",
                    "https://generativelanguage.googleapis.com/v1beta/openai/"
                ),
            )
        except ValueError:
            print("Please set the LLM_API_KEY environment variable.")
            print("You can get one from https://ai.google.dev/gemini-api/docs/api-key")
            print("Exiting...")
            exit()

        # Open the image from the received file
        if hasattr(imageFile, "file"):
            # FastAPI UploadFile
            imageFile.file.seek(0)
            img = Image.open(imageFile.file)
        elif hasattr(imageFile, "read"):
            # file-like object
            img = Image.open(imageFile)
        elif isinstance(imageFile, bytes):
            img = Image.open(io.BytesIO(imageFile))
        else:
            raise ValueError("imageFile must be a file, file-like object, or bytes.")

        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        img_base64 = base64.b64encode(buffer.getvalue()).decode("utf-8")

        response = client.chat.completions.create(
            model=os.environ.get("LLM_MODEL", "gemini-2.5-flash-lite"),
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": textPrompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/png;base64,{img_base64}"
                            }
                        }
                    ]
                }
            ],
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "extracted_data",
                    "schema": responseSchema,
                    "strict": True,
                }
            }
        )

        try:
            print("Parsing JSON Response")
            content = response.choices[0].message.content
            parsedResponse = json.loads(content)
            return parsedResponse

        except (json.JSONDecodeError, AttributeError, IndexError) as e:
            print("\nError: Model did not return valid JSON despite schema request.")
            print("Please check the model's response and your schema for consistency.")
            content = response.choices[0].message.content if response.choices else str(response)
            return {"error": "Invalid JSON response", "response": content}

    except Exception as e:
        print(f"An error occurred: {e}")
        return {"error": str(e), "response": None}


def getReceiptPromptInfo():

    # Define the JSON schema for the expected response
    receiptDataSchema = {
        "type": "object",
        "properties": {
            "totalCost": {
                "type": "number",
                "description": "Total cost of the fuel purchase",
            },
            "gallonsPurchased": {
                "type": "number",
                "description": "Number of gallons purchased",
            },
            "datetime": {
                "type": "string",
                "description": "Date and time of the purchase, formatted as MM/DD/YYYY HH:MM",
            },
            "storeBrand": {"type": "string", "description": "Brand of the gas station"},
            "storeAddress": {
                "type": "string",
                "description": "Address of the gas station",
            },
        },
        "required": [
            "totalCost",
            "gallonsPurchased",
            "datetime",
            "storeBrand",
            "storeAddress",
        ],
    }

    receiptDataPrompt = "Obtain the total cost, gallons purchased, date and time (with time rounded to the whole minute), store brand, and store address from this receipt. If any value is unknown or unavailable, set it's corresponding value in the response to null."

    return receiptDataPrompt, receiptDataSchema


def getOdometerPromptInfo(imageType):

    # Define the JSON schema for the expected response
    odometerDataSchema = {
        "type": "object",
        "properties": {
            "odometerReading": {
                "type": "integer",
                "description": "Odometer reading as an integer value",
            }
        },
        "required": ["odometerReading"],
    }

    if imageType == "receipt":
        odometerDataPrompt = "Obtain the number that is handwritten on this receipt."
    elif imageType == "odometer":
        odometerDataPrompt = (
            "Obtain the odometer reading from this photo of a vehicle's dashboard."
        )
    else:
        raise ValueError("Invalid image type. Must be 'receipt' or 'odometer'.")

    return odometerDataPrompt, odometerDataSchema
