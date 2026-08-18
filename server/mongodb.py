from pymongo import MongoClient
from decouple import config

MONGO_URI = "mongodb+srv://support_admin:Support12345@cluster0.kzld13c.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"

client = MongoClient(MONGO_URI)

db = client["support_ai_db"]

tickets_collection = db["tickets"]