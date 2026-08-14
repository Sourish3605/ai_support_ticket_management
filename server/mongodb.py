from pymongo import MongoClient

MONGO_URI = "mongodb+srv://support_admin:support54321@cluster0.kzld13c.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"

client = MongoClient(MONGO_URI)

db = client["support_ai_db"]

tickets_collection = db["tickets"]