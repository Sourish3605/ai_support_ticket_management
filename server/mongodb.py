from decouple import config
from pymongo import MongoClient
import os
import time

try:
    import certifi
    CA_FILE = certifi.where()
except ImportError:
    CA_FILE = None

DEFAULT_MONGO_URI = "mongodb+srv://support_admin:Support12345@cluster0.kzld13c.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
raw_uri = config("MONGO_URI", default=os.environ.get("MONGO_URI", DEFAULT_MONGO_URI))
MONGO_URI = raw_uri.strip().strip("'\"") if raw_uri else DEFAULT_MONGO_URI
MONGO_TIMEOUT_MS = int(config("MONGO_TIMEOUT_MS", default="200"))

_client = None
_db = None
_offline_until = 0.0


def is_mongo_available():
    global _offline_until
    return time.time() > _offline_until


def mark_mongo_offline(seconds=3600.0):
    global _offline_until
    _offline_until = time.time() + seconds


def get_mongo_client():
    global _client
    if not is_mongo_available():
        return None
    if _client is None:
        try:
            mongo_options = {
                "serverSelectionTimeoutMS": MONGO_TIMEOUT_MS,
                "connectTimeoutMS": MONGO_TIMEOUT_MS,
                "socketTimeoutMS": MONGO_TIMEOUT_MS,
                "maxPoolSize": 50,
                "minPoolSize": 1,
                "maxIdleTimeMS": 45000,
                "retryWrites": True,
            }
            if CA_FILE:
                mongo_options["tlsCAFile"] = CA_FILE

            if "mongodb+srv://" in MONGO_URI or "ssl=true" in MONGO_URI.lower() or "tls=true" in MONGO_URI.lower():
                mongo_options["tls"] = True
                mongo_options["tlsAllowInvalidCertificates"] = True

            _client = MongoClient(MONGO_URI, **mongo_options)
        except Exception as err:
            mark_mongo_offline(3600.0)
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
            except Exception as err:
                print(f"[MongoDB Atlas Warning] Failed to get database: {err}")
                mark_mongo_offline(300.0)
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
            except Exception as err:
                mark_mongo_offline(300.0)
        return None

    def insert_one(self, document, *args, **kwargs):
        coll = self._get_coll()
        if coll is not None:
            try:
                return coll.insert_one(document, *args, **kwargs)
            except Exception as e:
                mark_mongo_offline(300.0)
                print(f"[MongoDB Atlas Notice] insert_one in '{self.name}': {e}")
        return None

    def insert_many(self, documents, *args, **kwargs):
        coll = self._get_coll()
        if coll is not None:
            try:
                return coll.insert_many(documents, *args, **kwargs)
            except Exception as e:
                mark_mongo_offline(300.0)
                print(f"[MongoDB Atlas Notice] insert_many in '{self.name}': {e}")
        return None

    def find(self, *args, **kwargs):
        coll = self._get_coll()
        if coll is not None:
            try:
                cursor = coll.find(*args, **kwargs)
                return list(cursor)
            except Exception as e:
                mark_mongo_offline(300.0)
                print(f"[MongoDB Atlas Notice] find in '{self.name}': {e}")
        return []

    def find_one(self, *args, **kwargs):
        coll = self._get_coll()
        if coll is not None:
            try:
                return coll.find_one(*args, **kwargs)
            except Exception as e:
                mark_mongo_offline(300.0)
                print(f"[MongoDB Atlas Notice] find_one in '{self.name}': {e}")
        return None

    def update_one(self, *args, **kwargs):
        coll = self._get_coll()
        if coll is not None:
            try:
                return coll.update_one(*args, **kwargs)
            except Exception as e:
                mark_mongo_offline(300.0)
                print(f"[MongoDB Atlas Notice] update_one in '{self.name}': {e}")
        return None

    def delete_one(self, *args, **kwargs):
        coll = self._get_coll()
        if coll is not None:
            try:
                return coll.delete_one(*args, **kwargs)
            except Exception as e:
                mark_mongo_offline(300.0)
                print(f"[MongoDB Atlas Notice] delete_one in '{self.name}': {e}")
        return None

    def count_documents(self, *args, **kwargs):
        coll = self._get_coll()
        if coll is not None:
            try:
                return coll.count_documents(*args, **kwargs)
            except Exception as e:
                mark_mongo_offline(300.0)
                print(f"[MongoDB Atlas Notice] count_documents in '{self.name}': {e}")
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

# ==========================================
# Milestone 3 Collections (Multi-Agent, Jira, Email, Audit)
# ==========================================
agent_workflows_collection = SafeCollection("agent_workflows")
agent_executions_collection = SafeCollection("agent_executions")
jira_tickets_collection = SafeCollection("jira_tickets")
email_logs_collection = SafeCollection("email_logs")
activity_logs_collection = SafeCollection("activity_logs")

# Legacy compatibility
users_collection = SafeCollection("users")