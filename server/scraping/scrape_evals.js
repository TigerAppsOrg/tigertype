// Scrapes ALL evaluation comments for a term *without* relying on any helper
// files.  It:
//   1. Fetches the course list directly from the Student‑App API
//   2. Visits each registrar evaluation page (needs your PHPSESSID)
//   3. Saves results – *including the course name* – to raw_evaluations.json
//
// ---------------------------------------------------------------------------
//  REQUIRED ‑‑ either pass on the CLI or let the script prompt you:
//
//   --apikey   <OIT bearer token>   (or set env PRINCETON_API_KEY)
//   --term     <4‑digit code>       (e.g. 1252 ⇒ FA 2024)
//   --subject  <3‑letter>           (optional; blank ⇒ scrape every subject)
//   --course   <course selector>    (optional) One of:
//       • 10‑digit combined code: <term(4)><course(6)>  e.g. 1262002051
//       • 5–6 digit course id (zero‑padded to 6) e.g. 2051 → 002051
//         When using 5–6 digits, a separate --term is required.
//   --sessid   <PHPSESSID>          (session cookie for registrar site)
//
// Example:
//     node scrape_evals.js --term 1252 --subject COS
// ---------------------------------------------------------------------------

// [AI DISCLAIMER: AI WAS USED TO HELP DEBUG / POLISH THIS SCRIPT (mainly the comment documentation)]

const fs       = require('fs');
const axios    = require('axios');
const cheerio  = require('cheerio');
const request  = require('request');
const promptly = require('promptly');
const path     = require('path'); // Import path module

// Load .env file from project root
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

require('colors');            // only for nicer console output

// ╭──────────────────────────────────────────────────────────────────────────╮
// │  tiny CLI helper – avoids bringing in minimist                         │
function argVal(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : undefined;
}
// ╰──────────────────────────────────────────────────────────────────────────╯

const API_BASE = 'https://api.princeton.edu/student-app';

