import unittest
from concurrent.futures import Future
from threading import Barrier
from unittest.mock import patch

import app as paper_app


class PaperRoutesTest(unittest.TestCase):
    def setUp(self):
        self.client = paper_app.app.test_client()
        with paper_app.cache_lock:
            paper_app.ENRICHMENT_CACHE.clear()
            paper_app.ENRICHMENT_JOBS.clear()
            paper_app.ENRICHMENT_BY_PAPER.clear()
            paper_app.PAPER_CACHE.clear()

    def test_enrichment_returns_immediately_and_reuses_job(self):
        future = Future()
        paper = {"title": "An example paper", "abstract": "Research results"}
        translated = {
            "title_zh": "Translated title",
            "abstract_zh": "Translated abstract",
            "summary_zh": "Summary",
        }
        with patch.object(paper_app, "AI_API_KEY", "test-key"), patch.object(
            paper_app.ENRICHMENT_EXECUTOR, "submit", return_value=future
        ) as submit:
            first = self.client.post("/api/enrich", json=paper)
            second = self.client.post("/api/enrich", json=paper)
            self.assertEqual(first.status_code, 202)
            self.assertEqual(second.json["job_id"], first.json["job_id"])
            submit.assert_called_once()

            url = "/api/enrich/" + first.json["job_id"]
            self.assertEqual(self.client.get(url).status_code, 202)
            future.set_result(translated)
            self.assertEqual(self.client.get(url).json, translated)
            self.assertEqual(self.client.get("/api/enrich/unknown").status_code, 404)

    def test_papers_fetch_journals_concurrently(self):
        barrier = Barrier(len(paper_app.JOURNALS), timeout=3)

        def fetch(key):
            barrier.wait()
            return [{
                "title": key,
                "date": "2026-10-23",
                "abstract": "Research abstract",
            }]

        with patch.object(paper_app, "fetch_journal_papers", side_effect=fetch):
            response = self.client.get("/api/papers?journal=all")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json["count"], len(paper_app.JOURNALS))
        self.assertEqual(response.json["errors"], [])

    def test_failed_enrichment_can_be_retried(self):
        failed = Future()
        retried = Future()
        paper = {"title": "A second example", "abstract": "Another result"}
        with patch.object(paper_app, "AI_API_KEY", "test-key"), patch.object(
            paper_app.ENRICHMENT_EXECUTOR, "submit", side_effect=[failed, retried]
        ) as submit:
            first = self.client.post("/api/enrich", json=paper)
            failed.set_exception(ValueError("Invalid model response"))
            self.assertEqual(
                self.client.get("/api/enrich/" + first.json["job_id"]).status_code,
                502,
            )
            second = self.client.post("/api/enrich", json=paper)
            self.assertEqual(second.status_code, 202)
            self.assertNotEqual(first.json["job_id"], second.json["job_id"])
            self.assertEqual(submit.call_count, 2)


if __name__ == "__main__":
    unittest.main()
