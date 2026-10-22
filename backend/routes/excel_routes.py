import os
import uuid
import json
from datetime import datetime
from flask import Blueprint, request, jsonify, send_file
from config import Config
from models.database import get_db
from services.excel_service import ExcelService

excel_bp = Blueprint("excel", __name__)

@excel_bp.route("/generate", methods=["POST"])
def generate_excel():
    payload = request.get_json() or {}
    job_id = payload.get("job_id")
    template_id = payload.get("template_id")
    custom_mappings = payload.get("mappings")

    if not job_id:
        return jsonify({"error": "job_id is required"}), 400

    conn = get_db()
    
    # Fetch template
    if not template_id:
        job = conn.execute("SELECT template_id FROM processing_jobs WHERE id = ?", (job_id,)).fetchone()
        if job:
            template_id = job["template_id"]

    tmpl = conn.execute("SELECT * FROM templates WHERE id = ?", (template_id,)).fetchone()
    if not tmpl:
        conn.close()
        return jsonify({"error": "Template not found"}), 404

    tmpl_schema = json.loads(tmpl["schema_json"])
    template_path = tmpl["filepath"]
    header_row = tmpl_schema.get("header_row", 1)

    # Fetch mappings
    if not custom_mappings:
        m_row = conn.execute("SELECT mappings_json FROM field_mappings WHERE job_id = ?", (job_id,)).fetchone()
        mappings = json.loads(m_row["mappings_json"]) if m_row else []
    else:
        mappings = custom_mappings

    # Fetch documents extracted data
    docs_rows = conn.execute("""
        SELECT d.id, d.filename, e.header_data, e.line_items
        FROM job_documents jd
        JOIN documents d ON jd.document_id = d.id
        LEFT JOIN extracted_data e ON d.id = e.document_id
        WHERE jd.job_id = ?
    """, (job_id,)).fetchall()

    documents_data = []
    for r in docs_rows:
        documents_data.append({
            "document_id": r["id"],
            "filename": r["filename"],
            "header": json.loads(r["header_data"] or "{}"),
            "line_items": json.loads(r["line_items"] or "[]")
        })

    # Output filename
    date_str = datetime.now().strftime("%Y-%m-%d_%H%M%S")
    base_name = os.path.splitext(tmpl["filename"])[0]
    out_name = f"{base_name}_Generated_{date_str}.xlsx"

    try:
        gen_result = ExcelService.generate_excel(
            template_path=template_path,
            output_filename=out_name,
            header_row=header_row,
            mappings=mappings,
            documents_data=documents_data
        )

        file_id = str(uuid.uuid4())
        conn.execute(
            "INSERT INTO generated_files (id, job_id, filename, filepath, row_count) VALUES (?, ?, ?, ?, ?)",
            (file_id, job_id, out_name, gen_result["output_path"], gen_result["row_count"])
        )
        conn.commit()
        conn.close()

        return jsonify({
            "file_id": file_id,
            "filename": out_name,
            "row_count": gen_result["row_count"],
            "preview_data": gen_result["preview_data"],
            "download_url": f"/api/excel/{file_id}/download"
        }), 201

    except Exception as e:
        conn.close()
        return jsonify({"error": f"Excel generation failed: {str(e)}"}), 500

@excel_bp.route("/<file_id>/preview", methods=["GET"])
def preview_excel(file_id):
    conn = get_db()
    f = conn.execute("SELECT * FROM generated_files WHERE id = ?", (file_id,)).fetchone()
    conn.close()

    if not f:
        return jsonify({"error": "Generated file not found"}), 404

    return jsonify({
        "file_id": f["id"],
        "filename": f["filename"],
        "row_count": f["row_count"]
    })

@excel_bp.route("/<file_id>/download", methods=["GET"])
def download_excel(file_id):
    conn = get_db()
    f = conn.execute("SELECT * FROM generated_files WHERE id = ?", (file_id,)).fetchone()
    conn.close()

    if not f:
        return jsonify({"error": "Generated file not found"}), 404

    return send_file(
        f["filepath"],
        as_attachment=True,
        download_name=f["filename"],
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
