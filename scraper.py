import requests
from bs4 import BeautifulSoup
import re

def scrape_cse_prereqs():
    url = "https://catalog.ucsd.edu/courses/CSE.html"
    response = requests.get(url)
    
    if response.status_code != 200:
        print("Failed to reach the catalog.")
        return

    soup = BeautifulSoup(response.content, 'html.parser')
    courses = []

    course_names = soup.find_all('p', class_='course-name')

    for name_tag in course_names:
        course_id = name_tag.get_text().strip().split('.')[0]
        
        description_tag = name_tag.find_next_sibling('p', class_='course-descriptions')
        
        if description_tag:
            desc_text = description_tag.get_text()
            
            prereq_match = re.search(r'Prerequisites:\s*(.*?)(\.|$)', desc_text)
            prereqs_raw = prereq_match.group(1) if prereq_match else "None"
            
            courses.append({
                "id": course_id,
                "prereqs_raw": prereqs_raw
            })

    return courses

# Run and print the first 5 results
cse_data = scrape_cse_prereqs()
for c in cse_data:
    print(f"{c['id']}: {c['prereqs_raw']}")