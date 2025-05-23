import google.generativeai as genai
from PIL import Image
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

# Configure the API key
try:
    genai.configure(api_key=os.environ["GEMINI_API_KEY"])
except KeyError:
    print("Please set the GEMINI_API_KEY environment variable.")
    print("You can get one from https://ai.google.dev/gemini-api/docs/api-key")
    exit()

def sendImagePromptWithSchema(imagePath, textPrompt, responseSchema):
    """
    Sends a text prompt and an image to the Gemini model, requesting the response
    to adhere to a specified JSON schema.

    Args:
        imagePath (str): The path to the image file.
        textPrompt (str): The text prompt to send with the image.
        responseSchema (dict): The JSON schema the response should follow.
    """
    if not os.path.exists(imagePath):
        print(f"Error: Image file not found at '{imagePath}'. Please ensure the image exists.")
        return

    try:
        img = Image.open(imagePath)

        # Define the generation configuration for structured output
        generationConfig = genai.GenerationConfig(
            response_mime_type="application/json",
            response_schema=responseSchema
        )

        # Initialize the Gemini Pro Vision model with the generation config
        model = genai.GenerativeModel(
            'gemini-pro-vision',
            generation_config=generationConfig
        )

        print("Sending prompt with image")

        # Send the prompt and image to the model
        response = model.generate_content([textPrompt, img])

        # Attempt to parse the JSON response
        try:
            print("Parsing JSON Response")
            parsedResponse = json.loads(response.text)
        except json.JSONDecodeError:
            print("\nError: Model did not return valid JSON despite schema request.")
            print("Please check the model's response and your schema for consistency.")


    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    myImagePath = "testimages/receipt1"

    # Define the JSON schema for the expected response
    myResponseSchema = {
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

    myTextPrompt = "Obtain the total cost, gallons purchased, date and time (with time rounded to the whole minute), store brand, and store address from this receipt."

    sendImagePromptWithSchema(myImagePath, myTextPrompt, myResponseSchema)

    # --- Example with a different prompt (commented out for brevity) ---
    # myImagePath2 = "path/to/another/image.webp"
    # myTextPrompt2 = "What is the main subject of this picture?"
    # if myImagePath2 != "path/to/another/image.webp":
    #     sendImagePromptWithSchema(myImagePath2, myTextPrompt2, myResponseSchema)