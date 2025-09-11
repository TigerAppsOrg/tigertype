#!/usr/bin/env python3
"""
import_snippets.py  – reads processed_snippets.json and upserts them
into the `public.snippets` PostgreSQL table.

 • Columns the script fills (the first 8 already existed):
       text, source, category, difficulty, created_at,
       word_count, character_count, is_princeton_themed,
       princeton_course_url, term_code, course_id, course_name

 • Reads DB credentials from env vars / .env :
       DB_HOST / DB_PORT / DB_NAME / DB_USER / DB_PASSWORD
"""

# [AI DISCLAIMER: AI WAS USED TO HELP DEBUG THIS SCRIPT]

import json, os, re, sys, argparse
from pathlib import Path
from datetime import datetime

import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv

# ── ARG PARSING ───────────────────────────────────────────────────────────────
parser = argparse.ArgumentParser(description='Import snippets into database.')
parser.add_argument(
    '--production',
    action='store_true',
    help='Connect to the production database using DATABASE_URL from .env'
)
args = parser.parse_args()

# ── CONFIG ────────────────────────────────────────────────────────────────────
PROCESSED_FILE = "processed_snippets.json"
SCRIPT_DIR     = Path(__file__).resolve().parent

# pull DB creds from .env (same pattern as other scripts)
dotenv_path = (SCRIPT_DIR / ".." / ".." / ".env").resolve()
if dotenv_path.exists():
    load_dotenv(dotenv_path)

DB_PARAMS = {}
DATABASE_URL = os.getenv("DATABASE_URL")

if args.production:
    if not DATABASE_URL:
        print("❌  --production flag set, but DATABASE_URL not found in environment/.env")
        sys.exit(1)
    print("🔹 Targeting PRODUCTION database.")
else:
    print("🔹 Targeting LOCAL database.")
    DB_PARAMS = dict(
        host     = os.getenv("DB_HOST", "localhost"),
        port     = int(os.getenv("DB_PORT", 5432)),
        dbname   = os.getenv("DB_NAME"),
        user     = os.getenv("DB_USER"),
        password = os.getenv("DB_PASSWORD"),
    )
    # Check required local parameters, allowing password to be missing/empty
    if not all(DB_PARAMS[k] for k in ["host", "port", "dbname", "user"]):
        print("❌  Set DB_HOST, DB_PORT, DB_NAME, DB_USER in env/.env for local connection (DB_PASSWORD optional)")
        sys.exit(1)

# ── helper funcs ──────────────────────────────────────────────────────────────
def term_and_course_from_url(url: str):
    """
    registrar url → (term_code, course_id)
    e.g. https://registrarapps.princeton.edu/course-evaluation?terminfo=1242&courseinfo=002051
    """
    term = None
    cid  = None
    m = re.search(r"terminfo=([0-9]{4})", url or "")
    if m:
        term = m.group(1)
    m = re.search(r"courseinfo=([0-9]{5,6})", url or "")
    if m:
        cid = m.group(1).zfill(6)
    return term, cid

def princeton_courses_url(term: str, course_id: str):
    """term=1242, course_id=002051 → https://www.princetoncourses.com/course/1242002051"""
    if term and course_id:
        return f"https://www.princetoncourses.com/course/{term}{course_id}"
    return None

def strip_trailing_empty_line(text: str) -> str:
    """Remove one or more trailing newlines (CR/LF) and whitespace-only tail afterwards.
    Does not modify internal content or spaces on the last non-empty line.
    """
    return re.sub(r'(?:\r?\n)+\s*$', '', text or '')

