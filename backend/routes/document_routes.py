import os
import uuid
import json
from flask import Blueprint, request, jsonify, send_file
from werkzeug.utils import secure_filename
from config import Config
from models.database import get_db
from providers.tesseract_provider import TesseractExtractor
from services.extraction_service import ExtractionService

document_bp = Blueprint("documents", __name__)
extractor = TesseractExtractor()

@document_bp.route("/upload", methods=["POST"])
def upload_documents():
    if "files" not in request.files:
        return jsonify({"error": "No files provided"}), 400

    uploaded_files = request.files.getlist("files")
    saved_docs = []
    conn = get_db()
    cursor = conn.cursor()

    for file in uploaded_files:
        if file and file.filename:
            ext = os.path.splitext(file.filename)[1].lower()
            if ext not in Config.ALLOWED_DOC_EXTENSIONS:
                continue

            doc_id = str(uuid.uuid4())
            safe_name = f"{doc_id}_{secure_filename(file.filename)}"
            save_path = Config.UPLOAD_FOLDER / safe_name
            file.save(save_path)

            file_size = os.path.getsize(save_path)

            cursor.execute(
                "INSERT INTO documents (id, filename, filepath, file_type, file_size, status) VALUES (?, ?, ?, ?, ?, ?)",
                (doc_id, file.filename, str(save_path), ext, file_size, "uploaded")
            )
            saved_docs.append({
                "id": doc_id,
                "filename": file.filename,
                "file_type": ext,
                "file_size": file_size,
                "status": "uploaded"
            })

    conn.commit()
    conn.close()

    return jsonify({"documents": saved_docs, "count": len(saved_docs)}), 201

@document_bp.route("/<document_id>", methods=["GET"])
def get_document(document_id):
    conn = get_db()
    doc = conn.execute("SELECT * FROM documents WHERE id = ?", (document_id,)).fetchone()
    conn.close()

    if not doc:
        return jsonify({"error": "Document not found"}), 404

    return jsonify(dict(doc))

@document_bp.route("/<document_id>/file", methods=["GET"])
def get_document_file(document_id):
    conn = get_db()
    doc = conn.execute("SELECT * FROM documents WHERE id = ?", (document_id,)).fetchone()
    conn.close()

    if not doc:
        return jsonify({"error": "Document not found"}), 404

    return send_file(doc["filepath"])

@document_bp.route("/<document_id>/data", methods=["GET"])
def get_document_data(document_id):
    conn = get_db()
    data = conn.execute("SELECT * FROM extracted_data WHERE document_id = ?", (document_id,)).fetchone()
    conn.close()

    if not data:
        return jsonify({"error": "No extracted data found for this document"}), 404

    return jsonify({
        "document_id": data["document_id"],
        "document_type": data["document_type"],
        "header": json.loads(data["header_data"] or "{}"),
        "line_items": json.loads(data["line_items"] or "[]"),
        "confidence": json.loads(data["confidence_data"] or "{}"),
        "warnings": json.loads(data["warnings"] or "[]"),
        "raw_text": data["raw_text"]
    })

@document_bp.route("/<document_id>/data", methods=["PUT"])
def update_document_data(document_id):
    payload = request.get_json() or {}
    header = payload.get("header", {})
    line_items = payload.get("line_items", [])
    warnings = payload.get("warnings", [])

    conn = get_db()
    conn.execute(
        """
        UPDATE extracted_data 
        SET header_data = ?, line_items = ?, warnings = ?, updated_at = CURRENT_TIMESTAMP
        WHERE document_id = ?
        """,
        (json.dumps(header), json.dumps(line_items), json.dumps(warnings), document_id)
    )
    conn.commit()
    conn.close()

    return jsonify({"status": "success", "message": "Document data updated successfully"})
