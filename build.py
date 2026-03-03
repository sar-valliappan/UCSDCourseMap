#!/usr/bin/env python3
"""
Generate frontend/courseData.json from data/*.json.
Run from project root: python build.py
"""
import json
import os
from collections import defaultdict

DATA_DIR = "data"
OUT = "frontend/courseData.json"


def main():
    # courses: {course_id: [{sequence, options: [course_id, ...]}]}
    courses: dict = {}
    descriptions: dict = {}
    for fname in sorted(os.listdir(DATA_DIR)):
        if not fname.endswith(".json"):
            continue
        with open(os.path.join(DATA_DIR, fname)) as f:
            for entry in json.load(f):
                cid = entry["course_id"]
                courses[cid] = [
                    {
                        "sequence": g["sequence"],
                        "options": [o["course_id"] for o in g["options"]],
                    }
                    for g in entry.get("prereqs", [])
                ]
                if entry.get("description"):
                    descriptions[cid] = entry["description"]

    print(f"Loaded {len(courses)} courses, {len(descriptions)} descriptions")

    # Reverse mapping: what courses does each course unlock?
    unlocks: dict = defaultdict(list)
    for cid, groups in courses.items():
        for g in groups:
            for prereq_id in g["options"]:
                if cid not in unlocks[prereq_id]:
                    unlocks[prereq_id].append(cid)

    output = {
        "courses": courses,
        "unlocks": {k: sorted(v) for k, v in unlocks.items()},
        "courseIds": sorted(courses.keys()),
        "descriptions": descriptions,
    }

    with open(OUT, "w") as f:
        json.dump(output, f, separators=(",", ":"))

    size = os.path.getsize(OUT)
    print(f"Written {OUT}  ({size / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