def normalize_punctuation(text: str) -> str:
    """
    Normalize Unicode punctuation to ASCII-friendly equivalents suitable for typing races.
    - Map various dashes (em/en/minus/non-breaking) to '-'
    - Convert curly/smart quotes to straight quotes
    - Convert ellipsis to '...'
    - Replace exotic spaces with normal spaces; drop zero-width
    - Convert common bullets/middle dot to '-'
    """
    if not text:
        return text
    # character mapping
    mapping = {
        # dashes and minus variants → '-'
        ord('\u2010'): '-',  # hyphen
        ord('\u2011'): '-',  # non-breaking hyphen
        ord('\u2012'): '-',  # figure dash
        ord('\u2013'): '-',  # en dash
        ord('\u2014'): '-',  # em dash
        ord('\u2015'): '-',  # horizontal bar
        ord('\u2212'): '-',  # minus sign
        ord('\uFE58'): '-',  # small em dash
        ord('\uFE63'): '-',  # small hyphen-minus
        ord('\uFF0D'): '-',  # fullwidth hyphen-minus

        # quotes → straight
        ord('\u2018'): "'",  # left single
        ord('\u2019'): "'",  # right single / apostrophe
        ord('\u201A'): "'",  # single low-9
        ord('\u201B'): "'",  # single high-reversed-9
        ord('\u2032'): "'",  # prime

        ord('\u201C'): '"',  # left double
        ord('\u201D'): '"',  # right double
        ord('\u201E'): '"',  # double low-9
        ord('\u201F'): '"',  # double high-reversed-9
        ord('\u00AB'): '"',  # «
        ord('\u00BB'): '"',  # »
        ord('\u2033'): '"',  # double prime

        # bullets / middle dot
        ord('\u2022'): '-',  # •
        ord('\u00B7'): '-',  # ·

        # ellipsis
        ord('\u2026'): '...',

        # spaces → normal space; zero-width removed
        ord('\u00A0'): ' ',  # NBSP
        ord('\u2000'): ' ',  # en quad
        ord('\u2001'): ' ',  # em quad
        ord('\u2002'): ' ',  # en space
        ord('\u2003'): ' ',  # em space
        ord('\u2004'): ' ',  # three-per-em space
        ord('\u2005'): ' ',  # four-per-em space
        ord('\u2006'): ' ',  # six-per-em space
        ord('\u2007'): ' ',  # figure space
        ord('\u2008'): ' ',  # punctuation space
        ord('\u2009'): ' ',  # thin space
        ord('\u200A'): ' ',  # hair space
        ord('\u202F'): ' ',  # narrow no-break space
        ord('\u205F'): ' ',  # medium mathematical space
        ord('\u3000'): ' ',  # ideographic space
        ord('\u200B'): None, # zero width space → remove
        ord('\u200C'): None, # zero width non-joiner → remove
        ord('\u200D'): None, # zero width joiner → remove
    }
    out = text.translate(mapping)
    # collapse multiple spaces introduced by replacements
    out = re.sub(r"\s+", " ", out)
    return out.strip()

# ── load snippets ─────────────────────────────────────────────────────────────
DATA_DIR = SCRIPT_DIR / "data"
file_path = DATA_DIR / PROCESSED_FILE
try:
    with file_path.open(encoding="utf-8") as f:
        snippets = json.load(f)
except Exception as e:
    print(f"❌  Could not read {file_path}: {e}")
    sys.exit(1)

print(f"🔹 Loaded {len(snippets)} snippets from {file_path}")

# ── build rows ────────────────────────────────────────────────────────────────
rows = []
skipped = 0
def _difficulty_from_char_count(cc: int) -> int:
    return 3 if cc > 185 else 2 if cc >= 100 else 1
for s in snippets:
    # Validate snippet text strictly: must be a non-empty string and not a placeholder like "[]"
    text = s.get("text", "")
    if not isinstance(text, str):
        skipped += 1
        continue
    text_clean = strip_trailing_empty_line(text).strip()
    text_clean = normalize_punctuation(text_clean)
    if not text_clean or text_clean == "[]":
        skipped += 1
        continue

    # Recompute counts and difficulty from the final text to guarantee correctness
    wc = len(text_clean.split())
    cc = len(text_clean)
    diff = _difficulty_from_char_count(cc)

    term, cid = term_and_course_from_url(s.get("original_url"))
    pc_url    = princeton_courses_url(term, cid)
    rows.append((
        text_clean,
        s.get("source"),
        s.get("category"),
        diff,
        datetime.utcnow(),            # created_at
        wc,
        cc,
        bool(s.get("is_princeton_themed", False)),
        pc_url,                       # princeton_course_url
        term,                         # term_code
        cid,                          # course_id
        s.get("course_name"),         # may be None if not scraped yet
    ))

print(f"🔹 Prepared {len(rows)} row(s) for upsert (skipped {skipped} invalid)")

# ── bulk insert / upsert ──────────────────────────────────────────────────────
cols = ("text", "source", "category", "difficulty",
        "created_at", "word_count", "character_count", "is_princeton_themed",
        "princeton_course_url", "term_code", "course_id", "course_name")

insert_sql = f"""
INSERT INTO public.snippets ({", ".join(cols)})
VALUES %s
ON CONFLICT (text)           -- treat duplicate text as identical snippet
DO NOTHING;
"""

try:
    if args.production:
        # Connect using DATABASE_URL string
        with psycopg2.connect(DATABASE_URL) as conn, conn.cursor() as cur:
            execute_values(cur, insert_sql, rows, page_size=100)
            print(f"✅  Inserted (or skipped dupes) successfully into Production DB.")
    else:
        # Connect using DB_PARAMS dictionary
        with psycopg2.connect(**DB_PARAMS) as conn, conn.cursor() as cur:
            execute_values(cur, insert_sql, rows, page_size=100)
            print(f"✅  Inserted (or skipped dupes) successfully into Local DB.")
except Exception as e:
    print(f"❌  DB error: {e}")
    sys.exit(1)