// ──────────────────────────── INPUTS ────────────────────────────────────────
(async () => {
  console.log('\nPrinceton Course‑Evaluation Scraper'.cyan);
  console.log('-----------------------------------'.cyan);

  // Bearer token
  let API_KEY = argVal('--apikey') || process.env.PRINCETON_API_KEY;
  if (!API_KEY) API_KEY = await promptly.prompt('OIT API bearer token:');

  // Term (4‑digit Registrar code)
  let TERM = argVal('--term') || process.env.TERM;
  if (!TERM) TERM = await promptly.prompt('4‑digit term code (e.g. 1252):');
  if (!/^\d{4}$/.test(TERM)) {
    console.error('❌  Term must be exactly 4 digits (e.g. 1252)'.red);
    process.exit(1);
  }

  // Subject filter (optional)
  let SUBJECT = argVal('--subject') || process.env.SUBJECT;
  if (SUBJECT === undefined) {      // prompt only if not supplied at all
    SUBJECT = await promptly.prompt(
      '3‑letter subject code (blank for ALL subjects):'
    );
  }
  SUBJECT = SUBJECT.trim().toUpperCase();

  // Optional single-course filter:
  //  • 10 digits combined term+course (first 4 = term, last 6 = course)
  //  • OR 5–6 digit course id (requires TERM)
  let COURSE = (argVal('--course') || process.env.COURSE || '').trim();
  if (COURSE) {
    if (/^\d{10}$/.test(COURSE)) {
      const termFromCombined = COURSE.slice(0, 4);
      const courseFromCombined = COURSE.slice(4);
      if (TERM && TERM !== termFromCombined) {
        console.warn(`⚠️  Provided TERM (${TERM}) differs from combined code term (${termFromCombined}); using ${termFromCombined}.`.yellow);
      }
      TERM = termFromCombined;
      COURSE = courseFromCombined; // already 6 digits
    } else if (/^\d{5,6}$/.test(COURSE)) {
      COURSE = COURSE.padStart(6, '0');
      if (!TERM) {
        console.error('❌  --course provided without a combined code requires --term.'.red);
        process.exit(1);
      }
    } else {
      console.error('❌  --course must be 10 digits (<term4><course6>) or 5–6 digit course id.'.red);
      process.exit(1);
    }
  }

  // Registrar PHPSESSID
  let PHPSESSID = argVal('--sessid') || process.env.PHPSESSID;
  if (!PHPSESSID) {
    console.log('\n💡  Open https://registrarapps.princeton.edu/course-evaluation in'
              + ' a browser, log in, then copy the PHPSESSID cookie value.');
    PHPSESSID = await promptly.prompt('Paste PHPSESSID:');
  }
  if (!PHPSESSID) {
    console.error('❌  No PHPSESSID – aborting.'.red);
    process.exit(1);
  }

  // ───────────────────── 1) get course list ────────────────────────────────
  console.log(
    `\nFetching course list for term ${TERM}` +
    (SUBJECT ? ` / subject ${SUBJECT}` : '') +
    (COURSE ? ` / course ${COURSE}` : '') + ' …'.yellow
  );

  const url =
    `${API_BASE}/courses/courses?term=${TERM}&fmt=json` +
    (SUBJECT ? `&subject=${SUBJECT}` : '');

  let courses;
  try {
    const { data } = await axios.get(url, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${API_KEY}` },
      timeout: 15_000
    });

    // The Student‑App API nests results ⇒ flatten them into a simple array
    courses = [];
    const terms = data.term || [];
    for (const t of terms) {
      const subjects = t.subjects || [];
      for (const s of subjects) {
        const list = s.courses || [];
        for (const c of list) {
          courses.push({
            courseID      : (c.course_id || c.id || c.guid || '').padStart(6, '0'),
            subject       : s.code || c.subject || '',
            catalogNumber : c.catalog_number || c.catalogNumber || '',
            title         : c.title || ''
          });
        }
      }
    }

  } catch (err) {
    console.error(`❌  Failed to fetch course list: ${err.message}`.red);
    process.exit(1);
  }

  if (!courses.length) {
    console.error('❌  API returned zero courses – aborting.'.red);
    process.exit(1);
  }
  // Apply single-course filter if provided
  if (COURSE) {
    courses = courses.filter(c => c.courseID === COURSE);
    if (!courses.length) {
      console.error(`❌  Course ${COURSE} not found for term ${TERM}${SUBJECT ? ` / subject ${SUBJECT}` : ''}`.red);
      process.exit(1);
    }
  }
  console.log(`✓ Found ${courses.length} course(s)`.green);

  // ───────────────────── 2) scrape each evaluation page ─────────────────────
  const results = [];
  let   done    = 0;

  for (const c of courses) {
    const evalURL =
      `https://registrarapps.princeton.edu/course-evaluation?terminfo=${TERM}` +
      `&courseinfo=${c.courseID}`;

    try {
      const html = await fetchPage(evalURL, PHPSESSID);
      const { courseName, scores, comments } = parseEvalPage(html);

      comments.forEach(txt => {
        results.push({
          course_id      : c.courseID,
          term           : TERM,
          course_name    : courseName || c.title,
          comment_text   : txt,
          evaluation_url : evalURL,
          scores
        });
      });

    } catch (err) {
      console.error(`\n${c.courseID} – `.red + err.message.red);
    }

    done += 1;
    process.stdout.write(`\rProcessed ${done}/${courses.length} courses`);
  }

  // ───────────────────── 3) write output (standardized path) ────────────────
  const outDir = path.resolve(__dirname, 'data');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'raw_evaluations.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`\n\nDone – saved ${results.length} comment(s) to ${outPath}`.green);
  process.exit(0);
})();

// ───────────────────────── helper funcs ──────────────────────────────────────
function fetchPage (url, sessID) {
  return new Promise((resolve, reject) => {
    request({
      url,
      headers : {
        Cookie      : `PHPSESSID=${sessID};`,
        'User-Agent': 'TigerType Scraper (+https://github.com/ammaar-alam/tigertype)'
      },
      timeout: 15_000
    }, (err, res, body) => {
      if (err)            return reject(err);
      if (res.statusCode !== 200)
        return reject(new Error(`HTTP ${res.statusCode}`));
      resolve(body);
    });
  });
}

function parseEvalPage (html) {
  const $ = cheerio.load(html);

  if ($('title').text().trim() !== 'Course Evaluation Results')
    throw new Error('CAS login page (cookie expired?)');

  const courseName = $('h2.course-name').text().replace(/\s+/g, ' ').trim();

  // scores
  const scores = {};
  const rawScore = $('.data-bar-chart').attr('data-bar-chart');
  if (rawScore) {
    JSON.parse(rawScore).forEach(o => {
      if (o.key && o.value !== undefined)
        scores[o.key] = parseFloat(o.value);
    });
  }

  // comments
  const comments = [];
  $('.comment').each((_, el) => {
    const txt = $(el).text().replace(/\s+/g, ' ').trim();
    if (txt) comments.push(txt);
  });

  return { courseName, scores, comments };
}
