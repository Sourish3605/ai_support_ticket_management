from typing import Any

from decouple import config
from pymongo import MongoClient


DEFAULT_MONGO_URI = 'mongodb://localhost:27017/ticketdb'


def _resolve_mongo_uri() -> str:
    raw_uri = config('MONGO_URI', default=DEFAULT_MONGO_URI)
    if not raw_uri or '<cluster>' in raw_uri or '<user>' in raw_uri or '<password>' in raw_uri:
        return DEFAULT_MONGO_URI
    return raw_uri


MONGO_URI = _resolve_mongo_uri()


class LazyDatabase:
    def __init__(self) -> None:
        self._database = None

    def _get_database(self):
        if self._database is None:
            self._database = get_client().get_default_database()
        return self._database

    def __getattr__(self, item: str) -> Any:
        return getattr(self._get_database(), item)

    def __getitem__(self, name: str) -> Any:
        return self._get_database()[name]


class LazyCollection:
    def __init__(self, name: str) -> None:
        self.name = name
        self._collection = None

    def _get_collection(self):
        if self._collection is None:
            self._collection = get_db()[self.name]
        return self._collection

    def __getattr__(self, item: str) -> Any:
        return getattr(self._get_collection(), item)


_client = None


def get_client() -> MongoClient:
    global _client
    if _client is None:
        _client = MongoClient(MONGO_URI)
    return _client


def get_db():
    return db._get_database()


db = LazyDatabase()
tickets_collection = LazyCollection('tickets')
users_collection = LazyCollection('users')
