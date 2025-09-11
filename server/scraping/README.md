# Princeton Course Evaluation Scraper for TigerType
*[AI DISCLAIMER: THIS DOCUMENTATION WAS CREATED WITH THE HELP OF AI]*

This directory contains the script and documentation for scraping course evaluations from the official Princeton University course evaluation website. The goal is to extract engaging text snippets for use in the TigerType application.

## Process Overview

1.  **Scraping:** The `scrape_evals.js` script (adapted from an existing tool) logs into the Princeton course evaluation system using a user-provided `PHPSESSID` cookie and scrapes evaluation data, including comments, for specified courses.
2.  **Data Extraction & Formatting:** The script needs modification to extract not just the comments but also associated metadata like course name, course ID, term, and potentially evaluation scores (though comments are the priority for snippets). The output format must be changed from database insertion to JSON output. Each JSON object should represent a single comment/review.
3.  **AI Filtering:** A separate AI processing step (to be implemented later) will analyze the raw scraped JSON data. This AI agent will:
    *   Read the comments in batches.
    *   Identify comments that are suitable as typing snippets (considering length, clarity, and entertainment value). Humorous or particularly insightful comments are preferred.
    *   Filter out very short, nonsensical, or unhelpful comments (e.g., "good", "N/A", numerical scores mistaken for comments).
    *   Add metadata to the selected snippets, including `word_count` and `character_count`.
    *   Optionally, categorize snippets (e.g., `positive`, `negative`, `funny`, `long`).
4.  **Final Output:** The AI process will produce a final JSON file containing only the curated, high-quality snippets, ready to be imported into TigerType's text snippet database.

## `scrape_evals.js` Modifications Required

The provided `scrape_evals.js` script needs the following changes:

1.  **Remove Database Logic:** All MongoDB-related code (`require('../models/...)`, `courseModel`, `evaluationModel`, database connection logic, `findOneAndUpdate`, `update`, `deleteMany`) must be removed. The script should not interact with any database.
2.  **JSON Output:** Instead of saving to a database, the script should collect the scraped data into a JavaScript array of objects. Once all courses are processed, this array should be written to a JSON file (e.g., `raw_evaluations.json`).
3.  **Data Structure:** Each object in the output JSON array should represent a single comment and include at least the following fields:
    *   `course_id`: The course identifier (e.g., "COS333").
    *   `course_name`: The full name of the course (needs to be fetched or joined from course data). *Initially, the script only has courseID. Modification needed to potentially fetch/map this.*
    *   `term`: The semester ID (e.g., "1244" for Spring 2024).
    *   `comment_text`: The raw text of the student comment.
    *   `evaluation_url`: The URL from which the comment was scraped (`https://registrarapps.princeton.edu/course-evaluation?terminfo=[term]&courseinfo=[courseID]`).
    *   *(Optional but helpful)* `scores`: The quantitative scores associated with the evaluation (if available and easily parsed).
4.  **Fetch Course Names:** The original script assumes course data (like names) is available via the `courseModel`. Since we are removing database interaction, the script might need modification to either:
    *   Accept a pre-existing mapping of `courseID` to `course_name`.
    *   Perform an additional scraping step or lookup if necessary (though this might complicate the script). *Simplest approach initially might be to just output `course_id` and handle name mapping later.*
5.  **Error Handling:** Improve error handling for network issues or changes in the registrar's website structure.
6.  **Dependencies:** Ensure `package.json` includes `cheerio`, `request`, `promptly`, `colors`, and `dotenv`. Remove database-related dependencies.

## Running the Scraper

1.  **Install Dependencies:**
    ```bash
    cd server/scraping
    # (You might need to create a package.json first: npm init -y)
    npm install cheerio request promptly colors dotenv
    ```
2.  **Get Session Cookie:**
    *   Log in to [https://registrarapps.princeton.edu/course-evaluation](https://registrarapps.princeton.edu/course-evaluation).
    *   Open browser developer tools (Inspect Element).
    *   Go to the "Application" (or "Storage") tab.
    *   Find the Cookies section for `registrarapps.princeton.edu`.
    *   Copy the value of the `PHPSESSID` cookie.
3.  **Run the Script (non-interactive examples):**
    - Full subject for a term:
      ```bash
      TERM=1252 SUBJECT=COS PHPSESSID=YOUR_PHPSESSID PRINCETON_API_KEY=YOUR_OIT_BEARER \
        node scrape_evals.js
      ```
    - Single course via combined code (term+course):
      ```bash
      PHPSESSID=YOUR_PHPSESSID PRINCETON_API_KEY=YOUR_OIT_BEARER \
        node scrape_evals.js --course 1262002051
      ```
      (The script derives `TERM=1262` and course `002051` automatically.)
    - Single course via 5–6 digit course id (requires term):
      ```bash
      TERM=1262 PHPSESSID=YOUR_PHPSESSID PRINCETON_API_KEY=YOUR_OIT_BEARER \
        node scrape_evals.js --course 2051
      ```
4.  **Output:** The script writes `raw_evaluations.json` in `server/scraping/data/`.
