import sqlite3
import json
import os

DB_PATH = "prereqs.db"


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.commit()
    return conn


def init_db():
    """Create tables if they don't exist."""
    with get_conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS courses (
                course_id   TEXT PRIMARY KEY,
                subject     TEXT NOT NULL,
                number      TEXT NOT NULL
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS prereq_groups (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                course_id   TEXT NOT NULL REFERENCES courses(course_id),
                sequence    INTEGER NOT NULL,
                term        TEXT NOT NULL
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS prereq_options (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                group_id    INTEGER NOT NULL REFERENCES prereq_groups(id),
                course_id   TEXT NOT NULL
            )
        """)


def insert_course(conn, course_id, subject, number):
    conn.execute(
        "INSERT OR IGNORE INTO courses (course_id, subject, number) VALUES (?, ?, ?)",
        (course_id, subject, number),
    )


def insert_prereqs(conn, course_id, term, prereqs):
    """
    Insert prereq groups and options for a course+term.
    Replaces existing data for that course+term to support multi-term merging.
    """
    conn.execute(
        "DELETE FROM prereq_options WHERE group_id IN "
        "(SELECT id FROM prereq_groups WHERE course_id = ? AND term = ?)",
        (course_id, term),
    )
    conn.execute(
        "DELETE FROM prereq_groups WHERE course_id = ? AND term = ?",
        (course_id, term),
    )

    for group in prereqs:
        cursor = conn.execute(
            "INSERT INTO prereq_groups (course_id, sequence, term) VALUES (?, ?, ?)",
            (course_id, group["sequence"], term),
        )
        group_id = cursor.lastrowid
        for opt in group["options"]:
            conn.execute(
                "INSERT INTO prereq_options (group_id, course_id) VALUES (?, ?)",
                (group_id, opt["course_id"]),
            )


def load_json_file(conn, path):
    """Load a single data/*.json file into the database."""
    with open(path) as f:
        courses = json.load(f)

    for course in courses:
        course_id = course["course_id"]
        subject = "".join(c for c in course_id if c.isalpha())
        number = course_id[len(subject):]
        term = course.get("term", "unknown")

        insert_course(conn, course_id, subject, number)
        insert_prereqs(conn, course_id, term, course.get("prereqs", []))


def load_all(data_dir="data"):
    """Load all JSON files from the data directory into the database."""
    init_db()
    files = [f for f in os.listdir(data_dir) if f.endswith(".json")]

    with get_conn() as conn:
        for i, fname in enumerate(sorted(files)):
            path = os.path.join(data_dir, fname)
            print(f"[{i+1}/{len(files)}] {fname}", flush=True)
            load_json_file(conn, path)

    with get_conn() as conn:
        n_courses = conn.execute("SELECT COUNT(*) FROM courses").fetchone()[0]
        n_groups  = conn.execute("SELECT COUNT(*) FROM prereq_groups").fetchone()[0]
        n_options = conn.execute("SELECT COUNT(*) FROM prereq_options").fetchone()[0]

    print(f"\nDone. {n_courses} courses, {n_groups} prereq groups, {n_options} options → {DB_PATH}")


def get_prereqs(course_id):
    """
    Fetch structured prereqs for a course from the DB.
    Merges across all terms — if a course appears in multiple terms,
    the most recent term's prereqs take precedence (last write wins).
    Returns list of groups: [{"sequence": 1, "options": ["CSE21", "MATH154"]}, ...]
    """
    conn = get_conn()
    groups = conn.execute(
        "SELECT id, sequence FROM prereq_groups WHERE course_id = ? ORDER BY term DESC, sequence",
        (course_id,),
    ).fetchall()

    result = []
    seen_seq = set()
    for group in groups:
        if group["sequence"] in seen_seq:
            continue
        seen_seq.add(group["sequence"])

        options = conn.execute(
            "SELECT course_id FROM prereq_options WHERE group_id = ?",
            (group["id"],),
        ).fetchall()

        result.append({
            "sequence": group["sequence"],
            "options": [r["course_id"] for r in options],
        })

    conn.close()
    return sorted(result, key=lambda g: g["sequence"])


if __name__ == "__main__":
    load_all()
    print(get_prereqs("CSE100"))