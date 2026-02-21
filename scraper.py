import sys
import re
import json
import requests

from bs4 import BeautifulSoup
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

import time
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

def get_course_ids(catalog_url):
    """Scrape all course IDs from a catalog page e.g. catalog.ucsd.edu/courses/CSE.html"""
    resp = requests.get(catalog_url, timeout=15)
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
            
            numeric_value = int(num_match.group(1))
            if numeric_value >= 200:
                break
            
            courses.append((subject, number))
    return courses


def get_prereqs(subject, number, term="WI26"):
    course_id = f"{subject}{number}"
    resp = requests.get(
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


if __name__ == "__main__":
    start = time.time()
    if len(sys.argv) < 3:
        print("Usage:")
        print("  Full catalog:   python scraper.py <CODE> [term]")
        sys.exit(1)

    code = sys.argv[1]
    url = f"https://catalog.ucsd.edu/courses/{code.upper()}.html"
    term = sys.argv[2] if len(sys.argv) > 2 else "WI26"
    out = f"data/{code}.json"

    course_ids = get_course_ids(url)
    print(f"Found {len(course_ids)} courses")

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
    print(f"Total time: {time.time() - start:.2f} seconds")