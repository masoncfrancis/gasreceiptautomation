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
