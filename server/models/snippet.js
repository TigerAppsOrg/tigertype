const db = require('../config/database');

// Snippet model for managing text snippets
const Snippet = {
  // Get a random snippet
  async getRandom(difficulty = null) {
    try {
      let query = 'SELECT * FROM snippets';
      const queryParams = [];
      
      if (difficulty) {
        query += ' WHERE difficulty = $1';
        queryParams.push(difficulty);
      }
      
      query += ' ORDER BY RANDOM() LIMIT 1';
      
      const result = await db.query(query, queryParams);
      return result.rows[0];
    } catch (err) {
      console.error('Error getting random snippet:', err);
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
  }
};

module.exports = Snippet;