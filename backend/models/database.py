import sqlite3
import json
from pathlib import Path
from config import Config

def get_db():
    conn = sqlite3.connect(Config.DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        filepath TEXT NOT NULL,
        file_type TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        status TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS templates (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        filepath TEXT NOT NULL,
        schema_json TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS processing_jobs (
        id TEXT PRIMARY KEY,
        template_id TEXT,
        status TEXT NOT NULL,
        progress INTEGER DEFAULT 0,
        stage TEXT,
        message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS job_documents (
        job_id TEXT NOT NULL,
        document_id TEXT NOT NULL,
        PRIMARY KEY (job_id, document_id)
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS extracted_data (
        document_id TEXT PRIMARY KEY,
        job_id TEXT,
        document_type TEXT,
        header_data TEXT,
        line_items TEXT,
        confidence_data TEXT,
        warnings TEXT,
        raw_text TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS field_mappings (
        job_id TEXT PRIMARY KEY,
        mappings_json TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS generated_files (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL,
        filename TEXT NOT NULL,
        filepath TEXT NOT NULL,
        row_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully.")
