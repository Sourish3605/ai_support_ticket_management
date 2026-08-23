from decouple import config
from pymongo import MongoClient
import os

DEFAULT_MONGO_URI = "mongodb+srv://support_admin:Support12345@cluster0.kzld13c.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
MONGO_URI = config("MONGO_URI", default=DEFAULT_MONGO_URI)

import time

_client = None
_db = None
_offline_until = 0.0


def is_mongo_available():
    global _offline_until
    return time.time() > _offline_until


def mark_mongo_offline(seconds=60.0):
    global _offline_until
    _offline_until = time.time() + seconds


def get_mongo_client():
    global _client
    if not is_mongo_available():
        return None
    if _client is None:
        try:
            _client = MongoClient(
                MONGO_URI,
                serverSelectionTimeoutMS=800,
                connectTimeoutMS=800,
                socketTimeoutMS=800,
                tlsAllowInvalidCertificates=True,
            )
        except Exception as err:
            mark_mongo_offline(60.0)
            return None
    return _client


def get_mongo_db():
    global _db
    if not is_mongo_available():
        return None
    if _db is None:
        client = get_mongo_client()
        if client:
            try:
                _db = client["support_ai_db"]
            except Exception:
                mark_mongo_offline(60.0)
                return None
    return _db


class SafeCollection:
    """Safe wrapper around MongoDB collection to prevent unhandled exceptions if DB is unreachable."""
    def __init__(self, name: str):
        self.name = name

    def _get_coll(self):
        if not is_mongo_available():
            return None
        db_instance = get_mongo_db()
        if db_instance is not None:
            try:
                return db_instance[self.name]
            except Exception:
                mark_mongo_offline(60.0)
        return None

    def insert_one(self, document, *args, **kwargs):
        coll = self._get_coll()
        if coll is not None:
            try:
                return coll.insert_one(document, *args, **kwargs)
            except Exception as e:
                print(f"[MongoDB Error] insert_one in '{self.name}': {e}")
        return None

    def insert_many(self, documents, *args, **kwargs):
        coll = self._get_coll()
        if coll is not None:
            try:
                return coll.insert_many(documents, *args, **kwargs)
            except Exception as e:
                print(f"[MongoDB Error] insert_many in '{self.name}': {e}")
        return None

    def find(self, *args, **kwargs):
        coll = self._get_coll()
        if coll is not None:
            try:
                cursor = coll.find(*args, **kwargs)
                return list(cursor)
            except Exception as e:
                print(f"[MongoDB Error] find in '{self.name}': {e}")
        return []

    def find_one(self, *args, **kwargs):
        coll = self._get_coll()
        if coll is not None:
            try:
                return coll.find_one(*args, **kwargs)
            except Exception as e:
                print(f"[MongoDB Error] find_one in '{self.name}': {e}")
        return None

    def update_one(self, *args, **kwargs):
        coll = self._get_coll()
        if coll is not None:
            try:
                return coll.update_one(*args, **kwargs)
            except Exception as e:
                print(f"[MongoDB Error] update_one in '{self.name}': {e}")
        return None

    def delete_one(self, *args, **kwargs):
        coll = self._get_coll()
        if coll is not None:
            try:
                return coll.delete_one(*args, **kwargs)
            except Exception as e:
                print(f"[MongoDB Error] delete_one in '{self.name}': {e}")
        return None

    def count_documents(self, *args, **kwargs):
        coll = self._get_coll()
        if coll is not None:
            try:
                return coll.count_documents(*args, **kwargs)
            except Exception as e:
                print(f"[MongoDB Error] count_documents in '{self.name}': {e}")
        return 0


# Database reference
client = get_mongo_client()
db = get_mongo_db()

# ==========================================
# Milestone 1 Collections (Intake & Classification)
# ==========================================
tickets_collection = SafeCollection("tickets")
classifications_collection = SafeCollection("classifications")
sla_calculations_collection = SafeCollection("sla_calculations")

# ==========================================
# Milestone 2 Collections (RAG & Knowledge Retrieval)
# ==========================================
knowledge_articles_collection = SafeCollection("knowledge_articles")
article_versions_collection = SafeCollection("article_versions")
article_chunks_collection = SafeCollection("article_chunks")
ingestion_jobs_collection = SafeCollection("ingestion_jobs")
ticket_responses_collection = SafeCollection("ticket_responses")
citations_collection = SafeCollection("citations")
feedback_collection = SafeCollection("feedback")
kb_gaps_collection = SafeCollection("kb_gaps")
retrieval_logs_collection = SafeCollection("retrieval_logs")

# Legacy compatibility
users_collection = SafeCollection("users")