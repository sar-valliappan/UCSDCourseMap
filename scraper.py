import sys
import json
import requests
from bs4 import BeautifulSoup

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
        print("Usage: python scraper.py <subject> <number> [term]")
        print("Example: python scraper.py CSE 100 WI26")
        sys.exit(1)

    subject, number = sys.argv[1].upper(), sys.argv[2]
    term = sys.argv[3] if len(sys.argv) > 3 else "WI26"

    result = get_prereqs(subject, number, term)
    print(json.dumps(result, indent=2))