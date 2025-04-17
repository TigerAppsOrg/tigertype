#!/usr/bin/env python3
"""
process_evals.py  – extracts “typing‑game” snippets from Princeton course reviews
and saves progress continuously so you can stop / restart at any time

Files it maintains (in the same directory):

  • raw_evaluations.json       – remaining comments still to process
  • processed_snippets.json    – all extracted / validated snippets so far
"""
# [AI DISCLAIMER: AI WAS USED TO HELP DEBUG THIS SCRIPT]

import json, os, re, signal, sys, time
from pathlib import Path
from openai import OpenAI, RateLimitError, APIError
from dotenv import load_dotenv

# ── CONFIGURATION ──────────────────────────────────────────────────────────────
RAW_DATA_FILE           = "raw_evaluations.json"
PROCESSED_SNIPPETS_FILE = "processed_snippets.json"

DEFAULT_SOURCE    = "Princeton Course Reviews"
DEFAULT_CATEGORY  = "course-reviews"

MODEL_ID          = "gpt-4.1"
MAX_RETRIES       = 3
INITIAL_DELAY   = 1            # seconds between retry back‑off
FLUSH_INTERVAL    = 1            # write files after every N comments (set 1 = every)

TMP_SUFFIX        = ".tmp"       # for atomic writes

# ── ENV / OPENAI SETUP ─────────────────────────────────────────────────────────
script_dir  = Path(__file__).resolve().parent

# load .env (either at project root or script directory)
dotenv_path = (script_dir / ".." / ".." / ".env").resolve()
if not dotenv_path.exists():
    dotenv_path = script_dir / ".env"
if dotenv_path.exists():
    print(f"Loading environment variables from: {dotenv_path}")
    load_dotenv(dotenv_path)
else:
    print("⚠️  .env not found – relying on shell env vars")

api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    print("❌  OPENAI_API_KEY not set.")
    sys.exit(1)

client = OpenAI(api_key=api_key)

# ── SMALL UTILS ───────────────────────────────────────────────────────────────
def atomic_write(obj, path: Path):
    """Safely dump JSON → path by writing to *.tmp then os.replace()."""
    tmp = path.with_suffix(path.suffix + TMP_SUFFIX)
    with tmp.open("w", encoding="utf-8") as f:
        json.dump(obj, f, indent=2, ensure_ascii=False)
    os.replace(tmp, path)                # atomic on POSIX

def load_json(path: Path, default):
    if path.exists():
        try:
            with path.open(encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"⚠️  Could not load {path}: {e}")
    return default

def word_count(txt):      return len(txt.split())
def char_count(txt):      return len(txt)

