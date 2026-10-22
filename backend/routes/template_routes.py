import os
import uuid
import json
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
from config import Config
from models.database import get_db
from services.template_service import TemplateService

template_bp = Blueprint("templates", __name__)

@template_bp.route("/upload", methods=["POST"])
def upload_template():
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    if not file or not file.filename:
        return jsonify({"error": "Invalid file"}), 400

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in Config.ALLOWED_TEMPLATE_EXTENSIONS:
        return jsonify({"error": f"Unsupported template format. Allowed: {Config.ALLOWED_TEMPLATE_EXTENSIONS}"}), 400

    template_id = str(uuid.uuid4())
    safe_name = f"{template_id}_{secure_filename(file.filename)}"
    save_path = Config.UPLOAD_FOLDER / safe_name
    file.save(save_path)

    # Inspect template schema
    try:
        schema = TemplateService.inspect_template(str(save_path), template_id, file.filename)
        schema_dict = schema.model_dump()

        conn = get_db()
        conn.execute(
            "INSERT INTO templates (id, filename, filepath, schema_json) VALUES (?, ?, ?, ?)",
            (template_id, file.filename, str(save_path), json.dumps(schema_dict))
        )
        conn.commit()
        conn.close()

        return jsonify({
            "template_id": template_id,
            "filename": file.filename,
            "schema": schema_dict
        }), 201
    except Exception as e:
        return jsonify({"error": f"Failed to inspect template: {str(e)}"}), 500

@template_bp.route("/<template_id>", methods=["GET"])
def get_template(template_id):
    conn = get_db()
    tmpl = conn.execute("SELECT * FROM templates WHERE id = ?", (template_id,)).fetchone()
    conn.close()

    if not tmpl:
        return jsonify({"error": "Template not found"}), 404

    return jsonify({
        "id": tmpl["id"],
        "filename": tmpl["filename"],
        "schema": json.loads(tmpl["schema_json"])
    })

@template_bp.route("", methods=["GET"])
def list_templates():
    conn = get_db()
    rows = conn.execute("SELECT id, filename, schema_json, created_at FROM templates ORDER BY created_at DESC").fetchall()
    conn.close()

    result = []
    for r in rows:
        result.append({
            "id": r["id"],
            "filename": r["filename"],
            "schema": json.loads(r["schema_json"]),
            "created_at": r["created_at"]
        })
    return jsonify(result)
