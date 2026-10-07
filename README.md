# Relational Database Study Lab

A study app for ER diagrams, the relational model and normalization, aimed at the Design Practicum.
Plain JavaScript (ES modules), no framework, no build step.

## Run it

ES modules need a web server (opening the file directly will not work).

1. Open a terminal in this folder.
2. Run `npx serve .` or `python3 -m http.server 8000`.
3. Open the address it prints.

## Study modes

| Mode | File | What it does |
| --- | --- | --- |
| Progress | `js/views/home.js` | Every mode with its meter |
| Guide | `js/views/guide.js` | The seven parts, searchable, with read tracking |
| Glossary | `js/views/glossary.js` | 96 terms, filter by text or part |
| Cheat sheet | `js/views/sheet.js` | One-page summary and a checklist |
| Flashcards | `js/views/cards.js` | Leitner boxes: 1, 3, 7, 14 day spacing |
| Quiz | `js/views/quiz.js` | Multiple choice with explanations |
| Cardinality trainer | `js/views/crow.js` | Practicum Question 1 |
| Dependency lab | `js/views/fd.js` | Practicum Question 2a to 2c |
| Normalization workshop | `js/views/norm.js` | Practicum Question 2d |

## Layout

- `index.html`: shell, colour and type tokens
- `css/app.css`: component styles
- `js/app.js`: router; each view loads on first use
- `js/store.js`: progress, saved to localStorage in batches
- `js/erd.js`: SVG builders for crow's foot lines and dependency diagrams
- `js/data/`: content. `parts/p1.js` to `p7.js` load only when a part is opened

## Editing content

- Quiz questions: `js/data/questions.js` (correct option first; the quiz shuffles)
- Trainer scenarios: `js/data/scenarios.js`
- Sample tables: `js/data/tables.js` (dependencies are computed from the rows)
- Workshop relations: `js/data/relations.js`
