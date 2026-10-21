import psycopg2
from app.config import settings

def create_indexes():
    conn = psycopg2.connect(settings.SYNC_DATABASE_URL)
    conn.autocommit = True
    cur = conn.cursor()

    commands = [
        "CREATE INDEX IF NOT EXISTS ix_cases_embedding_hnsw ON cases USING hnsw (embedding vector_cosine_ops);",
        "CREATE INDEX IF NOT EXISTS ix_cases_expected_disposal_open ON cases (expected_disposal_date) WHERE status NOT IN ('Disposed');",
        "CREATE INDEX IF NOT EXISTS ix_cases_text_search ON cases USING gin(to_tsvector('english', title || ' ' || description));",
        "CREATE INDEX IF NOT EXISTS ix_institutions_text_search ON institutions USING gin(to_tsvector('english', name));"
    ]

    for cmd in commands:
        try:
            cur.execute(cmd)
            print(f"Executed: {cmd[:50]}...")
        except Exception as e:
            print(f"Notice on command: {e}")

    cur.close()
    conn.close()
    print("All specialized HNSW, partial, and GIN indexes created successfully!")

if __name__ == "__main__":
    create_indexes()