# ── AI CALL ────────────────────────────────────────────────────────────────────
def call_ai_to_extract_snippets(comment_text):
    """
    Calls the OpenAI API to analyze the comment, extract engaging snippets,
    and assign a difficulty rating (1-3) to each.
    Returns a list of dictionaries, e.g., [{'text': 'snippet', 'difficulty': 2}].
    Handles retries on rate limit errors.
    """
    # Basic check before API call
    if len(comment_text) < 20 or re.match(r"^[0-9.]+$|^N/A$|^n/a$", comment_text.strip()):
        return []

    # Construct the system prompt with examples and difficulty instruction
    example_snippets = [
        "This would be a great course if it was not taught by Joe Scanlan. Alas, it is taught by him. Do not take this class if you are uncomfortable having a racist professor.",
        "This is the type of course that 10/10 dentists would recommend. You got better service on Ed than you would get at Verizon Wireless. Moretti/Li/Gabai had better offensive chemistry than Curry/Thompson/Durant.",
        "The Committee on Discipline has been criticized in the past for a more opaque decision-making process. In an interview with columnists for the 'Prince,' one anonymous member of the Committee said that certain other members lack \"even a pretense of impartiality\" during Committee hearings as demonstrated by \"extremely leading questions.\"",
        "This class definitely put me in my lowest lows, a lot of sobbing in JRR bathrooms and I considered dropping/PDFing it multiple times. In fact, countless people did end up dropping it. Everyday I questioned why I didn't follow suit.",
        "This was when mental illness took a hold of me. Each assignment after was a similar fight for my life. I still do not think I know what a raytracer is or rasterizer despite spending a decade coding them. The only thing I knew was pain. I wanted to explore the intersection between visual arts and programming, and the only thing I need to explore now is therapy.",
        "The assignment states that \"In this assignment you will create a simple 3D modeling program,\" yet it is nothing but \"simple\". It is perhaps \"simple\" to Alan Turing or an extremely experienced programmer but I am not a natural-born computer scientist. I did not come out of the womb coding JavaScript. My first words as a child were \"mom\", and not \"Hello World\" . So why and who thought it was brilliant to exponentially increase the difficulty to this significant level?",
        "After five weeks of partaking in this course, I had to contact my psychiatric provider to prescribe me anti-depressants. This is because this course perpetuated my mental illness, with each assignment spurring new bouts of depression. Whenever I think I reached a new low, this course gave me a shovel and commanded me to dig deeper.",
        "However, one heavenly force shielded me from the pain: Claire Gmachl. A goddess among us. Mother Teresa, or perhaps even God, reincarnated into a Princetonian.",
        "Dr. Martinez mentioned she gets motion sickness very easily, so it's a miracle she can still teach this course given how fast we move between concepts and how quickly each exam comes up.",
        "On the first day of lecture, I walked into McCosh 10, opened my laptop, and started playing coolmathgames.com. Let me tell you that when Vreeland started speaking, I had to PUT DOWN Papa's Pizzeria and listen to the eloquent stream of creativity this man constructed.",
        "Like, if you want to learn how to suffer the slings and arrows of outrageous fortune, this is your class. If you want to bike home as the birdies sing every Friday dawn, this is your class. If you want to cry while reading the St. Crispin's day speech as the 9AM classes start to trickle in, this class is for you.",
        "I have been giving this class my all. Body and soul. Sinew and stone. Of my own flesh have I made an offering. 80% of this term's allotted nightmares/stress dreams. Easily 70% of my homework time. But, I mean, now that I'm at the end, I feel kinda... forged. I am hot steel, about to plunge into the ice bucket of winter break. It has made a man out of me.",
        "There is not a single one of us who hasn't had a nightmare about this class. We spend an estimated average of 20-35 hours per week on it. It is evidently harder than Algebra and Topology for most. Plus, it is not particularly riveting.",
        "This class was the definition of masochism. As an alternative, try (1) playing a Knife Game with a cleaver, (2) chewing cactus, (3) drinking boiling water, (4) ordering \"Indian Spicy\" at a local Indian joint, (5) waterboarding yourself in the Public Policy school fountain, (6) driving with your feet across a mine field, (7) juggling hatchets whose handles were dipped in flaming oil, (9) walking barefoot on needles, (10) force-pulling your teeth out with pliers and no anesthesia, (11) playing Marco Polo with a bear, (12) running through campus naked in the middle of winter, or (13) wiping your hand across a splintered board repeatedly.",
        "I pledge my honor that I have not violated the honor code during this examination.",
        "Imagine this: you get a toddler, give them a book on differential equations that has 70% of its pages ripped, and ask them to find the wave function of a Hydrogen atom using Schrodinger's equation (without any guidance). This is EXACTLY how the assignments felt. They are torture devices intended for you to end up questioning your entire education and supposed intelligence.",
        "I watched in horror as he poured his heart and soul into the code, ignoring the warnings and errors that flashed on the screen. As the hours ticked by, Max's energy began to flag. His paws moved slower, his eyes growing dimmer with each passing minute. I knew that he was pushing himself too far, but I couldn't stop him. The code grew more complex, a twisted labyrinth of logic and mathematics.",
        "Max, the reincarnation of Helen Keller, had pushed the boundaries of coding too far. He had tried to defy the laws of computer science, and it had cost him his life. As I held Max's lifeless body, I knew that I would never forget the lessons he had taught me. He had shown me the power of coding, the limitless possibilities of the digital realm. And he had paid the ultimate price for his ambition. I buried Max in the backyard, surrounded by the code that had consumed him."
    ]
    examples_text = "\n\nHere are some examples of the *type* of snippets I want you to extract:\n"
    for i, ex in enumerate(example_snippets):
        examples_text += f"{i+1}. \"{ex}\"\n"

    system_prompt = (
        "You are an EXTREMELY SELECTIVE assistant tasked with identifying ONLY the MOST engaging, funny, or uniquely phrased snippets from Princeton course reviews, suitable for a typing game. "
        "Your primary goal is QUALITY over quantity. Be very critical. It is better to return NOTHING than to return a bland or boring snippet. "
        "Focus on extracting short, self-contained, interesting, humorous, witty, strongly opinionated, or insightful phrases/sentences. "
        "Look for text with a strong voice, unusual comparisons, relatable student experiences expressed vividly, or particularly clever wording. "
        "Snippets should ideally be between 15 and 100 words. "
        "CRITICAL: AVOID extracting generic advice (e.g., 'start early', 'go to lecture'), simple factual statements, mild praise/criticism, or anything that feels like standard, uninspired review text UNLESS the phrasing is truly exceptional. "
        "Also avoid incomplete thoughts (unless the fragment itself is the key part), boilerplate text, or potential personally identifiable information (like specific student names). "
        "Extract the snippet(s) verbatim from the provided text. Preserve original punctuation and capitalization. "
        "For EACH extracted snippet, assign a difficulty rating: 1 (easy: short, simple punctuation/vocab), 2 (medium: moderate length/complexity), or 3 (hard: long, complex punctuation, challenging words). "
        "If a long review contains multiple *genuinely exceptional* snippets meeting these criteria, extract each one with its difficulty rating. "
        "***IF NO PART of the review meets this high bar for being engaging, funny, or uniquely phrased, you MUST return an empty list []. Do not force an extraction.*** "
        f"{examples_text}"
        "\nNow, analyze the following user-provided course review with extreme selectivity and extract snippets accordingly.\n"
        "Output ONLY a JSON list of objects, where each object has a 'text' key (the snippet string) and a 'difficulty' key (the integer 1, 2, or 3). "
        "Example format: [{\"text\": \"Truly funny snippet\", \"difficulty\": 2}, {\"text\": \"Another great one\", \"difficulty\": 1}] or []. DO NOT add any explanation or commentary before or after the JSON list."
    )

    retries = 0
    delay = INITIAL_DELAY
    while retries < MAX_RETRIES:
        try:
            response = client.chat.completions.create(
                model=MODEL_ID,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": comment_text}
                ],
                temperature=0.8, # mess with temp later 
                max_tokens=1024, 
                response_format={ "type": "json_object" }
            )

            response_content = response.choices[0].message.content

            # Attempt to parse the JSON response (expecting list of dicts, but handling variations)
            try:
                parsed_response = json.loads(response_content)
                extracted_data = [] # Initialize list to hold the final snippet objects

                # Case 1: API returned the expected list directly
                if isinstance(parsed_response, list):
                    extracted_data = parsed_response
                # Case 2: API returned an object, potentially containing the list
                elif isinstance(parsed_response, dict):
                    # Check common keys where the list might be nested
                    possible_keys = ['snippets', 'list', 'results', 'data']
                    found_list = False
                    for key in possible_keys:
                        if key in parsed_response and isinstance(parsed_response[key], list):
                            extracted_data = parsed_response[key]
                            found_list = True
                            break
                    # Case 3: API returned a single snippet object, wrap it in a list
                    if not found_list and 'text' in parsed_response and 'difficulty' in parsed_response:
                        extracted_data = [parsed_response] # Wrap the single object

                # Validate the structure: list of dicts with 'text' and 'difficulty'
                validated_snippets = []
                if isinstance(extracted_data, list):
                    for item in extracted_data:
                        if isinstance(item, dict) and \
                           'text' in item and isinstance(item['text'], str) and \
                           'difficulty' in item and isinstance(item['difficulty'], int) and \
                           item['difficulty'] in [1, 2, 3]:
                            # Clean the text snippet
                            cleaned_text = re.sub(r'\s+', ' ', item['text']).strip()
                            if cleaned_text:
                                validated_snippets.append({
                                    'text': cleaned_text,
                                    'difficulty': item['difficulty']
                                })
                        else:
                             print(f"Warning: Invalid item format in AI response list: {item}")
                    if not validated_snippets and extracted_data: # Log if list had items but none validated
                        print(f"Warning: AI response list had items, but none validated: {extracted_data}")
                    return validated_snippets # Return successfully validated items
                else:
                    # This case should be less likely now with the wrapping logic, but good to have
                    print(f"Warning: Could not extract a valid list structure from AI response: {response_content}")
                    return []

            except json.JSONDecodeError:
                print(f"Warning: Failed to decode JSON from AI response: {response_content}")
                return []
            except Exception as e:
                 print(f"Warning: Error processing AI response content: {e}")
                 return []

        except RateLimitError as e:
            retries += 1
            print(f"Rate limit error encountered. Retrying in {delay} seconds... ({retries}/{MAX_RETRIES})")
            time.sleep(delay)
            delay *= 2
        except APIError as e:
            print(f"OpenAI API error: {e}")
            return []
        except Exception as e:
            print(f"An unexpected error occurred during OpenAI API call: {e}")
            return []

    print(f"Failed to get response from OpenAI after {MAX_RETRIES} retries.")
    return []


