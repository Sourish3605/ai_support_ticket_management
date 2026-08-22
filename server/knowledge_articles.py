from datetime import datetime, timezone
import hashlib
import uuid

from mongodb import (
    knowledge_articles_collection,
    article_versions_collection,
    article_chunks_collection,
    ingestion_jobs_collection,
)


def compute_content_hash(text: str) -> str:
    """Generate SHA256 hash for document content to track changes."""
    return hashlib.sha256((text or "").strip().encode("utf-8")).hexdigest()


def chunk_document_content(content: str, article_id: str | None = None, max_chunk_size: int = 500) -> list:
    """
    Split knowledge document into contextual chunks with section headers and metadata.
    """
    if not content:
        return []

    raw_paragraphs = [p.strip() for p in content.split("\n\n") if p.strip()]
    chunks = []
    current_chunk = []
    current_size = 0
    current_section = "General"
    chunk_index = 0

    for para in raw_paragraphs:
        if para.startswith("#") or para.isupper() or (len(para) < 40 and para.endswith(":")):
            current_section = para.replace("#", "").strip()

        words = para.split()
        word_count = len(words)

        if current_size + word_count > max_chunk_size and current_chunk:
            chunk_text = "\n\n".join(current_chunk)
            chunk_id = f"{article_id or 'CHUNK'}-c{chunk_index}"
            chunks.append({
                "chunk_id": chunk_id,
                "chunk_index": chunk_index,
                "section": current_section,
                "text": chunk_text,
                "token_count": len(chunk_text.split()),
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
            chunk_index += 1
            current_chunk = [para]
            current_size = word_count
        else:
            current_chunk.append(para)
            current_size += word_count

    if current_chunk:
        chunk_text = "\n\n".join(current_chunk)
        chunk_id = f"{article_id or 'CHUNK'}-c{chunk_index}"
        chunks.append({
            "chunk_id": chunk_id,
            "chunk_index": chunk_index,
            "section": current_section,
            "text": chunk_text,
            "token_count": len(chunk_text.split()),
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    return chunks


def create_knowledge_article(
    slug: str,
    title: str,
    category: str,
    sub_category: str = "",
    tags: str = "",
    content: str = "",
    source_system: str = "SupportPilot KB",
    source_url: str = "",
    author_id: str = "system",
    author_name: str = "Admin",
    visible_to_departments: list | None = None,
    is_internal_only: bool = False,
    status: str = "PUBLISHED",
):
    """
    Create a knowledge article and automatically index/chunk into MongoDB.
    """
    now = datetime.now(timezone.utc).isoformat()
    article_id = slug or f"KB-DOC-{uuid.uuid4().hex[:6].upper()}"
    content_hash = compute_content_hash(content)

    chunks = chunk_document_content(content, article_id=article_id)

    article_doc = {
        "article_id": article_id,
        "slug": slug,
        "title": title,
        "category": category,
        "sub_category": sub_category,
        "tags": tags,
        "content": content,
        "content_hash": content_hash,
        "status": status,
        "version": 1,
        "source_system": source_system,
        "source_url": source_url,
        "source_updated_at": now,
        "visible_to_departments": visible_to_departments or [],
        "is_internal_only": is_internal_only,
        "chunk_count": len(chunks),
        "embedding_model": "bge-m3-hybrid",
        "author_id": author_id,
        "author_name": author_name,
        "created_at": now,
        "updated_at": now,
    }

    knowledge_articles_collection.insert_one(article_doc)

    version_doc = {
        "article_id": article_id,
        "version": 1,
        "title": title,
        "content": content,
        "content_hash": content_hash,
        "change_summary": "Initial publication",
        "updated_by": author_name,
        "created_at": now,
    }
    article_versions_collection.insert_one(version_doc)

    chunk_docs = []
    for chunk in chunks:
        chunk["article_id"] = article_id
        chunk["category"] = category
        chunk["sub_category"] = sub_category
        chunk["title"] = title
        chunk_docs.append(chunk)

    if chunk_docs:
        article_chunks_collection.insert_many(chunk_docs)

    return {
        "id": article_id,
        "slug": slug,
        "title": title,
        "status": status,
        "version": 1,
        "chunks_created": len(chunks),
    }


def ingest_knowledge_batch(articles_list: list, source_type: str = "MANUAL"):
    """
    High-performance batch ingestion job for knowledge articles.
    """
    job_id = f"JOB-{uuid.uuid4().hex[:8].upper()}"
    start_time = datetime.now(timezone.utc).isoformat()

    articles_to_insert = []
    versions_to_insert = []
    chunks_to_insert = []

    for item in articles_list:
        now = datetime.now(timezone.utc).isoformat()
        article_id = item.get("article_id") or item.get("slug") or f"KB-{uuid.uuid4().hex[:6].upper()}"
        content = item.get("content") or item.get("steps") or ""
        content_hash = compute_content_hash(content)
        category = item.get("category", "General")
        sub_category = item.get("sub_category", "")
        title = item.get("title", "Untitled")

        chunks = chunk_document_content(content, article_id=article_id)

        articles_to_insert.append({
            "article_id": article_id,
            "slug": item.get("slug", article_id),
            "title": title,
            "category": category,
            "sub_category": sub_category,
            "tags": item.get("tags", ""),
            "content": content,
            "content_hash": content_hash,
            "status": "PUBLISHED",
            "version": 1,
            "source_system": item.get("source", "Enterprise Knowledge Store"),
            "source_url": item.get("source_url", ""),
            "source_updated_at": now,
            "chunk_count": len(chunks),
            "embedding_model": "bge-m3-hybrid",
            "author_id": "system",
            "author_name": "Admin",
            "created_at": now,
            "updated_at": now,
        })

        versions_to_insert.append({
            "article_id": article_id,
            "version": 1,
            "title": title,
            "content": content,
            "content_hash": content_hash,
            "change_summary": "Batch seed ingestion",
            "updated_by": "System Seed",
            "created_at": now,
        })

        for chunk in chunks:
            chunk["article_id"] = article_id
            chunk["category"] = category
            chunk["sub_category"] = sub_category
            chunk["title"] = title
            chunks_to_insert.append(chunk)

    try:
        if articles_to_insert:
            knowledge_articles_collection.insert_many(articles_to_insert)
        if versions_to_insert:
            article_versions_collection.insert_many(versions_to_insert)
        if chunks_to_insert:
            article_chunks_collection.insert_many(chunks_to_insert)

        ingestion_jobs_collection.insert_one({
            "job_id": job_id,
            "source_type": source_type,
            "status": "COMPLETED",
            "articles_processed": len(articles_to_insert),
            "chunks_created": len(chunks_to_insert),
            "error_message": None,
            "started_at": start_time,
            "completed_at": datetime.now(timezone.utc).isoformat(),
        })
    except Exception as e:
        print(f"[Ingestion Job Warning] {e}")

    return {
        "job_id": job_id,
        "articles_processed": len(articles_to_insert),
        "total_chunks": len(chunks_to_insert),
    }