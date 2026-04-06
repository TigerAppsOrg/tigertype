const {
  __testables: {
    normalizeLobbyCode,
    acquirePlayAgainLock,
    releasePlayAgainLock,
    clearLobbyTransientState,
    resetSocketRaceState,
    buildCompletedPlayerPlacement,
    compareCompletedPlayerPlacements,
    getRankedCompletedPlayers
  }
} = require('../controllers/socket-handlers');

describe('socket-handlers play again helpers', () => {
  it('normalizes a play again lobby code', () => {
    expect(normalizeLobbyCode({ code: ' ab12cd ' })).toBe('AB12CD');
  });

  it('rejects missing play again lobby codes', () => {
    expect(() => normalizeLobbyCode({})).toThrow('Lobby code is required.');
    expect(() => normalizeLobbyCode(null)).toThrow('Lobby code is required.');
  });

  it('prevents duplicate play again locks', () => {
    const locks = new Set();

    acquirePlayAgainLock('ROOM42', locks);
    expect(locks.has('ROOM42')).toBe(true);
    expect(() => acquirePlayAgainLock('ROOM42', locks)).toThrow('A new match is already being created.');

    releasePlayAgainLock('ROOM42', locks);
    expect(locks.has('ROOM42')).toBe(false);
  });

  it('clears only transient state for the specified lobby', () => {
    const warningTimer = setTimeout(() => {}, 1000);
    const kickTimer = setTimeout(() => {}, 1000);
    const otherWarningTimer = setTimeout(() => {}, 1000);
    const otherKickTimer = setTimeout(() => {}, 1000);
    const hostTimer = setTimeout(() => {}, 1000);
    const otherHostTimer = setTimeout(() => {}, 1000);
    const countdownTimer = setTimeout(() => {}, 1000);
    const otherCountdownTimer = setTimeout(() => {}, 1000);

    const stores = {
      inactivityTimers: new Map([
        ['ROOM42-socket-1', { warningTimer, kickTimer }],
        ['ROOM99-socket-2', { warningTimer: otherWarningTimer, kickTimer: otherKickTimer }]
      ]),
      hostDisconnectTimers: new Map([
        ['ROOM42', { timer: hostTimer, userId: 1 }],
        ['ROOM99', { timer: otherHostTimer, userId: 2 }]
      ]),
      countdownTimers: new Map([
        ['ROOM42', countdownTimer],
        ['ROOM99', otherCountdownTimer]
      ])
    };

    clearLobbyTransientState('ROOM42', stores);

    expect(stores.inactivityTimers.has('ROOM42-socket-1')).toBe(false);
    expect(stores.inactivityTimers.has('ROOM99-socket-2')).toBe(true);
    expect(stores.hostDisconnectTimers.has('ROOM42')).toBe(false);
    expect(stores.hostDisconnectTimers.has('ROOM99')).toBe(true);
    expect(stores.countdownTimers.has('ROOM42')).toBe(false);
    expect(stores.countdownTimers.has('ROOM99')).toBe(true);

    clearTimeout(otherWarningTimer);
    clearTimeout(otherKickTimer);
    clearTimeout(otherHostTimer);
    clearTimeout(otherCountdownTimer);
  });

  it('resets per-socket race state before the next lobby starts', () => {
    const stores = {
      playerProgress: new Map([
        ['socket-1', { completed: true, finishHandled: true }]
      ]),
      lastProgressUpdate: new Map([
        ['socket-1', Date.now()]
      ]),
      suspiciousPlayers: new Map([
        ['socket-1', { locked: true }]
      ])
    };

    resetSocketRaceState('socket-1', stores);

    expect(stores.playerProgress.has('socket-1')).toBe(false);
    expect(stores.lastProgressUpdate.has('socket-1')).toBe(false);
    expect(stores.suspiciousPlayers.has('socket-1')).toBe(false);
  });

  it('falls back to finish timestamps when completion_time is missing', () => {
    const placement = buildCompletedPlayerPlacement(
      { id: 'socket-1', netid: 'alice' },
      { startTime: 1000, snippet: { is_timed_test: false } },
      {
        playerProgress: new Map([
          ['socket-1', { timestamp: 4600, wpm: 88, accuracy: 97 }]
        ]),
        playerAvatars: new Map([
          ['socket-1', 'avatar.png']
        ])
      }
    );

    expect(placement.completion_time).toBe(3.6);
    expect(placement.finishTimestampMs).toBe(3600);
    expect(placement.avatar_url).toBe('avatar.png');
  });

  it('ranks timed races by wpm before shared duration', () => {
    const rankedPlayers = getRankedCompletedPlayers(
      [
        { id: 'socket-1', netid: 'alice', completed: true },
        { id: 'socket-2', netid: 'bob', completed: true }
      ],
      {
        startTime: 1000,
        snippet: { is_timed_test: true }
      },
      {
        playerProgress: new Map([
          ['socket-1', { timestamp: 16000, completion_time: 15, wpm: 90, accuracy: 96 }],
          ['socket-2', { timestamp: 16000, completion_time: 15, wpm: 110, accuracy: 94 }]
        ]),
        playerAvatars: new Map()
      }
    );

    expect(rankedPlayers.map(player => player.netid)).toEqual(['bob', 'alice']);
  });

  it('breaks timed ties by accuracy before finish order', () => {
    const comparison = compareCompletedPlayerPlacements(
      {
        netid: 'alice',
        wpm: 100,
        accuracy: 98,
        completion_time: 15,
        finishTimestampMs: 15000
      },
      {
        netid: 'bob',
        wpm: 100,
        accuracy: 95,
        completion_time: 15,
        finishTimestampMs: 14000
      },
      true
    );

    expect(comparison).toBeLessThan(0);
  });
});
