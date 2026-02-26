import sqlite3
import json
import os

DB_PATH = "prereqs.db"

def init_db():
    """Initialize the SQLite database and create the courses table."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS courses (
            course_id TEXT PRIMARY KEY,
            subject TEXT NOT NULL,
            number TEXT NOT NULL
        );
            
        CREATE TABLE IF NOT EXISTS prereq_groups (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                course_id   TEXT NOT NULL REFERENCES courses(course_id),
                sequence    INTEGER NOT NULL,
                term        TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS prereq_options (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            group_id    INTEGER NOT NULL REFERENCES prereq_groups(id),
            course_id   TEXT NOT NULL
        );
    ''')
    conn.commit()
    conn.close()

def insert_course(course_id, subject, number):
    """Insert a course into the database."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('INSERT OR IGNORE INTO courses (course_id, subject, number) VALUES (?, ?, ?)', (course_id, subject, number))
    conn.commit()
    conn.close()

def insert_prereqs(course_id, term, prereqs):
    """Insert prerequisite groups and options for a course."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute(
        "DELETE FROM prereq_options WHERE group_id IN "
        "(SELECT id FROM prereq_groups WHERE course_id = ? AND term = ?)",
        (course_id, term),
    )
    c.execute(
        "DELETE FROM prereq_groups WHERE course_id = ? AND term = ?",
        (course_id, term),
    )
    for group in prereqs:
        c.execute(
            "INSERT INTO prereq_groups (course_id, sequence, term) VALUES (?, ?, ?)",
            (course_id, group["sequence"], term),
        )
        group_id = c.lastrowid
        for option in group["options"]:
            c.execute(
                "INSERT INTO prereq_options (group_id, course_id) VALUES (?, ?)",
                (group_id, option["course_id"]),
            )