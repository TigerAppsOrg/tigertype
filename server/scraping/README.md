# TigerType Snippet Scraping Pipeline
*[AI DISCLAIMER: THIS DOCUMENTATION WAS CREATED WITH THE HELP OF AI; as such, some information might not be accurate or relevant for users looking to use this code for their own apps/COS333 projects]*

This folder holds the tooling that turns Princeton course-evaluation comments into curated TigerType snippets. The pipeline has three stages:

```
registrar + Student-App APIs --(scrape_evals.js)--> data/raw_evaluations.json
                                      |
                                      v
                        (process_evals.py + OpenAI)
                                      |
                                      v
                       data/processed_snippets.json
                                      |
                                      v
                        (import_snippets.py -> Postgres)
```

A GitHub Actions workflow (`.github/workflows/import-snippets.yml`) wraps these steps so maintainers can run the whole process from the Actions tab without setting up a local environment.

---

## 1. Requirements & Secrets

| Purpose | Variable / Input | Where it is used | Notes |
|---------|------------------|------------------|-------|
| Student-App API bearer token | `PRINCETON_API_KEY` or `--apikey` | `scrape_evals.js` | Request via OIT. Same token works for API and workflow. |
| Registrar session cookie | `PHPSESSID` or `--sessid` | `scrape_evals.js` | Copy from browser after logging into the registrar course evaluation site. |
| Registrar term code | `TERM` or `--term` | `scrape_evals.js` | Four digits (e.g. `1252`). |
| Subject filter | `SUBJECT` or `--subject` | `scrape_evals.js` | Optional. Leave blank to scrape every subject in the term. |
| Course selector | `COURSE` or `--course` | `scrape_evals.js` | Optional single-course scrape (either 10-digit `term+course` or 5–6 digit course id). |
| OpenAI key | `OPENAI_API_KEY` | `process_evals.py` | Needed to run the AI snippet selector. |
| Local Postgres creds | `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | `import_snippets.py --production` **not** set | Optional; use when importing into a local database. |
| Production Postgres URL | `DATABASE_URL` | `import_snippets.py --production` | Provided by Heroku config or GitHub environment secret. |

> Tip: All scripts read the project root `.env` if present, otherwise they fall back to environment variables.

Dependencies:

- Node 18+ with `axios`, `cheerio`, `request`, `promptly`, `colors`, `dotenv` (installed via `npm install` at repo root).
- Python 3.10+ with `openai`, `python-dotenv`, `psycopg2-binary` (`pip install -r requirements` style, see workflow for exact installs).

The scripts write all intermediate files to `server/scraping/data/` so you can safely keep everything under version control (outputs are already ignored).

---

## 2. Stage-by-Stage Guide

### 2.1 Scrape Course Evaluations (`scrape_evals.js`)

Purpose: Download every course comment and quantitative score available for a term (optionally filtered by subject or course) straight into `data/raw_evaluations.json`.

Run locally:

```bash
# Example: scrape all COS evaluations for term 1252
TERM=1252 SUBJECT=COS PHPSESSID=copy_from_browser \
PRINCETON_API_KEY=BearerTokenFromOIT \
node server/scraping/scrape_evals.js
```

You can also pass everything as flags (helpful for automation):

```bash
node server/scraping/scrape_evals.js \
  --term 1252 \
  --subject COS \
  --sessid YOUR_PHPSESSID \
  --apikey YOUR_OIT_BEARER
```

A single course can be targeted with `--course`:

- Ten-digit combined `term+course` (e.g. `1262002051`).
- Five/six digit course id (e.g. `2051`) when `--term` is provided.

What the script does:

1. Calls `https://api.princeton.edu/student-app/courses/courses?term=<TERM>` (optionally `&subject=`) to build a course list containing ids, titles, and catalog numbers.
2. Visits each registrar evaluation page using `PHPSESSID` to stay logged in.
3. Extracts the course name, data-bar scores, and every comment block.
4. Writes an array of objects like:
   ```json
   {
     "course_id": "002051",
     "term": "1252",
     "course_name": "COS 126: General Computer Science",
     "comment_text": "This class definitely put me in my lowest lows...",
     "evaluation_url": "https://registrarapps.princeton.edu/course-evaluation?terminfo=1252&courseinfo=002051",
     "scores": {
       "Overall Quality of Course": 4.4,
       "Quality of Medium": 3.9
     }
   }
   ```

The script will prompt for any missing inputs and stops if the cookie expires or the API call fails (look for the friendly red errors).

### 2.2 Curate Snippets with AI (`process_evals.py`)

Purpose: Read `raw_evaluations.json`, call OpenAI to pick the funniest / most interesting snippets, and store results in `processed_snippets.json`. The script is restartable—processed items are written after every comment.

Run locally:

```bash
OPENAI_API_KEY=sk-... \  # or stored in .env
python3 server/scraping/process_evals.py
```

What happens inside:

- Loads or creates the following files in `server/scraping/data/`:
  - `raw_evaluations.json` – comments waiting to be processed (the script removes items as it goes).
  - `processed_snippets.json` – cumulative list of curated snippets (safe to commit or inspect).
