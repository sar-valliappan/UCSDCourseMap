import sys
import re
import json
import time
import os
import requests

from bs4 import BeautifulSoup
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

CATALOG_BASE = "https://catalog.ucsd.edu"


def create_session():
    session = requests.Session()
    retries = Retry(
        total=5,
        backoff_factor=0.5,
        status_forcelist=[429, 500, 502, 503, 504],
    )
    adapter = HTTPAdapter(max_retries=retries)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    return session


session = create_session()

def get_department_urls():
    """Scrape all department course page URLs from the catalog index."""
    resp = session.get(f"{CATALOG_BASE}/front/courses.html", timeout=15)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")

    urls = {}
    for a in soup.find_all("a", href=True):
        if "/courses/" in a["href"] and a.get_text(strip=True).lower() == "courses":
            full_url = CATALOG_BASE + "/" + a["href"].lstrip("./")
            dept = re.search(r"/courses/(\w+)\.html", full_url)
            if dept:
                urls[dept.group(1)] = full_url

    return urls  # {"CSE": "https://...", "MATH": "https://...", ...}


def get_course_ids(catalog_url):
    """Scrape all course IDs from a catalog page e.g. catalog.ucsd.edu/courses/CSE.html"""
    resp = session.get(catalog_url, timeout=15)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")

    courses = []
    for tag in soup.find_all(["p", "dt"]):
        match = re.match(r"^([A-Z]+)\s+(\w+)\.", tag.get_text(" ", strip=True))
        if match:
            subject, number = match.group(1), match.group(2)
            num_match = re.match(r"(\d+)", number)
            if not num_match:
                continue
            if int(num_match.group(1)) >= 200:
                break
            courses.append((subject, number))
    return courses


def get_prereqs(subject, number, term="WI26"):
    course_id = f"{subject}{number}"
    resp = session.get(
        "https://act.ucsd.edu/scheduleOfClasses/scheduleOfClassesPreReq.htm",
        params={"termCode": term, "courseId": course_id},
        timeout=15,
    )
    resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "html.parser")
    groups = []

    for row in soup.find_all("tr"):
        cells = row.find_all("td")
        if len(cells) < 2:
            continue

        seq = cells[0].get_text(strip=True).rstrip(".")
        if not seq.isdigit():
            continue

        options = []
        for span in cells[1].find_all("span", class_="bold_text"):
            cid = span.get_text(strip=True)
            if not cid or not any(c.isdigit() for c in cid):
                continue

            title = ""
            for sibling in span.next_siblings:
                text = sibling if isinstance(sibling, str) else sibling.get_text()
                text = text.strip().strip("()")
                if text and text.lower() != "or":
                    title = text
                    break

            options.append({"course_id": cid, "title": title.strip()})

        if options:
            groups.append({"sequence": int(seq), "options": options})

    return {"course_id": course_id, "term": term, "prereqs": groups}


def scrape_dept(code, term):
    url = f"{CATALOG_BASE}/courses/{code.upper()}.html"
    course_ids = get_course_ids(url)
    print(f"Found {len(course_ids)} courses")

    if not course_ids:
        print("No courses found, skipping.")
        return

    by_prefix = {}
    for subject, number in course_ids:
        by_prefix.setdefault(subject, []).append((subject, number))

    for prefix, courses in by_prefix.items():
        scrape_courses(courses, term, f"data/{prefix}.json")


def scrape_all(term):
    print("Fetching department list...")
    dept_urls = get_department_urls()
    print(f"Found {len(dept_urls)} departments\n")

    for dept in sorted(dept_urls.keys()):
        print(f"--- {dept}")
        scrape_dept(dept, term)
        print()


def scrape_courses(course_ids, term, out):
    results = []
    for i, (subject, number) in enumerate(course_ids):
        print(f"[{i+1}/{len(course_ids)}] {subject}{number}", end=" ", flush=True)
        try:
            result = get_prereqs(subject, number, term)
            print(f"({len(result['prereqs'])} groups)")
        except Exception as e:
            print(f"(error: {e})")
            result = {"course_id": f"{subject}{number}", "term": term, "prereqs": []}
        results.append(result)

    with open(out, "w") as f:
        json.dump(results, f, indent=2)
    print(f"Saved to {out}")
    return results


if __name__ == "__main__":
    start = time.time()

    if len(sys.argv) < 2:
        print("Usage:")
        print("  One dept:   python scraper.py <CODE> [term]        e.g. python scraper.py CSE WI26")
        print("  All depts:  python scraper.py --all [term]         e.g. python scraper.py --all WI26")
        sys.exit(1)

    os.makedirs("data", exist_ok=True)

    if sys.argv[1] == "--all":
        term = sys.argv[2] if len(sys.argv) > 2 else "WI26"
        scrape_all(term)
    else:
        code = sys.argv[1]
        term = sys.argv[2] if len(sys.argv) > 2 else "WI26"
        scrape_dept(code, term)

    print(f"Total time: {time.time() - start:.2f} seconds")