#!/usr/bin/env node
// [AI DISCLAIMER: AI WAS USED TO HELP DEBUG THIS SCRIPT]
/**
 * -------------------------------------------------------------
 *  fetch_courses.js   –   TigerType scraping helper
 * -------------------------------------------------------------
 * Fetches courses from Princeton’s “student‑app” API and (optionally)
 * writes them to disk.
 *
 *   node fetch_courses.js --term 1242 --subject COS --out cos_1242.json
 *
 * If you already have a bearer token:
 *   PRINCETON_API_KEY=<token> node fetch_courses.js --term 1242
 *
 * Otherwise put these **three** vars in .env or your shell:
 *   PRINCETON_CONSUMER_KEY
 *   PRINCETON_CONSUMER_SECRET  
 *   PRINCETON_SCOPE  # usually "student-app" (this is act not necessary i realize now)
 */

const fs       = require('fs');
const path     = require('path');
const axios    = require('axios');
const yargs    = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

/* -------------------------------------------------- CLI / env */
const {
  term,
  subject,
  out: outFile
} = yargs(hideBin(process.argv))
     .option('term',    { type: 'string', demandOption: true,  describe: '4‑digit Registrar term code (e.g. 1242)' })
     .option('subject', { type: 'string',                      describe: '3‑char subject (COS, MAT, …)' })
     .option('out',     { type: 'string',                      describe: 'Write raw JSON to this file' })
     .argv;

const BEARER   = process.env.PRINCETON_API_KEY?.trim();
const CK       = process.env.PRINCETON_CONSUMER_KEY;
const CS       = process.env.PRINCETON_CONSUMER_SECRET;
const SCOPE    = process.env.PRINCETON_SCOPE || 'student-app';
const TOKEN_URL= 'https://api.princeton.edu:443/token';
const API_BASE = 'https://api.princeton.edu/student-app';

/* -------------------------------------------------- helpers */
async function getBearerToken () {
  if (BEARER) return BEARER; // already provided

  if (!CK || !CS) {
    throw new Error(
      'Missing PRINCETON_API_KEY **or** consumer key/secret in environment.'
    );
  }

  const auth = Buffer.from(`${CK}:${CS}`).toString('base64');
  const res  = await axios.post(
    TOKEN_URL,
    new URLSearchParams({ grant_type: 'client_credentials', scope: SCOPE }),
    { headers: { Authorization: `Basic ${auth}` } }
  );
  return res.data.access_token;
}

function normalise (course) {
  return {
    courseID       : course.course_id     || course.id,
    subject        : course.subject       || course.subject_code || '',
    catalogNumber  : course.catalog_number|| course.catnum      || '',
    title          : course.title         || ''
  };
}

/* -------------------------------------------------- main fetch */
async function fetchCourses () {
  const token = await getBearerToken();

  const url = new URL(`${API_BASE}/courses/courses`);
  url.searchParams.append('term', term);
  url.searchParams.append('fmt',  'json');
  if (subject) url.searchParams.append('subject', subject);

  const { data } = await axios.get(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 20_000
  });

  // The student‑app feed has two slightly different shapes depending
  // on whether “subject” was supplied.
  let rawList = [];

  if (Array.isArray(data.term)) {
    // shape from “subject” query
    rawList = (data.term[0]?.subjects ?? [])
                .flatMap(s => s.courses ?? []);
  } else if (data.courses?.course) {
    // shape from full‑term query
    rawList = data.courses.course;
  }

  return rawList.map(normalise);
}

/* -------------------------------------------------- run */
(async () => {
  try {
    const courses = await fetchCourses();
    console.log(`Fetched ${courses.length} course(s).`);

    if (outFile) {
      fs.writeFileSync(outFile, JSON.stringify(courses, null, 2));
      console.log(`‣ Wrote data to ${outFile}`);
    } else {
      // pretty‑print first few for eyeballing
      console.dir(courses.slice(0, 5), { depth: null });
    }
  } catch (err) {
    console.error('❌  fetch_courses failed:', err.message);
    process.exit(1);
  }
})();

module.exports = { fetchCourses };
