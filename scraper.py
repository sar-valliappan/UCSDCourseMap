import sys
import re
import json
import requests
from bs4 import BeautifulSoup

def get_course_ids(catalog_url):
    """Scrape all course IDs from a catalog page e.g. catalog.ucsd.edu/courses/CSE.html"""
    resp = requests.get(catalog_url, timeout=15)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")

    courses = []
    for tag in soup.find_all(["p", "dt"]):
        match = re.match(r"^([A-Z]+)\s+(\w+)\.", tag.get_text(" ", strip=True))
        if match:
            courses.append((match.group(1), match.group(2)))
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
    if len(sys.argv) < 3:
        print("Usage:")
        print("  Single course:  python scraper.py CSE 100 [term]")
        print("  Full catalog:   python scraper.py --catalog <url> [term] [out.json]")
        sys.exit(1)

    if sys.argv[1] == "--catalog":
        url = sys.argv[2]
        term = sys.argv[3] if len(sys.argv) > 3 else "WI26"
        out = sys.argv[4] if len(sys.argv) > 4 else "courses.json"

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

    else:
        subject, number = sys.argv[1].upper(), sys.argv[2]
        term = sys.argv[3] if len(sys.argv) > 3 else "WI26"
        result = get_prereqs(subject, number, term)
        print(json.dumps(result, indent=2))