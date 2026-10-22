import os
import shutil
from flask import Flask, jsonify
from flask_cors import CORS
from config import Config
from models.database import init_db
from routes.document_routes import document_bp
from routes.template_routes import template_bp
from routes.job_routes import job_bp
from routes.excel_routes import excel_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Enable CORS for React frontend
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Initialize SQLite database
    init_db()

    # Register blueprints
    app.register_blueprint(document_bp, url_prefix="/api/documents")
    app.register_blueprint(template_bp, url_prefix="/api/templates")
    app.register_blueprint(job_bp, url_prefix="/api/jobs")
    app.register_blueprint(excel_bp, url_prefix="/api/excel")

    @app.route("/api/health", methods=["GET"])
    def health_check():
        tesseract_exists = os.path.isfile(Config.TESSERACT_CMD) or bool(shutil.which(Config.TESSERACT_CMD))
        return jsonify({
            "status": "online",
            "service": "Document2Excel AI Engine",
            "tesseract_available": tesseract_exists,
            "gemini_available": bool(Config.GEMINI_API_KEY),
            "version": "1.0.0"
        })

    @app.route("/api/stats", methods=["GET"])
    def get_stats():
        from models.database import get_db
        conn = get_db()
        total_docs = conn.execute("SELECT COUNT(*) FROM documents").fetchone()[0]
        total_templates = conn.execute("SELECT COUNT(*) FROM templates").fetchone()[0]
        total_jobs = conn.execute("SELECT COUNT(*) FROM processing_jobs").fetchone()[0]
        total_generated = conn.execute("SELECT COUNT(*) FROM generated_files").fetchone()[0]
        
        recent_jobs = conn.execute("""
            SELECT j.id, j.status, j.stage, j.progress, j.created_at, COUNT(jd.document_id) as doc_count
            FROM processing_jobs j
            LEFT JOIN job_documents jd ON j.id = jd.job_id
            GROUP BY j.id
            ORDER BY j.created_at DESC LIMIT 5
        """).fetchall()
        
        conn.close()

        return jsonify({
            "documents_count": total_docs,
            "templates_count": total_templates,
            "jobs_count": total_jobs,
            "generated_count": total_generated,
            "recent_jobs": [dict(r) for r in recent_jobs]
        })

    # Error handlers
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Resource not found"}), 404

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({"error": "An internal server error occurred"}), 500

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5000, debug=False)
