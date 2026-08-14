from datetime import datetime, timezone

from mongodb import knowledge_articles_collection


def create_knowledge_article(
    slug,
    title,
    category,
    sub_category,
    tags,
    content,
    source_system,
    source_url,
    author_id,
    author_name,
    visible_to_departments=None,
    is_internal_only=False,
):
    now = datetime.now(timezone.utc)

    article = {
        "slug": slug,
        "title": title,
        "category": category,
        "sub_category": sub_category,
        "tags": tags,
        "content": content,
        "content_hash": None,

        "status": "DRAFT",
        "version": 1,

        "source_system": source_system,
        "source_url": source_url,
        "source_updated_at": now,

        "visible_to_departments": visible_to_departments or [],
        "is_internal_only": is_internal_only,

        "last_indexed_at": None,
        "indexed_version": 0,
        "chunk_count": 0,
        "embedding_model": None,
        "index_error": None,

        "author_id": author_id,
        "author_name": author_name,
        "reviewed_by_id": None,

        "created_at": now,
        "updated_at": now,
    }

    result = knowledge_articles_collection.insert_one(article)

    return {
        "id": str(result.inserted_id),
        "slug": slug,
        "status": "DRAFT",
        "version": 1,
    }