import sqlite3
import json
import os

DB_PATH = "prereqs.db"

def init_db():
    """Initialize the SQLite database and create the courses table."""
    conn = sqlite3.connect(DB_PATH)
    conn.execute('''
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

