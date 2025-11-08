// Insert a Princeton course-review snippet into local DB
// Usage examples:
//   node server/scripts/insert_course_snippet.js --title "EEB 211 - Life on Earth: Mechanisms of Change in Nature SEL"
//   node server/scripts/insert_course_snippet.js --title "EEB 211 - Life on Earth: Mechanisms of Change in Nature SEL" \
//        --text "Evolutionary mechanisms across taxa with emphasis on selection, genetics, and ecology."
//   node server/scripts/insert_course_snippet.js --title "EEB 211 - Life on Earth: Mechanisms of Change in Nature SEL" \
//        --url "https://registrar.princeton.edu/course-offerings?term=1252&courseid=XXXXX"

require('dotenv').config();

const { pool } = require('../config/database');
const { runMigrations } = require('../db/migrations');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--title') out.title = args[++i];
    else if (a === '--text') out.text = args[++i];
    else if (a === '--url') out.url = args[++i];
    else if (a === '--difficulty') out.difficulty = Number(args[++i]);
  }
  return out;
}

function deriveDeptAndNumber(title) {
  // Expect patterns like: "EEB 211 - Life on Earth: ..."
  // dept = first token (letters/&), number = second token (digits + optional letter)
  if (!title) return { dept: null, number: null };
  const m = title.match(/^([A-Z&]+)\s+(\d+[A-Z]?)/);
  return m ? { dept: m[1], number: m[2] } : { dept: null, number: null };
}

function statsFromText(text) {
  const clean = (text || '').trim();
  const words = clean ? clean.split(/\s+/).length : 0;
  const chars = clean.length;
  return { word_count: words, character_count: chars };
}

(async () => {
  try {
    const { title, text, url, difficulty } = parseArgs();
    if (!title) {
      console.error('Missing required --title');
      process.exit(1);
    }

    // Ensure schema is up to date (adds course_name, princeton_course_url, etc.)
    await runMigrations();

    const defaultText = 'Evolutionary mechanisms across taxa, emphasizing natural selection, genetics, and ecology.';
    const snippetText = (text && text.trim()) || defaultText;
    const { word_count, character_count } = statsFromText(snippetText);
    const { dept, number } = deriveDeptAndNumber(title);

    // Insert as a course-review, Princeton-themed snippet; upsert by unique text
    const result = await pool.query(
      `INSERT INTO snippets (
         text, source, category, difficulty, is_princeton_themed,
         word_count, character_count,
         course_name, course_department, course_number, princeton_course_url
       ) VALUES ($1, $2, $3, $4, $5,
                 $6, $7,
                 $8, $9, $10, $11)
       ON CONFLICT (text) DO UPDATE SET
         source = EXCLUDED.source,
         category = EXCLUDED.category,
         difficulty = EXCLUDED.difficulty,
         is_princeton_themed = EXCLUDED.is_princeton_themed,
         word_count = EXCLUDED.word_count,
         character_count = EXCLUDED.character_count,
         course_name = EXCLUDED.course_name,
         course_department = COALESCE(EXCLUDED.course_department, snippets.course_department),
         course_number = COALESCE(EXCLUDED.course_number, snippets.course_number),
         princeton_course_url = COALESCE(EXCLUDED.princeton_course_url, snippets.princeton_course_url)
       RETURNING id, course_name, course_department, course_number;`,
      [
        snippetText,
        'Course Review',
        'course-reviews',
        Number.isFinite(difficulty) ? difficulty : 2,
        true,
        word_count,
        character_count,
        title,
        dept,
        number,
        url || null
      ]
    );

    const row = result.rows[0];
    console.log('✓ Inserted/updated course snippet');
    console.log(`  id: ${row.id}`);
    console.log(`  name: ${row.course_name}`);
    console.log(`  dept/num: ${row.course_department || 'n/a'} ${row.course_number || ''}`);
    console.log('You can now select "Course Reviews" in the UI (EEB subject) to pull this snippet.');
    process.exit(0);
  } catch (e) {
    console.error('✗ Failed to insert course snippet:', e.message);
    process.exit(2);
  }
})();

