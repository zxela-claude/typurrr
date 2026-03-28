import { describe, it, expect, vi, beforeEach } from 'vitest';

// Pure logic tests for supabase.js functions
// We test the algorithms inline to avoid CDN import issues in Node.

// --- getRandomPrompt RPC response handling ---
describe('getRandomPrompt RPC response handling', () => {
  // Simulates what supabase.rpc('get_random_prompt') returns: an array with one row
  async function getRandomPromptLogic(rpcResult) {
    const { data, error } = rpcResult;
    if (error) throw error;
    return data[0];
  }

  it('returns the single row returned by the RPC', async () => {
    const prompt = { id: 'abc', text: 'the quick brown cat' };
    const result = await getRandomPromptLogic({ data: [prompt], error: null });
    expect(result).toEqual(prompt);
  });

  it('throws when the RPC returns an error', async () => {
    const rpcError = new Error('function not found');
    await expect(getRandomPromptLogic({ data: null, error: rpcError })).rejects.toThrow('function not found');
  });
});

// --- createRaceInDb room code generation logic ---
describe('Room code generation', () => {
  function generateRoomCode() {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
  }

  it('generates a 6-character code', () => {
    const code = generateRoomCode();
    expect(code).toHaveLength(6);
  });

  it('generates an uppercase alphanumeric code', () => {
    const code = generateRoomCode();
    expect(code).toMatch(/^[A-Z0-9]{6}$/);
  });

  it('generates different codes on successive calls (probabilistic)', () => {
    const codes = new Set(Array.from({ length: 20 }, generateRoomCode));
    // With 36^6 possibilities, duplicates in 20 calls are astronomically rare
    expect(codes.size).toBeGreaterThan(1);
  });
});

// --- createRaceInDb retry logic ---
describe('createRaceInDb retry logic', () => {
  // Reimplementation of the retry loop from supabase.js
  async function createRaceWithRetry(insertFn) {
    for (let i = 0; i < 5; i++) {
      const room_code = Math.random().toString(36).slice(2, 8).toUpperCase();
      const { data, error } = await insertFn(room_code);
      if (!error) return data;
      if (!error.message.includes('unique')) throw error;
    }
    throw new Error('Could not generate unique room code');
  }

  it('returns data on first success', async () => {
    const insertFn = vi.fn().mockResolvedValue({ data: { id: 1 }, error: null });
    const result = await createRaceWithRetry(insertFn);
    expect(result).toEqual({ id: 1 });
    expect(insertFn).toHaveBeenCalledTimes(1);
  });

  it('retries on unique constraint error then succeeds', async () => {
    const uniqueError = { message: 'duplicate key value violates unique constraint' };
    const insertFn = vi.fn()
      .mockResolvedValueOnce({ data: null, error: uniqueError })
      .mockResolvedValueOnce({ data: null, error: uniqueError })
      .mockResolvedValueOnce({ data: { id: 2 }, error: null });

    const result = await createRaceWithRetry(insertFn);
    expect(result).toEqual({ id: 2 });
    expect(insertFn).toHaveBeenCalledTimes(3);
  });

  it('throws immediately on non-unique error', async () => {
    const otherError = { message: 'permission denied' };
    const insertFn = vi.fn().mockResolvedValue({ data: null, error: otherError });
    await expect(createRaceWithRetry(insertFn)).rejects.toEqual(otherError);
    expect(insertFn).toHaveBeenCalledTimes(1);
  });

  it('throws after 5 failed attempts all due to unique conflicts', async () => {
    const uniqueError = { message: 'unique constraint violation' };
    const insertFn = vi.fn().mockResolvedValue({ data: null, error: uniqueError });
    await expect(createRaceWithRetry(insertFn)).rejects.toThrow('Could not generate unique room code');
    expect(insertFn).toHaveBeenCalledTimes(5);
  });
});

// --- saveScore error handling logic ---
describe('saveScore error handling logic', () => {
  async function saveScoreLogic(insertResult) {
    const { data, error } = insertResult;
    if (error) throw error;
    return data;
  }

  it('returns data when no error', async () => {
    const mockResult = { data: { id: 10, wpm: 80 }, error: null };
    const result = await saveScoreLogic(mockResult);
    expect(result).toEqual({ id: 10, wpm: 80 });
  });

  it('throws when supabase returns an error', async () => {
    const mockError = new Error('insert failed');
    const mockResult = { data: null, error: mockError };
    await expect(saveScoreLogic(mockResult)).rejects.toThrow('insert failed');
  });
});

// --- getLeaderboard week filter date calculation ---
describe('getLeaderboard week filter date calculation', () => {
  it('week filter calculates a date 7 days in the past', () => {
    const before = Date.now();
    const weekAgo = new Date(Date.now() - 7 * 86400000);
    const after = Date.now();

    const diff = Date.now() - weekAgo.getTime();
    // Should be approximately 7 days in ms
    expect(diff).toBeGreaterThanOrEqual(7 * 86400000 - 1000);
    expect(diff).toBeLessThanOrEqual(7 * 86400000 + 1000);
  });

  it('week filter produces a valid ISO string', () => {
    const isoString = new Date(Date.now() - 7 * 86400000).toISOString();
    expect(isoString).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('week filter date is before now', () => {
    const weekAgo = new Date(Date.now() - 7 * 86400000);
    expect(weekAgo.getTime()).toBeLessThan(Date.now());
  });
});
