// Scrapes ALL evaluation comments for an entire term.
// ① Fetches course IDs from Student‑App API (see fetch_courses.js).
// ② Visits each registrar evaluation page with your PHPSESSID.
// ③ Writes combined JSON to raw_evaluations.json.
//
// ---------------------------------------------------------------
// ENV needed:
//   • PRINCETON_API_KEY   – OIT API key for Student‑App
//   • (optional) TERM     – 4‑digit term code, e.g. 1252
// ---------------------------------------------------------------

const cheerio  = require('cheerio');
const request  = require('request');
const promptly = require('promptly');
const fs       = require('fs');
const colors   = require('colors');
require('dotenv').config();

const { fetchCourses } = require('./fetch_courses');

// -------------------------------------------------------------------------
// Simple throttling helpers
// -------------------------------------------------------------------------
const CONCURRENCY         = 5;      // simultaneous registrar page downloads
const INTER_REQUEST_DELAY = 250;    // ms between *starting* each request
let   activeRequests      = 0;
const queue               = [];

// -------------------------------------------------------------------------
// Utilities
// -------------------------------------------------------------------------
function sleep (ms) { return new Promise(r => setTimeout(r, ms)); }

function logProgress (done, total) {
  process.stdout.write(
    `\rProcessed ${done}/${total} courses  –  queue:${queue.length}  active:${activeRequests}`
  );
}

// -------------------------------------------------------------------------
// Registrar evaluation scraper pieces (unchanged except for tiny tweaks)
// -------------------------------------------------------------------------
function loadEvalPage (term, courseID, cookie) {
  return new Promise((resolve, reject) => {
    const url = `https://registrarapps.princeton.edu/course-evaluation?terminfo=${term}&courseinfo=${courseID}`;
    const opts = {
      url,
      headers : {
        Cookie      : `PHPSESSID=${cookie};`,
        'User-Agent': 'TigerType Scraper (+https://github.com/ammaar-alam/tigertype)'
      },
      timeout: 15_000
    };

    request(opts, (err, res, body) => {
      if (err)                return reject(err);
      if (res.statusCode!==200) return reject(
        new Error(`HTTP ${res.statusCode} for ${url}`)
      );
      return resolve(body);
    });
  });
}

function parseEvalPage (html) {
  const $ = cheerio.load(html);
  if ($('title').text() !== 'Course Evaluation Results')
    throw new Error('Not an evaluation page (likely CAS redirect)');

  // Scores
  const scores = {};
  const rawScore = $('.data-bar-chart').attr('data-bar-chart');
  if (rawScore) {
    JSON.parse(rawScore).forEach(o => {
      if (o.key && o.value !== undefined) scores[o.key] = parseFloat(o.value);
    });
  }

  // Comments
  const comments = [];
  $('.comment').each((_, el) => {
    const txt = $(el).text().replace(/\s+/g, ' ').trim();
    if (txt) comments.push(txt);
  });

  return { scores, comments };
}

// -------------------------------------------------------------------------
// Master runner
// -------------------------------------------------------------------------
(async () => {
  console.log('Princeton Course‑Evaluation Scraper'.cyan);
  console.log('-----------------------------------'.cyan);

  // ---------- 1. Which term? ----------
  const TERM = process.env.TERM ||
               await promptly.prompt('4‑digit term code to scrape (e.g. 1252):');

  // ---------- 2. Session cookie (registrar site) ----------
  console.log('\nVisit https://registrarapps.princeton.edu/course-evaluation in' +
              ' a browser, sign in, then copy the PHPSESSID value.');
  const PHPSESSID = await promptly.prompt('Paste PHPSESSID cookie:');
  if (!PHPSESSID) {
    console.error('No cookie – aborting.'.red);
    process.exit(1);
  }

  // ---------- 3. Pull course list ----------
  console.log(`\nFetching course list for term ${TERM}…`.yellow);
  let courses;
  try {
    courses = await fetchCourses(TERM);
  } catch (e) {
    console.error('Failed to fetch course list:', e.message.red);
    process.exit(1);
  }

  if (!courses.length) {
    console.error('API returned zero courses – aborting.'.red);
    process.exit(1);
  }

  console.log(`Found ${courses.length} courses.`.green);

  queue.push(...courses.map(c => ({ term: TERM, courseID: c.courseID })));

  // ---------- 4. Scrape loop ----------
  const results = [];
  let completed = 0;

  while (completed < courses.length) {
    // Refill workers up to CONCURRENCY
    while (activeRequests < CONCURRENCY && queue.length) {
      const job = queue.shift();
      activeRequests += 1;
      (async () => {
        try {
          const html = await loadEvalPage(job.term, job.courseID, PHPSESSID);
          const { scores, comments } = parseEvalPage(html);

          comments.forEach(comment => {
            results.push({
              course_id     : job.courseID,
              term          : job.term,
              comment_text  : comment,
              evaluation_url: `https://registrarapps.princeton.edu/course-evaluation?terminfo=${job.term}&courseinfo=${job.courseID}`,
              scores
            });
          });
        } catch (err) {
          console.error(
            `\n${job.courseID} – ${err.message}`.red
          );
        } finally {
          activeRequests -= 1;
          completed      += 1;
          logProgress(completed, courses.length);
        }
      })();
      await sleep(INTER_REQUEST_DELAY);
    }
    await sleep(100); // prevent tight loop
  }

  // ---------- 5. Write output ----------
  console.log('\nWriting raw_evaluations.json…'.cyan);
  fs.writeFileSync(
    'raw_evaluations.json',
    JSON.stringify(results, null, 2),
    'utf-8'
  );
  console.log(`Done – saved ${results.length} comments`.green);
  process.exit(0);
})();
