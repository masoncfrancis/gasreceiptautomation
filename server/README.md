# Gas Receipt Processor Backend

## User/Processing Flow

1. User logs in
2. User chooses car they filled up
3. System checks when the last fill up date is and shows it to user at applicable question
4. Accept photo of receipt via upload
5. Get the following info from it using AI:
    * Odometer (if not provided another way)
    * Total cost
    * Gallons purchased
    * Date and time
    * Location of purchase
6. Format this information to look nice
7. Submit to LubeLogger

## Prompt for data (not including odometer)

```text
From this receipt, please obtain results for the following data scheme and give response in JSON:
        {
            "properties": {
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
```
