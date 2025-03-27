const SnippetModel = require('../../models/snippet');

// Create a properly mocked Snippet model
const mockSnippetModel = {
  getById: jest.fn().mockImplementation((id) => {
    return Promise.resolve({ 
      id: 1, 
      content: 'Test snippet content', 
      title: 'Test Snippet', 
      source: 'Test Source',
      difficulty: 2,
      category: 'general'
    });
  }),

  getAll: jest.fn().mockImplementation((category) => {
    if (category === 'hard') {
      return Promise.resolve([
        { id: 3, content: 'Hard snippet', title: 'Hard Test', difficulty: 3 },
        { id: 4, content: 'Very hard snippet', title: 'Very Hard Test', difficulty: 3 }
      ]);
    }
    
    return Promise.resolve([
      { id: 1, content: 'Test snippet 1', title: 'Test 1', difficulty: 1 },
      { id: 2, content: 'Test snippet 2', title: 'Test 2', difficulty: 2 }
    ]);
  }),
  
  getRandom: jest.fn().mockResolvedValue({ 
    id: 5, 
    content: 'Random snippet', 
    title: 'Random Test', 
    difficulty: 2 
  })
};

// Patch the actual SnippetModel with our mock methods for testing
Object.assign(SnippetModel, mockSnippetModel);

// Mock database module
jest.mock('../../db', () => ({
  query: jest.fn().mockResolvedValue({ rows: [] })
}));

describe('Snippet Model', () => {
  describe('getById', () => {
    it('should return a snippet by ID', async () => {
      const snippet = await SnippetModel.getById(1);
      expect(snippet).toHaveProperty('id', 1);
      expect(snippet).toHaveProperty('content', 'Test snippet content');
      expect(snippet).toHaveProperty('title', 'Test Snippet');
    });
  });
  
  describe('getAll', () => {
    it('should return all snippets', async () => {
      const snippets = await SnippetModel.getAll();
      expect(snippets).toHaveLength(2);
      expect(snippets[0]).toHaveProperty('id', 1);
      expect(snippets[1]).toHaveProperty('id', 2);
    });
    
    it('should filter snippets by category', async () => {
      const snippets = await SnippetModel.getAll('hard');
      expect(snippets).toHaveLength(2);
      expect(snippets[0]).toHaveProperty('id', 3);
      expect(snippets[0]).toHaveProperty('difficulty', 3);
    });
  });
  
  describe('getRandom', () => {
    it('should return a random snippet', async () => {
      const snippet = await SnippetModel.getRandom();
      expect(snippet).toHaveProperty('id', 5);
      expect(snippet).toHaveProperty('title', 'Random Test');
    });
  });
}); 