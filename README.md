# UCSD Course Prerequisite Map

## Motivation

Navigating course prerequisites at UC San Diego is harder than it should be. The official catalog lists prerequisites as freeform English like:

> CSE 21 or MATH 154 or MATH 184 or MATH 188 and CSE 12 and CSE 15L and CSE 30 or ECE 15

Some of these prerequisite classes also have prerequisites! There's no easy way to map out the full course sequence you need to take to satisfy all the requirements for a given class. This project scrapes structured prerequisite data and builds a recursive tree so students can instantly see everything they need to take, and in what order.

## Current Status

- Scraper is functional — can scrape a single department or all departments
- Prerequisite data is correctly structured as AND/OR groups
- Recursive tree builder works with cycle detection
- Data is saved per subject prefix (e.g. BILD and BIMM from the same dept page get separate files)

## Future Plans

- **Interactive graph visualization** — render the prereq tree as an interactive node graph in the browser using TypeScript and a library like React Flow or Cytoscape.js
- **Multi-term merging** — some courses aren't offered every quarter and won't appear in a single term's SoC data; scrape across multiple terms and merge
- **Degree plan view** — given a major's required courses, show the full prerequisite map for the entire degree
- **Course search** — find which courses a given course unlocks (reverse prereq lookup)
- **Conflict detection** — highlight when catalog prereqs and SoC prereqs disagree

## Current Technologies

- **Python** — scraping and data pipeline
- **requests** + **urllib3** — HTTP with automatic retries and backoff
- **BeautifulSoup** — HTML parsing
