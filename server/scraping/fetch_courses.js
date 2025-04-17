/**
 * Fetches ALL courses for the given 4‑digit term code (e.g. 1252 = FA 2024)
 * from Princeton OIT’s Student‑App API.
 * 
 * Usage:
 *   const { fetchCourses } = require('./fetch_courses');
 *   const courses = await fetchCourses('1252');
 *   // ⇒ [{ courseID: '002065', subject:'COS', catnum:'217' }, ...]
 */

const axios = require('axios');
require('dotenv').config();

const API_BASE = 'https://api.princeton.edu/student-app';
const API_KEY  = process.env.PRINCETON_API_KEY;

if (!API_KEY)
  throw new Error(
    'Missing PRINCETON_API_KEY in environment – add it to your .env file.'
  );

const defaultHeaders = {
  Accept        : 'application/json',
  Authorization : `Bearer ${API_KEY}`
};

/**
 * Query the /courses/courses endpoint.  If you supply ONLY `term`,
 * the API returns *every* course offered that term, chunked in a single
 * payload that looks like:
 * 
 * {
 *   "courses": {
 *     "course": [ { "id":"002065", "subject":"COS", "catalog_number":"217", ... }, ... ]
 *   }
 * }
 */
async function fetchCourses (term, retries = 3) {
  const url = `${API_BASE}/courses/courses?term=${term}&fmt=json`;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const { data } = await axios.get(url, {
        headers : defaultHeaders,
        timeout : 20_000
      });

      const list = data?.courses?.course ?? [];
      return list.map(c => ({
        courseID : c.id || c.course_id || c.catalog_number || c.number,
        subject  : c.subject,
        catnum   : c.catalog_number
      }));
    } catch (err) {
      const last = attempt === retries;
      console.error(
        `Student‑App API error (attempt ${attempt + 1}/${retries + 1}):`,
        err.message
      );
      if (last) throw err;
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
}

module.exports = { fetchCourses };
