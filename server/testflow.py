import sys


def getInfoFromReceipt(filePath: str, hasOdometer: bool):
    pass

    prompt = """
        From this receipt, please obtain results for the following data scheme and give response in JSON:
        {
            "properties": {
                "hasOdometerWritten": {
                    "type": "boolean",
                    "description": "Indicates if the odometer value is written on the receipt"
                },
                "odometer": {
                    "type": "string",
                    "description": "The odometer reading as written on the receipt"
                },
                "totalCost": {
                    "type": "number",
                    "format": "decimal",
                    "description": "Total cost of the fuel purchase"
                },
                "gallonsPurchased": {
                    "type": "number",
                    "format": "decimal",
                    "description": "Number of gallons purchased"
                },
                "datetime": {
                    "type": "string",
                    "format": "date-time",
                    "description": "Date and time of the purchase"
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
                "hasOdometerWritten",
                "totalCost",
                "gallonsPurchased",
                "datetime",
                "storeBrand",
                "storeAddress"
            ]
            }
    """
    
    # Check to make sure file path is valid
    


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python testflow.py <file_path>")
        sys.exit(1)
    file_path = sys.argv[1]
    print(f"Received file path: {file_path}")
