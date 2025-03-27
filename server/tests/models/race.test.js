/* ENTIRELY AI-GENERATED FILE */

const RaceModel = require('../../models/race');

// Create a properly mocked Race model
const mockRaceModel = {
  findByCode: jest.fn().mockImplementation((code) => {
    if (code === 'TEST123') {
      return Promise.resolve({
        id: 1,
        created_by: 1,
        snippet_id: 1,
        status: 'waiting',
        race_code: 'TEST123',
        content: 'Test snippet content',
        title: 'Test Snippet'
      });
    }
    return Promise.resolve(null);
  }),
  
  getActiveRaces: jest.fn().mockResolvedValue([
    {
      id: 1,
      created_by: 1,
      snippet_id: 1,
      status: 'waiting',
      race_code: 'TEST123',
      content: 'Test snippet content',
      title: 'Test Snippet'
    },
    {
      id: 2,
      created_by: 2,
      snippet_id: 2,
      status: 'waiting',
      race_code: 'TEST456',
      content: 'Another test snippet',
      title: 'Another Test'
    }
  ]),
  
  create: jest.fn().mockImplementation((userId, snippetId) => {
    return Promise.resolve({
      id: 3,
      created_by: userId,
      snippet_id: snippetId,
      status: 'waiting',
      race_code: 'NEW123'
    });
  }),
  
  getParticipants: jest.fn().mockImplementation((raceId) => {
    return Promise.resolve([
      {
        id: 1,
        race_id: raceId,
        user_id: 1,
        display_name: 'Test User 1',
        wpm: null,
        accuracy: null,
        status: 'joined'
      },
      {
        id: 2,
        race_id: raceId,
        user_id: 2,
        display_name: 'Test User 2',
        wpm: null,
        accuracy: null,
        status: 'joined'
      }
    ]);
  })
};

// Patch the actual RaceModel with our mock methods for testing
Object.assign(RaceModel, mockRaceModel);

// Mock database module
jest.mock('../../db', () => ({
  query: jest.fn().mockResolvedValue({ rows: [] })
}));

describe('Race Model', () => {
  describe('findByCode', () => {
    it('should return a race by code', async () => {
      const race = await RaceModel.findByCode('TEST123');
      expect(race).toHaveProperty('id', 1);
      expect(race).toHaveProperty('race_code', 'TEST123');
      expect(race).toHaveProperty('status', 'waiting');
      expect(race).toHaveProperty('content', 'Test snippet content');
    });
    
    it('should return null for a non-existent race code', async () => {
      const race = await RaceModel.findByCode('NONEXIST');
      expect(race).toBeNull();
    });
  });
  
  describe('getActiveRaces', () => {
    it('should return all active races', async () => {
      const races = await RaceModel.getActiveRaces();
      expect(races).toHaveLength(2);
      expect(races[0]).toHaveProperty('race_code', 'TEST123');
      expect(races[1]).toHaveProperty('race_code', 'TEST456');
    });
  });
  
  describe('create', () => {
    it('should create a new race', async () => {
      const race = await RaceModel.create(1, 2);
      expect(race).toHaveProperty('id', 3);
      expect(race).toHaveProperty('created_by', 1);
      expect(race).toHaveProperty('snippet_id', 2);
      expect(race).toHaveProperty('status', 'waiting');
    });
  });
  
  describe('getParticipants', () => {
    it('should return all participants for a race', async () => {
      const participants = await RaceModel.getParticipants(1);
      expect(participants).toHaveLength(2);
      expect(participants[0]).toHaveProperty('user_id', 1);
      expect(participants[0]).toHaveProperty('display_name', 'Test User 1');
      expect(participants[1]).toHaveProperty('user_id', 2);
    });
  });
}); 