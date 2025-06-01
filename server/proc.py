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
    Envía un prompt de texto y una imagen al modelo Gemini, solicitando la respuesta
    conforme a un esquema JSON especificado.

    Args:
        imageFile (file-like object or bytes): El archivo de imagen recibido.
        textPrompt (str): El prompt de texto a enviar con la imagen.
        responseSchema (dict): El esquema JSON que debe seguir la respuesta.
    """
    try:
        # Configurar la API key
        try:
            client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
        except ValueError:
            print("Please set the GEMINI_API_KEY environment variable.")
            print("You can get one from https://ai.google.dev/gemini-api/docs/api-key")
            print("Exiting...")
            exit()

        # Abrir la imagen desde el archivo recibido
        if hasattr(imageFile, "file"):
            # FastAPI UploadFile
            img = Image.open(imageFile.file)
        elif hasattr(imageFile, "read"):
            # file-like object
            img = Image.open(imageFile)
        elif isinstance(imageFile, bytes):
            img = Image.open(io.BytesIO(imageFile))
        else:
            raise ValueError("imageFile debe ser un archivo, objeto tipo archivo o bytes.")

        response = client.models.generate_content(
            model="gemini-2.0-flash-lite",
            contents=[img, textPrompt],
            config={
                "response_mime_type": "application/json",
                "response_schema": responseSchema,
            }
        )

        # Intentar parsear la respuesta JSON
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
