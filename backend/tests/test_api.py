from io import BytesIO

from docx import Document
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_extract_txt_document():
    response = client.post(
        "/documents/extract",
        files={"file": ("project.txt", b"First line.\nSecond line.", "text/plain")},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["filename"] == "project.txt"
    assert payload["word_count"] == 4
    assert "Second line." in payload["text"]


def test_extract_docx_includes_paragraphs_and_tables():
    document = Document()
    document.add_paragraph("Project abstract")
    table = document.add_table(rows=1, cols=2)
    table.cell(0, 0).text = "Dataset"
    table.cell(0, 1).text = "Telemetry"
    buffer = BytesIO()
    document.save(buffer)

    response = client.post(
        "/documents/extract",
        files={
            "file": (
                "project.docx",
                buffer.getvalue(),
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
        },
    )
    assert response.status_code == 200
    assert "Project abstract" in response.json()["text"]
    assert "Dataset | Telemetry" in response.json()["text"]


def test_rejects_unsupported_file_type():
    response = client.post(
        "/documents/extract",
        files={"file": ("project.exe", b"not a document", "application/octet-stream")},
    )
    assert response.status_code == 415


def test_short_ai_text_returns_actionable_validation_error():
    response = client.post("/analyze/ai", json={"text": "This is too short."})
    assert response.status_code == 422
    assert "100" in response.json()["detail"]


def test_ai_response_does_not_claim_calibrated_confidence(monkeypatch):
    monkeypatch.setattr(
        "app.main.analyze_text",
        lambda text: {
            "ai_likelihood": 31.2,
            "avg_perplexity": 48.1,
            "burstiness": 12.0,
            "sentence_scores": [48.1],
            "sentences": ["Example analysis sentence."],
            "word_count": 105,
            "warning": "Unvalidated heuristic.",
        },
    )
    response = client.post("/analyze/ai", json={"text": "Example text " * 105})
    assert response.status_code == 200
    assert response.json()["confidence"] is None


def test_similarity_handles_punctuation_only_text():
    response = client.post(
        "/analyze/similarity",
        json={"text_a": "!!! ???", "text_b": "... ---"},
    )
    assert response.status_code == 200
    assert response.json()["similarity_score"] == 0.0
    assert response.json()["overlaps"] == []


def test_revision_requires_server_side_api_key(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    response = client.post(
        "/writing/revise",
        json={"text": "A short paragraph to edit.", "goal": "clarity"},
    )
    assert response.status_code == 503


def test_extract_rejects_empty_document():
    response = client.post(
        "/documents/extract",
        files={"file": ("empty.txt", b"", "text/plain")},
    )
    assert response.status_code == 400
    assert "empty" in response.json()["detail"].lower()


def test_extract_enforces_upload_size_limit():
    from app.main import MAX_UPLOAD_BYTES

    response = client.post(
        "/documents/extract",
        files={"file": ("oversized.txt", b"x" * (MAX_UPLOAD_BYTES + 1), "text/plain")},
    )
    assert response.status_code == 413
    assert "15 MB" in response.json()["detail"]
