# Plan: HTMX Gradebook Web App

## Overview

Build a gradebook management web app on top of the existing Express/Nunjucks server (`index.js`), adding HTMX for interactive UI without a full client-side framework. The app connects directly to `db.db` via the existing PugSQL setup and uses the existing `api.js` for BHS-CS server interactions.

The existing `index.js` is assignment-specific (takes a directory as CLI arg). The new app will be a separate entry point — `app.js` — that operates on the main `db.db` and serves the full gradebook UI.

---

## Tech Stack

- **Server**: Express (already a dependency)
- **Templates**: Nunjucks (already a dependency)
- **DB**: PugSQL + SQLite via existing `modules/pugly.sql` + `modules/queries.sql`
- **Interactivity**: HTMX (add via CDN in base template — no build step needed)
- **Styling**: Plain CSS (extend existing `public/css/`)

---

## Entry Point

**`app.js`** — new Express server, no CLI directory argument. Loads `db.db` from the working directory. Starts on `HTTP_PORT` or a fixed dev port (e.g. 3000).

---

## Pages & Routes

### 1. Dashboard `/`

- Links to all major sections
- Quick stats: number of students, assignments, ungraded speedruns, `to_update` count

### 2. Assignments `/assignments`

- Table of all assignments (from `assignments` join `assignment_point_values`)
- HTMX: inline search/filter by title or course
- Link to per-assignment detail

**`/assignments/new`** — form equivalent of `add-assignment.js`
- Fields: assignment ID (fetches title/course from API on blur via HTMX), standard, IC name, points
- On submit: calls `ensureAssignment` + `ensureAssignmentPointValue`, returns updated row via HTMX swap

### 3. Students `/students`

- Roster table with sortable_name, period, course_id, github
- HTMX: live search

### 4. Score Overrides `/overrides`

- Table of existing `score_overrides` with student name, assignment title, score, reason
- **`/overrides/new`** — form equivalent of `add-override.js`
  - Student search (HTMX: live lookup as user types, returns radio list to pick from)
  - Assignment search (same pattern)
  - Score + reason fields
  - Submit inserts via `ensureScoreOverride`

### 5. Mastery IC Name Mapping `/mastery-ic-names`

- Table of existing `mastery_ic_names` entries
- Form equivalent of `map-mastery-ic-names.js`
  - Course selector
  - HTMX: on course change, loads unmapped standards and available IC names
  - One row per unmapped standard with a `<select>` of available IC names

### 6. Grades to Update `/to-update`

- Table from `to_update` view: student, IC name, IC points, DB points
- Shows what needs to be pushed to IC
- Filter by period/course

**`/mastery-to-update`** — same but from `mastery_to_update` view

### 7. Zeros & Missing `/zeros`

- Table from `zeros` view
- Filter by course/period

### 8. Speedruns `/speedruns`

- Ungraded speedruns from `ungraded_speedruns` view
- Each row links to the speedrun grading UI (could embed the existing terminal workflow or just show data)

---

## HTMX Patterns to Use

- **Live search**: `hx-get` on `input` with `hx-trigger="input delay:300ms"`, returns `<tbody>` partial
- **Form submission**: `hx-post` on forms, returns updated table row or confirmation fragment
- **Dependent selects**: `hx-get` triggered by `change` on a parent select (e.g. course → standards)
- **Inline validation**: `hx-get` on assignment ID field blur to pre-fill title from API

---

## New Queries Needed

Add to `modules/queries.sql`:

- `allAssignments` — join `assignments` + `assignment_point_values`, filter by optional title/course search term
- `allStudents` — roster with optional search
- `allOverrides` — `score_overrides` joined with roster + assignments
- `toUpdate` — from `to_update` view, filterable by period
- `masteryToUpdate` — from `mastery_to_update` view
- `zerosReport` — from `zeros` view, filterable by course/period
- `dashboardStats` — single query for counts shown on dashboard

---

## File Layout

```
app.js                        # new entry point
views/
  layout.njk                  # base template with HTMX CDN, nav
  dashboard.njk
  assignments.njk
  assignments/
    row.njk                   # partial for HTMX swap
    new.njk
  students.njk
  overrides.njk
  overrides/
    new.njk
  mastery-ic-names.njk
  to-update.njk
  zeros.njk
  speedruns.njk
public/
  css/app.css                 # extend existing styles
```

---

## Implementation Order

1. `layout.njk` base template with nav and HTMX CDN
2. `app.js` skeleton with dashboard route
3. Assignments list + new assignment form
4. Score overrides list + new override form
5. `to-update` and `mastery-to-update` views
6. Mastery IC name mapping
7. Zeros / missing assignments report
8. Students list
9. Speedruns table
