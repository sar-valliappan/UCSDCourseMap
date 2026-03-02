from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import db
from prereq_tree import build_tree

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/prereqs/{course_id}")
def prereqs(course_id: str):
    """Structured prereq groups for a course."""
    course_id = course_id.upper()
    result = db.get_prereqs(course_id)
    if not result:
        raise HTTPException(status_code=404, detail=f"{course_id} not found or has no prereqs")
    return {"course_id": course_id, "prereqs": result}


@app.get("/tree/{course_id}")
def tree(course_id: str):
    """Full recursive prereq tree for a course."""
    course_id = course_id.upper()
    return build_tree(course_id)


@app.get("/unlocks/{course_id}")
def unlocks(course_id: str):
    """Courses that this course unlocks (reverse prereq lookup)."""
    course_id = course_id.upper()
    result = db.get_unlocks(course_id)
    return {"course_id": course_id, "unlocks": result}