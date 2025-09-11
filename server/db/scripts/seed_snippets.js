// Seeds the snippets table with data from processed_snippets.json

const fs = require('fs');
const path = require('path');
const { pool } = require('../../config/database'); // Adjust path if your db config is elsewhere

const SNIPPETS_FILE_PATH = path.join(
  __dirname,
  '..',
  '..',
  'scraping',
  'processed_snippets.json'
);

async function seedSnippets() {
  let client;
  try {
    // --- 1. Read the JSON file ---
    console.log(`Reading snippets from: ${SNIPPETS_FILE_PATH}`);
    if (!fs.existsSync(SNIPPETS_FILE_PATH)) {
      console.error(`Error: Snippets file not found at ${SNIPPETS_FILE_PATH}`);
      console.error('Please run the scraping and processing scripts first.');
      return;
    }
    const snippetsData = JSON.parse(
      fs.readFileSync(SNIPPETS_FILE_PATH, 'utf-8')
    );

    if (!Array.isArray(snippetsData) || snippetsData.length === 0) {
      console.log('No snippets found in the JSON file. Nothing to seed.');
      return;
    }
    console.log(`Found ${snippetsData.length} snippets to potentially seed.`);

    // --- 2. Connect to Database ---
    client = await pool.connect();
    console.log('Connected to database.');

    // --- 3. Insert Snippets ---
    let insertedCount = 0;
    let skippedCount = 0;

    // Optional: Clear existing course review snippets first?
    // Consider if you want to delete old snippets from this source before inserting new ones.
    // await client.query("DELETE FROM snippets WHERE source = 'Princeton Course Reviews'");
    // console.log('Cleared existing course review snippets.');

    await client.query('BEGIN'); // Start transaction

    const normalizePunctuation = (s) => {
      if (typeof s !== 'string') return s;
      const map = new Map([
        // dashes & minus
        ['\u2010', '-'], ['\u2011', '-'], ['\u2012', '-'], ['\u2013', '-'], ['\u2014', '-'], ['\u2015', '-'], ['\u2212', '-'], ['\uFE58', '-'], ['\uFE63', '-'], ['\uFF0D', '-'],
        // quotes
        ['\u2018', "'"], ['\u2019', "'"], ['\u201A', "'"], ['\u201B', "'"], ['\u2032', "'"],
        ['\u201C', '"'], ['\u201D', '"'], ['\u201E', '"'], ['\u201F', '"'], ['\u00AB', '"'], ['\u00BB', '"'], ['\u2033', '"'],
        // bullets/middle dot
        ['\u2022', '-'], ['\u00B7', '-'],
        // ellipsis
        ['\u2026', '...'],
      ]);
      let out = '';
      for (const ch of s) {
        const code = ch.codePointAt(0);
        const key = `\\u${code.toString(16).toUpperCase().padStart(4, '0')}`;
        out += map.has(key) ? map.get(key) : ch;
      }
      // spaces & zero-widths
      out = out
        .replace(/[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
        .replace(/[\u200B\u200C\u200D]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      return out;
    };

    for (const snippet of snippetsData) {
      // Basic validation
      const rawText = snippet?.text;
      const text = typeof rawText === 'string' ? normalizePunctuation(rawText.trim()) : '';
      const invalidText = !text || text === '[]';

      if (invalidText || !snippet?.original_url) {
        console.warn('Skipping snippet due to invalid/missing data:', {
          textPreview: typeof text === 'string' ? text.slice(0, 60) : text,
          original_url: snippet?.original_url,
        });
        skippedCount++;
        continue;
      }

      // Check if a snippet with the exact same text and URL already exists (optional, prevents duplicates)
      const checkResult = await client.query(
        `SELECT id FROM snippets WHERE text = $1 AND evaluation_url = $2 LIMIT 1`,
        [text, snippet.original_url]
      );

      if (checkResult.rowCount > 0) {
        // Duplicate detected, skip
        skippedCount++;
        continue;
      }

      const query = `
                INSERT INTO snippets (
                    text,
                    source,
                    category,
                    difficulty,
                    word_count,
                    character_count,
                    is_princeton_themed,
                    evaluation_url,
                    source_course_id,
                    source_term_id
                    -- created_at is defaulted by DB
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING id;
            `;

      // Recompute counts and difficulty from final text to ensure correctness
      const wordCount = text.split(/\s+/).filter(Boolean).length;
      const charCount = text.length;
      const diff = charCount > 185 ? 3 : charCount >= 100 ? 2 : 1;

      const values = [
        text,
        snippet.source || 'Princeton Course Reviews', // Default source if missing
        snippet.category || 'course-reviews', // Default category if missing
        diff,
        wordCount,
        charCount,
        snippet.is_princeton_themed === true, // Ensure boolean
        snippet.original_url,
        snippet.original_course_id, // Can be null if missing
        snippet.original_term_id, // Can be null if missing
      ];

      try {
        await client.query(query, values);
        insertedCount++;
        if (insertedCount % 50 === 0) {
          // Log progress periodically
          console.log(`Inserted ${insertedCount} snippets...`);
        }
      } catch (insertErr) {
        console.error('Error inserting snippet:', { textPreview: text.slice(0, 60) });
        console.error('SQL Error:', insertErr.message);
        // Decide if you want to rollback or continue on error
        await client.query('ROLLBACK'); // Rollback transaction on error
        throw insertErr; // Re-throw error to stop the script
      }
    }

    await client.query('COMMIT'); // Commit transaction

    console.log('\n--- Seeding Complete ---');
    console.log(`Successfully inserted: ${insertedCount} snippets`);
    console.log(`Skipped (missing data or duplicate): ${skippedCount} snippets`);
  } catch (error) {
    console.error('\n--- Seeding Failed ---');
    console.error('An error occurred during the seeding process:', error);
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rbError) {
        console.error('Error rolling back transaction:', rbError);
      }
    }
  } finally {
    // --- 4. Close Connection ---
    if (client) {
      client.release();
      console.log('Database connection released.');
    }
  }
}

// Execute the seeding function
seedSnippets().catch((err) => {
  console.error('Unhandled error running seed script:', err);
  process.exit(1);
});