# ── STATE LOAD ────────────────────────────────────────────────────────────────
raw_path       = script_dir / RAW_DATA_FILE
processed_path = script_dir / PROCESSED_SNIPPETS_FILE

raw_evals      = load_json(raw_path, [])
processed_snip = load_json(processed_path, [])

print(f"🔹 Loaded {len(raw_evals)} pending comments from {raw_path}")
print(f"🔹 Loaded {len(processed_snip)} snippets already processed")

# ── graceful Ctrl‑C ───────────────────────────────────────────────────────────
interrupted = False
def _handle_sigint(sig, frame):
    global interrupted
    interrupted = True
    print("\n⚠️  Ctrl‑C detected – finishing current comment then saving…",
          file=sys.stderr)
signal.signal(signal.SIGINT, _handle_sigint)


# ── MAIN LOOP ─────────────────────────────────────────────────────────────────
start_time = time.perf_counter()
for idx, comment in enumerate(raw_evals[:]):  # iterate over *copy*
    if interrupted:
        break

    comment_text = comment.get("comment_text", "").strip()
    if not comment_text:
        raw_evals.remove(comment) # discard empty entry
        continue

    cid   = comment.get("course_id", "N/A")
    term  = comment.get("term",      "N/A")
    print(f"\n[{idx+1}/{len(raw_evals)}] Course {cid} ({term}) – extracting…")

    snippets = call_ai_to_extract_snippets(comment_text)
    print(f"    → {len(snippets)} snippet(s)")

    for snip in snippets:
        txt  = re.sub(r"\s+", " ", snip["text"]).strip()
        diff = snip["difficulty"]
        processed_snip.append({
            "text"              : txt,
            "source"            : DEFAULT_SOURCE,
            "category"          : DEFAULT_CATEGORY,
            "difficulty"        : diff,
            "word_count"        : word_count(txt),
            "character_count"   : char_count(txt),
            "is_princeton_themed": True,
            "original_url"      : comment.get("evaluation_url"),
            "original_course_id": cid,
            "original_term_id"  : term
        })

    # remove this comment so won’t revisit it next run
    raw_evals.remove(comment)

    # flush progress periodically
    if (idx + 1) % FLUSH_INTERVAL == 0:
        atomic_write(raw_evals,   raw_path)
        atomic_write(processed_snip, processed_path)
        print("    💾 progress saved")

    # polite spacing between OpenAI calls
    time.sleep(1)

# ── FINAL SAVE ────────────────────────────────────────────────────────────────
atomic_write(raw_evals,   raw_path)
atomic_write(processed_snip, processed_path)

elapsed = time.perf_counter() - start_time
print(f"\n✅ Done. Remaining comments: {len(raw_evals)} "
      f"| total snippets: {len(processed_snip)} "
      f"| runtime: {elapsed:0.1f}s")
