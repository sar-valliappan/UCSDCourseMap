import json
import os
import sys
from functools import lru_cache

DATA_DIR = "data"


def load_all_courses():
    """Load all course data from JSON files into a single dict keyed by course_id."""
    courses = {}
    for fname in os.listdir(DATA_DIR):
        if not fname.endswith(".json"):
            continue
        with open(os.path.join(DATA_DIR, fname)) as f:
            for course in json.load(f):
                courses[course["course_id"]] = course["prereqs"]
    return courses


def build_tree(course_id, courses, visited=None):
    """
    Recursively build a prerequisite tree for a given course.

    Returns a nested dict:
    {
        "course_id": "CSE100",
        "prereqs": [                        <- AND groups (must satisfy all)
            {
                "sequence": 1,
                "options": [                <- OR options (pick one)
                    {
                        "course_id": "CSE21",
                        "prereqs": [...]    <- recursive
                    },
                    ...
                ]
            },
            ...
        ]
    }

    Cycles are broken by tracking visited courses.
    """
    if visited is None:
        visited = set()

    if course_id in visited:
        return {"course_id": course_id, "prereqs": [], "note": "cycle"}

    visited = visited | {course_id}  # immutable update — each branch has its own visited set

    prereq_groups = courses.get(course_id, [])

    groups = []
    for group in prereq_groups:
        options = []
        for opt in group["options"]:
            child_id = opt["course_id"]
            child_tree = build_tree(child_id, courses, visited)
            options.append(child_tree)
        groups.append({"sequence": group["sequence"], "options": options})

    return {"course_id": course_id, "prereqs": groups}


def print_tree(node, indent=0, prefix=""):
    """Pretty-print the prereq tree."""
    pad = "  " * indent
    note = f" ({node['note']})" if "note" in node else ""
    print(f"{pad}{prefix}{node['course_id']}{note}")

    groups = node.get("prereqs", [])
    for group in groups:
        options = group["options"]
        if len(options) == 1:
            print_tree(options[0], indent + 1, prefix="")
        else:
            print(f"{'  ' * (indent + 1)}pick one of:")
            for opt in options:
                print_tree(opt, indent + 2, prefix="- ")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python prereq_tree.py <COURSE_ID>")
        print("Example: python prereq_tree.py CSE100")
        sys.exit(1)

    course_id = sys.argv[1].upper()

    print(f"Loading course data from {DATA_DIR}/...")
    courses = load_all_courses()
    print(f"Loaded {len(courses)} courses\n")

    if course_id not in courses:
        print(f"Course {course_id} not found in data. Run scraper.py first.")
        sys.exit(1)

    tree = build_tree(course_id, courses)

    print(f"=== Prerequisite tree for {course_id} ===\n")
    print_tree(tree)