import uuid
import json
import threading
from flask import Blueprint, request, jsonify
from config import Config
from models.database import get_db
from providers.tesseract_provider import TesseractExtractor
from services.extraction_service import ExtractionService
from services.mapping_service import MappingService

from providers.tesseract_provider import TesseractExtractor
from providers.gemini_provider import GeminiExtractor

job_bp = Blueprint("jobs", __name__)
tesseract_extractor = TesseractExtractor()
gemini_extractor = GeminiExtractor()

def _run_processing_worker(job_id: str, document_ids: list, template_id: str = None):
    conn = get_db()
    cursor = conn.cursor()

    try:
        # Update stage
        cursor.execute("UPDATE processing_jobs SET status = 'processing', progress = 10, stage = 'OCR & Preprocessing' WHERE id = ?", (job_id,))
        conn.commit()

        total_docs = len(document_ids)
        for i, doc_id in enumerate(document_ids, start=1):
            doc = cursor.execute("SELECT * FROM documents WHERE id = ?", (doc_id,)).fetchone()
            if not doc:
                continue

            file_path = doc["filepath"]
            
            # Step 1: Preprocess & OCR / Extraction
            structured = None
            raw_text = ""
            overall_confidence = 85.0

            if gemini_extractor.is_available() and Config.EXTRACTION_PROVIDER in ("gemini", "hybrid"):
                try:
                    res = gemini_extractor.extract_text_and_layout(file_path)
                    raw_text = res["raw_text"]
                    overall_confidence = res["confidence"]
                    structured = res["structured"]
                except Exception as ex:
                    print(f"Gemini extractor failed, falling back to Tesseract: {ex}")

            if structured is None:
                ocr_res = tesseract_extractor.extract_text_and_layout(file_path)
                raw_text = ocr_res["raw_text"]
                overall_confidence = ocr_res["confidence"]
                structured = ExtractionService.extract_structured_data(
                    raw_text=raw_text,
                    lines=ocr_res["lines"],
                    blocks=ocr_res.get("blocks", [])
                )

            # Save extracted data
            cursor.execute(
                """
                INSERT OR REPLACE INTO extracted_data 
                (document_id, job_id, document_type, header_data, line_items, confidence_data, warnings, raw_text)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    doc_id,
                    job_id,
                    structured["document_type"],
                    json.dumps(structured["header"]),
                    json.dumps(structured["line_items"]),
                    json.dumps({
                        "overall": overall_confidence,
                        "header": structured.get("header_confidence", {}),
                        "line_items": structured.get("line_items_confidence", [])
                    }),
                    json.dumps(structured.get("warnings", [])),
                    raw_text
                )
            )

            progress_val = int(10 + (i / total_docs) * 60)
            cursor.execute("UPDATE processing_jobs SET progress = ?, stage = 'Extracting fields' WHERE id = ?", (progress_val, job_id))
            conn.commit()

        # Step 3: Auto-map fields if template is supplied
        if template_id:
            tmpl = cursor.execute("SELECT schema_json FROM templates WHERE id = ?", (template_id,)).fetchone()
            if tmpl:
                schema = json.loads(tmpl["schema_json"])
                field_names = [f["name"] for f in schema.get("fields", [])]
                
                # Collect extracted fields from documents
                docs_data = cursor.execute("SELECT header_data, line_items FROM extracted_data WHERE job_id = ?", (job_id,)).fetchall()
                extracted_summary = {}
                for d in docs_data:
                    try:
                        h = json.loads(d["header_data"] or "{}")
                        extracted_summary.update({k: v for k, v in h.items() if v is not None})
                    except Exception:
                        pass
                    try:
                        items = json.loads(d["line_items"] or "[]")
                        for it in items:
                            extracted_summary.update({k: v for k, v in it.items() if v is not None})
                    except Exception:
                        pass

                auto_mappings = MappingService.auto_map_fields(field_names, extracted_summary)
                mappings_dict = [m.model_dump() for m in auto_mappings]
                
                cursor.execute(
                    "INSERT OR REPLACE INTO field_mappings (job_id, mappings_json) VALUES (?, ?)",
                    (job_id, json.dumps(mappings_dict))
                )

        # Finished processing, ready for human review
        cursor.execute("UPDATE processing_jobs SET status = 'completed', progress = 100, stage = 'Ready for Review' WHERE id = ?", (job_id,))
        conn.commit()

    except Exception as e:
        cursor.execute("UPDATE processing_jobs SET status = 'failed', message = ? WHERE id = ?", (str(e), job_id))
        conn.commit()
    finally:
        conn.close()

@job_bp.route("", methods=["POST"])
def create_job():
    payload = request.get_json() or {}
    document_ids = payload.get("document_ids", [])
    template_id = payload.get("template_id")

    if not document_ids:
        return jsonify({"error": "No document IDs provided"}), 400

    job_id = f"JOB-{uuid.uuid4().hex[:8].upper()}"
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute(
        "INSERT INTO processing_jobs (id, template_id, status, progress, stage, message) VALUES (?, ?, 'queued', 0, 'Queued', 'Initializing...')",
        (job_id, template_id)
    )

    for doc_id in document_ids:
        cursor.execute(
            "INSERT OR IGNORE INTO job_documents (job_id, document_id) VALUES (?, ?)",
            (job_id, doc_id)
        )

    conn.commit()
    conn.close()

    # Launch asynchronous worker thread
    thread = threading.Thread(target=_run_processing_worker, args=(job_id, document_ids, template_id), daemon=True)
    thread.start()

    return jsonify({"job_id": job_id, "status": "queued", "progress": 0}), 201

@job_bp.route("/<job_id>", methods=["GET"])
def get_job(job_id):
    conn = get_db()
    job = conn.execute("SELECT * FROM processing_jobs WHERE id = ?", (job_id,)).fetchone()
    if not job:
        conn.close()
        return jsonify({"error": "Job not found"}), 404

    # Fetch document statuses & summaries
    docs_rows = conn.execute("""
        SELECT d.id, d.filename, d.file_type, d.file_size, e.document_type, e.warnings, e.confidence_data
        FROM job_documents jd
        JOIN documents d ON jd.document_id = d.id
        LEFT JOIN extracted_data e ON d.id = e.document_id
        WHERE jd.job_id = ?
    """, (job_id,)).fetchall()

    mappings_row = conn.execute("SELECT mappings_json FROM field_mappings WHERE job_id = ?", (job_id,)).fetchone()
    conn.close()

    docs_list = []
    for r in docs_rows:
        docs_list.append({
            "id": r["id"],
            "filename": r["filename"],
            "file_type": r["file_type"],
            "document_type": r["document_type"] or "Pending",
            "warnings": json.loads(r["warnings"]) if r["warnings"] else [],
            "confidence": json.loads(r["confidence_data"]) if r["confidence_data"] else {}
        })

    return jsonify({
        "id": job["id"],
        "template_id": job["template_id"],
        "status": job["status"],
        "progress": job["progress"],
        "stage": job["stage"],
        "message": job["message"],
        "documents": docs_list,
        "mappings": json.loads(mappings_row["mappings_json"]) if mappings_row else []
    })

@job_bp.route("/<job_id>/mapping", methods=["POST"])
def update_mapping(job_id):
    payload = request.get_json() or {}
    mappings = payload.get("mappings", [])

    conn = get_db()
    conn.execute(
        "INSERT OR REPLACE INTO field_mappings (job_id, mappings_json) VALUES (?, ?)",
        (job_id, json.dumps(mappings))
    )
    conn.commit()
    conn.close()

    return jsonify({"status": "success", "message": "Mappings updated successfully"})

@job_bp.route("/<job_id>/auto-map", methods=["POST"])
def auto_map_job(job_id):
    conn = get_db()
    job = conn.execute("SELECT template_id FROM processing_jobs WHERE id = ?", (job_id,)).fetchone()
    if not job or not job["template_id"]:
        conn.close()
        return jsonify({"error": "No template associated with this job"}), 400

    tmpl = conn.execute("SELECT schema_json FROM templates WHERE id = ?", (job["template_id"],)).fetchone()
    if not tmpl:
        conn.close()
        return jsonify({"error": "Template not found"}), 404

    schema = json.loads(tmpl["schema_json"])
    field_names = [f["name"] for f in schema.get("fields", [])]
    
    # Collect extracted fields from documents
    docs_data = conn.execute("SELECT header_data, line_items FROM extracted_data WHERE job_id = ?", (job_id,)).fetchall()
    extracted_summary = {}
    for d in docs_data:
        try:
            h = json.loads(d["header_data"] or "{}")
            extracted_summary.update({k: v for k, v in h.items() if v is not None})
        except Exception:
            pass
        try:
            items = json.loads(d["line_items"] or "[]")
            for it in items:
                extracted_summary.update({k: v for k, v in it.items() if v is not None})
        except Exception:
            pass

    auto_mappings = MappingService.auto_map_fields(field_names, extracted_summary)
    mappings_dict = [m.model_dump() for m in auto_mappings]
    
    conn.execute(
        "INSERT OR REPLACE INTO field_mappings (job_id, mappings_json) VALUES (?, ?)",
        (job_id, json.dumps(mappings_dict))
    )
    conn.commit()
    conn.close()

    return jsonify({"mappings": mappings_dict})
