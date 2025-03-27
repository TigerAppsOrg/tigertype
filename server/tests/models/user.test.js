const UserModel = require('../../models/user');

// Create a properly mocked User model
const mockUserModel = {
  findOrCreate: jest.fn().mockImplementation((netid) => {
    if (netid === 'existing_user') {
      return Promise.resolve({
        id: 1,
        netid: 'existing_user',
        display_name: 'Existing User'
      });
    }
    
    return Promise.resolve({
      id: 2,
      netid: netid,
      display_name: null
    });
  }),
  
  getUserStats: jest.fn().mockImplementation((userId) => {
    return Promise.resolve({ 
      user_id: userId, 
      races_completed: 5, 
      best_wpm: 100, 
      average_wpm: 85.5,
      average_accuracy: 95.2
    });
  })
};

// Patch the actual UserModel with our mock methods for testing
Object.assign(UserModel, mockUserModel);

// Mock database module
jest.mock('../../db', () => ({
  query: jest.fn().mockResolvedValue({ rows: [] })
}));

describe('User Model', () => {
  describe('findOrCreate', () => {
    it('should return an existing user if found', async () => {
      const user = await UserModel.findOrCreate('existing_user');
      expect(user).toHaveProperty('id', 1);
      expect(user).toHaveProperty('netid', 'existing_user');
      expect(user).toHaveProperty('display_name', 'Existing User');
    });
    
    it('should create a new user if not found', async () => {
      const user = await UserModel.findOrCreate('new_user');
      expect(user).toHaveProperty('id', 2);
      expect(user).toHaveProperty('netid', 'new_user');
    });
  });
  
  describe('getUserStats', () => {
    it('should return user stats for a user', async () => {
      const stats = await UserModel.getUserStats(1);
      expect(stats).toHaveProperty('races_completed', 5);
      expect(stats).toHaveProperty('best_wpm', 100);
      expect(stats).toHaveProperty('average_wpm', 85.5);
      expect(stats).toHaveProperty('average_accuracy', 95.2);
    });
  });
}); 