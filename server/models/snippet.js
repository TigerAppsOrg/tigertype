const db = require('../config/database');

// Snippet model for managing text snippets
const Snippet = {
  // Get a random snippet based on optional filters
  async getRandom(filters = {}) {
    try {
      const { difficulty, category, subject } = filters;
      let query = 'SELECT * FROM snippets';
      const conditions = [];
      const queryParams = [];
      let paramIndex = 1;

      if (difficulty) {
        conditions.push(`difficulty = $${paramIndex++}`);
        queryParams.push(difficulty);
      }

      if (category) {
        conditions.push(`category = $${paramIndex++}`);
        queryParams.push(category);

        // Add subject filter only if category is 'course-reviews'
        if (category === 'course-reviews' && subject) {
          conditions.push(`SUBSTRING(course_name FROM 1 FOR 3) = $${paramIndex++}`);
          queryParams.push(subject);
        }
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY RANDOM() LIMIT 1';

      console.log('Executing query:', query, queryParams); // Added for debugging

      const result = await db.query(query, queryParams);
      if (result.rows.length === 0) {
        console.warn('No snippets found for filters:', filters); // Added warning
        // Optionally, fetch a completely random one as fallback?
        // const fallbackResult = await db.query('SELECT * FROM snippets ORDER BY RANDOM() LIMIT 1');
        // return fallbackResult.rows[0];
        return null; // Or return null if no match
      }
      return result.rows[0];
    } catch (err) {
      console.error('Error getting random snippet with filters:', filters, err);
      throw err;
    }
  },

  // Get a specific snippet by ID
  async getById(id) {
    try {
      const result = await db.query(
        'SELECT * FROM snippets WHERE id = $1',
        [id]
      );
      return result.rows[0];
    } catch (err) {
      console.error('Error getting snippet by ID:', err);
      throw err;
    }
  },

  // Get snippets by category
  async getByCategory(category, limit = 10) {
    try {
      const result = await db.query(
        'SELECT * FROM snippets WHERE category = $1 LIMIT $2',
        [category, limit]
      );
      return result.rows;
    } catch (err) {
      console.error('Error getting snippets by category:', err);
      throw err;
    }
  },

  // Create a new snippet
  async create(snippetData) {
    try {
      const { text, source, category, difficulty } = snippetData;
      
      const result = await db.query(
        'INSERT INTO snippets (text, source, category, difficulty) VALUES ($1, $2, $3, $4) RETURNING *',
        [text, source, category, difficulty]
      );
      
      return result.rows[0];
    } catch (err) {
      console.error('Error creating snippet:', err);
      throw err;
    }
  },

  // Get all available categories
  async getCategories() {
    try {
      const result = await db.query(
        'SELECT DISTINCT category FROM snippets ORDER BY category'
      );
      return result.rows.map(row => row.category);
    } catch (err) {
      console.error('Error getting categories:', err);
      throw err;
    }
  },

  // Get unique subjects from course reviews
  async getCourseReviewSubjects() {
    try {
      const result = await db.query(
        `SELECT DISTINCT SUBSTRING(course_name FROM 1 FOR 3) as subject
         FROM snippets
         WHERE category = 'course-reviews' AND course_name IS NOT NULL AND course_name != ''
         ORDER BY subject`
      );
      return result.rows.map(row => row.subject);
    } catch (err) {
      console.error('Error getting course review subjects:', err);
      throw err;
    }
  }
};

module.exports = Snippet;