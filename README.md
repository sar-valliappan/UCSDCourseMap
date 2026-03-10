# UCSD Course Map

An interactive prerequisite graph for UC San Diego courses. Search any course and explore what you need to take before it, or what it unlocks.

**[Live site →](https://sar-valliappan.github.io/UCSDCourseMap/)**

---

## Motivation

Navigating course prerequisites at UC San Diego is harder than it should be. The official catalog lists prerequisites as freeform English like:

> CSE 21 or MATH 154 or MATH 184 or MATH 188 and CSE 12 and CSE 15L and CSE 30 or ECE 15

There's no visual way to understand the structure of that. And many of those prerequisites *also* have prerequisites — so the real question, "what do I need to take first?", requires following a chain of these descriptions several levels deep.

This project scrapes structured prerequisite data from the UCSD Schedule of Classes API and builds a recursive graph so students can instantly see the full course sequence they need, displayed as an interactive node graph with AND/OR logic made explicit.

---

## Features

- **Prerequisite tree** — click any course node to expand its prerequisites recursively
- **Unlocks view** — flip to see which courses a given course opens up
- **AND/OR gates** — prerequisite groups are shown explicitly: AND nodes mean you need all of them, OR nodes mean you pick one
- **Cycle detection** — some courses list each other as prerequisites; these are detected and shown without infinite loops
- **Autocomplete search** — type a course prefix (e.g. `CSE`) and get live suggestions
- **Auto-fit** — the graph re-centers and fits to the viewport whenever it changes
- **Lazy expansion** — nodes start collapsed and expand on click to keep the graph readable

---

## Data

The scraper hits two UCSD endpoints:

- `catalog.ucsd.edu/courses/<DEPT>.html` — to get the full list of course IDs for each department
- `act.ucsd.edu/scheduleOfClasses/scheduleOfClassesPreReq.htm` — to get structured prerequisite groups per course

The structured data (unlike the catalog's English descriptions) encodes prerequisites as numbered groups, where each group is a set of options. Group 1 AND Group 2 must be satisfied, and within each group you pick one of the options. This maps cleanly to the AND/OR gate structure in the visualization.

**Data stats (WI26 term):**
- 95 department files scraped
- 3,556 courses with prerequisite data
- 1,205 courses that unlock at least one other course
- 289 KB bundled JSON shipped to the browser

---

## How It Works

### Scraping (`scraper.py`)

The scraper fetches the catalog index to discover all department URLs, then for each department iterates through course IDs and hits the Schedule of Classes API for prerequisite data. Results are saved as JSON files in `data/` grouped by subject prefix (e.g. `data/CSE.json`, `data/MATH.json`).

```
python scraper.py CSE          # scrape one department
python scraper.py --all        # scrape everything (~95 departments)
```

### Build step (`build.py`)

A build script reads all `data/*.json` files and produces `frontend/courseData.json` — a single compact JSON file containing:

- `courses` — a map from course ID to its prerequisite groups
- `unlocks` — a reverse map from course ID to the courses it satisfies a prereq for
- `courseIds` — sorted list of all known course IDs (used for autocomplete)

```
python build.py
```

### Frontend (`frontend/`)

The React + TypeScript frontend imports `courseData.json` directly as a module. All data is available in-memory at load time — no API calls are made at runtime.

- **`useLayout.ts`** — builds the recursive prerequisite tree from static data, computes the reverse unlock map, and uses [Dagre](https://github.com/dagrejs/dagre) to lay out nodes automatically in a left-to-right directed graph
- **`Graph.tsx`** — renders the graph using [React Flow](https://reactflow.dev/), with custom node types for course nodes and AND/OR gate nodes
- **`app.tsx`** — manages UI state: the search input with autocomplete, mode toggling between prereqs/unlocks views, and the set of expanded nodes

Tree expansion is lazy: clicking a collapsed node adds it to the `expandedNodes` set, which triggers a re-layout. Clicking an already-expanded non-root node collapses it along with all its descendants.

---

## Development History

### Phase 1 — Scraper + SQLite + FastAPI

The project started as a scraper that fed into a SQLite database (`backend/prereqs.db`) with three tables: `courses`, `prereq_groups`, and `prereq_options`. The schema was designed to support multi-term merging — scraping multiple quarters and using the most recent term's data for each course.

On top of the database sat a FastAPI server (`backend/api.py`) with four endpoints:

| Endpoint | Description |
|---|---|
| `GET /prereqs/{course_id}` | Structured prereq groups for a course |
| `GET /tree/{course_id}` | Full recursive prereq tree |
| `GET /unlocks/{course_id}` | What courses does this course unlock |
| `GET /search?q=` | Autocomplete course search |

The React frontend called these endpoints at runtime — searching triggered a `/search` call, and expanding a node triggered a `/tree` or `/unlocks` call.

### Phase 2 — Going static

The FastAPI backend worked well locally, but hosting a backend server alongside a static frontend adds significant complexity and cost. GitHub Pages only serves static files, and free-tier server hosting would introduce latency and cold-start delays for every API call.

Since all the data is known up-front and doesn't change frequently, the backend was replaced with a build step. `build.py` compiles all scraped JSON into a single `courseData.json` file that gets bundled directly into the frontend at build time. The backend folder remains in the repo as a record of the original approach.

The tradeoff: the initial page load is heavier (289 KB of course data), but every subsequent operation — tree traversal, reverse lookups, autocomplete — is instantaneous with no network round-trips. For a dataset of this size, this is the right call.

### Phase 3 — Graph UX

Early versions rendered the full recursive tree all at once, which produced overwhelming graphs for courses with deep dependency chains. The current version uses lazy expansion: the graph starts with just the root node, and clicking a node reveals its immediate prerequisites or unlocks. This keeps the graph readable while still letting users drill as deep as they want.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Scraping | Python, requests, BeautifulSoup |
| Data pipeline | Python (`build.py`) |
| Frontend | React, TypeScript, Vite |
| Graph rendering | [React Flow (@xyflow/react)](https://reactflow.dev/) |
| Graph layout | [Dagre (@dagrejs/dagre)](https://github.com/dagrejs/dagre) |
| Hosting | GitHub Pages |

---

## Running Locally

```bash
# 1. Scrape data (optional — data/ is already committed)
pip install -r requirements.txt
python scraper.py --all

# 2. Build the static JSON
python build.py

# 3. Run the frontend
cd frontend
npm install
npm run dev
```
