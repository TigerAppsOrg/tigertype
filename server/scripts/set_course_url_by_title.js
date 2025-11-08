// Update princeton_course_url for an existing snippet by exact course title
// Usage:
//   node server/scripts/set_course_url_by_title.js \
//        --title "EEB 211 - Life on Earth: Mechanisms of Change in Nature SEL" \
//        --url "https://registrar.princeton.edu/course-offerings?term=1252&subject=EEB&catalog=211"

require('dotenv').config();
const { pool } = require('../config/database');
const { runMigrations } = require('../db/migrations');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--title') out.title = args[++i];
    else if (a === '--url') out.url = args[++i];
  }
  return out;
}

(async () => {
  const { title, url } = parseArgs();
  if (!title || !url) {
    console.error('Usage: --title "<course title>" --url "<course url>"');
    process.exit(1);
  }

  try {
    await runMigrations();

    const { rows } = await pool.query(
      'SELECT id, course_name, princeton_course_url FROM snippets WHERE course_name = $1',
      [title]
    );

    if (rows.length === 0) {
      console.error('No snippet found with course_name exactly matching title.');
      console.error('Title:', title);
      process.exit(2);
    }

    const ids = rows.map(r => r.id);
    await pool.query(
      `UPDATE snippets SET princeton_course_url = $1 WHERE id = ANY($2::int[])`,
      [url, ids]
    );

    console.log(`✓ Updated ${ids.length} snippet(s) with new course URL.`);
    process.exit(0);
  } catch (e) {
    console.error('✗ Failed to update course URL:', e.message);
    process.exit(3);
  }
})();