- Skips obvious junk (short strings, pure numbers, "N/A").
- Sends each review to `gpt-5-mini` with a strict prompt that demands high-quality, entertaining snippets and assigns an appropriate difficulty rating.
- Normalizes grammar/typos lightly for readability while preserving the student's voice.
- Adds metadata (`source`, `category`, `word_count`, `character_count`, and the original evaluation URL) so the importer can map back to PrincetonCourses.

You can interrupt (`Ctrl+C`) at any time—the script writes progress atomically using `.tmp` files and continues where it left off next run.

### 2.3 Import into Postgres (`import_snippets.py`)

Purpose: Upsert curated snippets into the `public.snippets` table used by the live TigerType app.

Run against your local database:

```bash
DB_HOST=localhost DB_PORT=5432 DB_NAME=tigertype DB_USER=postgres \ 
python3 server/scraping/import_snippets.py
```

Run against production (uses `DATABASE_URL`, e.g. from Heroku config vars):

```bash
DATABASE_URL=postgres://... \ 
python3 server/scraping/import_snippets.py --production
```

How it works:

1. Loads `processed_snippets.json` from `server/scraping/data/`.
2. Normalizes punctuation (curly quotes → straight, em dashes → hyphen, ellipsis → `...`, removes zero-width spaces) so typing races stay ASCII.
3. Recomputes `word_count`, `character_count`, and difficulty on the final text (difficulty tiers: `<100 chars = 1`, `100–185 = 2`, `>185 = 3`).
4. Extracts `term_code` and `course_id` from the stored registrar URL, generating a PrincetonCourses link when possible.
5. Performs a bulk `INSERT ... ON CONFLICT (text) DO NOTHING` so duplicates are skipped gracefully.

The script prints how many rows were prepared, inserted, or skipped because of invalid text.

---

## 3. GitHub Actions Automation

The workflow `.github/workflows/import-snippets.yml` lets maintainers run the full scrape → process → import sequence from the GitHub UI.

Trigger it via **Actions → Scrape & Import Snippets → Run workflow** and supply:

- `term` (required, four digits)
- `subject` (optional, default `""` for all)
- `course` (optional) – same semantics as the CLI `--course`
- `phpsessid` (required) – paste the registrar cookie; masked in logs
- `oit_api_key` (optional) – if blank, the workflow uses the `PRINCETON_API_KEY` repo/environment secret
- `import_to_db` (boolean) – set to `true` to run the Python stages and import into the production DB
- `environment` – choose between `tigertype` (production) and `staging`

Workflow stages:

1. Checkout repository
2. Install Node dependencies (respects `package-lock.json`)
3. Mask sensitive inputs in logs
4. Run `scrape_evals.js` → uploads `raw_evaluations.json` as an artifact
5. Install Python 3.11 + dependencies (`openai`, `python-dotenv`, `psycopg2-binary`)
6. Run `process_evals.py` → uploads `processed_snippets.json`
7. If `import_to_db` is `true`, the workflow:
   - Imports snippets into the target Postgres via `import_snippets.py --production`
   - Runs `server/scripts/fix_snippet_trailing_newlines.js --apply`
   - Validates for duplicates (`server/scripts/verify_snippet_duplicates.js`)

Use this workflow when you want a reproducible audit trail and artifact archive. For experimentation, it is still fine to run scripts locally with personal tokens.

---

## 4. Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| `scrape_evals.js` prints `CAS login page (cookie expired?)` | PHPSESSID expired or incorrect | Log into the registrar site again and copy the new cookie. |
| `Failed to fetch course list` | OIT token invalid/expired | Request a fresh Student-App bearer token from OIT. |
| `process_evals.py` exits with `OPENAI_API_KEY not set` | Missing API key | Set the key in `.env` or export it before running. |
| OpenAI rate-limit / API errors | Too many rapid requests | Script auto-retries up to 5 times. If failures persist, rerun later. |
| `import_snippets.py` DB error about SSL | Production URL requires SSL | Use the Heroku-provided `DATABASE_URL` (already SSL-enabled) or add `?sslmode=require`. |
| Snippets still contain smart quotes or blank trailing lines | Import script not run after manual edits | Re-run `import_snippets.py` so normalization applies, or run `node server/scripts/fix_snippet_trailing_newlines.js --apply`. |

---

## 5. FAQ

**Can I skip the AI step and hand-pick snippets?**  Yes. Manually edit `processed_snippets.json` to include objects matching the same shape (`text`, `source`, `category`, `original_url`, etc.) and run the import script. The importer recomputes counts automatically.

**How do I regenerate snippets for a single course?**  Run `scrape_evals.js --course ...`, remove any existing entries for that course from `processed_snippets.json`, then run `process_evals.py` again. The script only processes items remaining in `raw_evaluations.json`.

**Where should secrets live in CI?**  Use GitHub environment secrets (`PRINCETON_API_KEY`, `DATABASE_URL`, optional `OPENAI_API_KEY`) scoped per environment (`tigertype`, `staging`). `phpsessid` is passed as a manual input and masked.

**Does the workflow overwrite old artifacts?**  Each run uploads `raw_evaluations` and `processed_snippets` artifacts; GitHub retains them per retention policy so you have a historical snapshot of what was imported.

---

The scripts here are production-ready: no manual preprocessing is required. Follow the steps above or trigger the workflow, and new snippets will flow straight into TigerType with a full audit trail.

Note: For any questions (future COS 333 groups), clarifications, or corrections, please email the original team or TigerApps.