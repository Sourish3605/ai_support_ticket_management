from django.test import TestCase
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

from .preprocessing import preprocess_ticket, mask_pii, strip_signature, strip_quoted_replies
from .classification import classify_ticket
from .views import get_sla_metrics
from .rag_service import hybrid_retrieve_chunks, generate_grounded_resolution
import mongodb

User = get_user_model()


class Milestone1ProcessingTests(TestCase):
    """Milestone 1 — Ticket Preprocessing, PII Masking, Classification & SLA Tests."""

    def test_pii_masking(self):
        sample_text = (
            "Contact user at alex.smith@company.com or +1 555-123-4567. "
            "Server IP is 192.168.1.100. Employee EMP-98765 said password is SecretPass123"
        )
        masked = mask_pii(sample_text)
        self.assertNotIn("alex.smith@company.com", masked)
        self.assertIn("[EMAIL]", masked)
        self.assertNotIn("192.168.1.100", masked)
        self.assertIn("[IP]", masked)
        self.assertNotIn("EMP-98765", masked)
        self.assertIn("[EMPLOYEE_ID]", masked)
        self.assertNotIn("SecretPass123", masked)
        self.assertIn("[REDACTED]", masked)

    def test_email_signature_and_reply_stripping(self):
        sample = (
            "VPN is disconnecting every 5 minutes.\n\n"
            "> On Monday user wrote:\n"
            "> Previous issue details...\n\n"
            "Best regards,\nAlex Smith\nIT Department"
        )
        cleaned = preprocess_ticket("VPN Issue", sample)
        self.assertIn("VPN is disconnecting", cleaned["description"])
        self.assertNotIn("Best regards,", cleaned["description"])
        self.assertNotIn("On Monday user wrote:", cleaned["description"])

    def test_classification_and_priority(self):
        # 1. Network VPN case
        cat, sub, sev, prio = classify_ticket(
            "VPN connection failing",
            "Cannot connect to corporate VPN from home network"
        )
        self.assertEqual(cat, "Network")
        self.assertEqual(sub, "VPN")
        self.assertIn(prio, ["P1", "P2"])

        # 2. Phishing Security case
        cat, sub, sev, prio = classify_ticket(
            "Urgent: Phishing email received",
            "Suspicious ransomware invoice link received from external user"
        )
        self.assertEqual(cat, "Security")
        self.assertEqual(sub, "Phishing")
        self.assertEqual(sev, "Critical")
        self.assertEqual(prio, "P1")

    def test_sla_calculation(self):
        p1_sla = get_sla_metrics("P1")
        self.assertEqual(p1_sla["resolution_hours"], 4)
        self.assertEqual(p1_sla["coverage"], "24/7")

        p3_sla = get_sla_metrics("P3")
        self.assertEqual(p3_sla["resolution_hours"], 24)
        self.assertEqual(p3_sla["coverage"], "Business Hours")


class Milestone2RAGRetrievalTests(TestCase):
    """Milestone 2 — Knowledge Retrieval, RAG Pipeline & Grounded Resolution Tests."""

    def test_grounded_resolution_generation_with_citations(self):
        result = generate_grounded_resolution(
            query_text="VPN is not connecting to the company network gateway timeout",
            category="Network",
            sub_category="VPN",
        )

        self.assertTrue(result["knowledge_retrieved"])
        self.assertIn("suggested_steps", result)
        self.assertTrue(len(result["suggested_steps"]) > 0)

        # Mandatory M2 Requirement: 100% of generated resolutions must contain citations
        self.assertIn("citations", result)
        self.assertTrue(len(result["citations"]) >= 1)

        first_citation = result["citations"][0]
        self.assertIn("source_title", first_citation)
        self.assertIn("section", first_citation)
        self.assertIn("quote", first_citation)
        self.assertIn("score", first_citation)

    def test_m2_all_mongodb_collections_exported(self):
        """Verify all 9 M2 collections + M1 collections are defined and exported."""
        required_collections = [
            # M1
            "tickets_collection",
            "classifications_collection",
            "sla_calculations_collection",
            # M2 (9 Collections)
            "knowledge_articles_collection",
            "article_versions_collection",
            "article_chunks_collection",
            "ingestion_jobs_collection",
            "ticket_responses_collection",
            "citations_collection",
            "feedback_collection",
            "kb_gaps_collection",
            "retrieval_logs_collection",
        ]

        for coll_name in required_collections:
            self.assertTrue(
                hasattr(mongodb, coll_name),
                f"Collection '{coll_name}' is missing in mongodb.py"
            )
