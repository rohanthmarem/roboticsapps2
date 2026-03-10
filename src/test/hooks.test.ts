import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

// Mock supabase before importing hooks
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockSingle = vi.fn();
const mockMaybeSingle = vi.fn();
const mockUpdate = vi.fn();
const mockInsert = vi.fn();

function createChain(resolvedValue: any = { data: null, error: null }) {
  const chain: any = {
    select: mockSelect.mockReturnThis(),
    eq: mockEq.mockReturnThis(),
    order: mockOrder.mockReturnThis(),
    single: mockSingle.mockResolvedValue(resolvedValue),
    maybeSingle: mockMaybeSingle.mockResolvedValue(resolvedValue),
    update: mockUpdate.mockReturnThis(),
    insert: mockInsert.mockReturnThis(),
    then: vi.fn((cb: any) => Promise.resolve(resolvedValue).then(cb)),
  };
  return chain;
}

vi.mock('../app/lib/supabase', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
  },
}));

// Import hooks AFTER mock setup
const { useSettings, usePositions, useQuestions, useApplication, useAllApplications } = await import('../app/lib/hooks');

describe('useSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches settings and returns them as a key-value map', async () => {
    const chain = createChain({
      data: [
        { key: 'application_window_open', value: true },
        { key: 'decisions_released', value: false },
      ],
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    const { result } = renderHook(() => useSettings());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.settings.application_window_open).toBe(true);
    expect(result.current.settings.decisions_released).toBe(false);
    expect(mockFrom).toHaveBeenCalledWith('settings');
  });

  it('handles fetch error gracefully', async () => {
    const chain = createChain({ data: null, error: { message: 'fetch failed' } });
    mockFrom.mockReturnValue(chain);

    const { result } = renderHook(() => useSettings());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.settings).toEqual({});
  });

  it('updateSetting updates existing setting', async () => {
    // Initial fetch
    const fetchChain = createChain({ data: [{ key: 'test_key', value: 'old' }], error: null });
    mockFrom.mockReturnValue(fetchChain);

    const { result } = renderHook(() => useSettings());

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Set up for update operation
    const updateChain = createChain({ data: { id: '1' }, error: null });
    mockFrom.mockReturnValue(updateChain);

    await act(async () => {
      await result.current.updateSetting('test_key', 'new_value');
    });

    expect(result.current.settings.test_key).toBe('new_value');
  });

  it('updateSetting does not update local state on DB error', async () => {
    // Initial fetch
    const fetchChain = createChain({ data: [{ key: 'test_key', value: 'old' }], error: null });
    mockFrom.mockReturnValue(fetchChain);

    const { result } = renderHook(() => useSettings());

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Mock: maybeSingle returns existing, but update fails
    const failChain: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: '1' }, error: null }),
      then: vi.fn((cb: any) => Promise.resolve({ data: null, error: { message: 'update failed' } }).then(cb)),
    };
    mockFrom.mockReturnValue(failChain);

    await act(async () => {
      await result.current.updateSetting('test_key', 'should_not_save');
    });

    // Local state should NOT be updated because DB write failed
    // (This tests the fix we applied)
    expect(result.current.settings.test_key).toBe('old');
  });
});

describe('usePositions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches and returns positions', async () => {
    const chain = createChain({
      data: [
        { id: '1', title: 'President', is_open: true, sort_order: 0 },
        { id: '2', title: 'VP', is_open: false, sort_order: 1 },
      ],
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    const { result } = renderHook(() => usePositions());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.positions).toHaveLength(2);
    expect(result.current.positions[0].title).toBe('President');
    expect(mockFrom).toHaveBeenCalledWith('positions');
  });

  it('returns empty array on error', async () => {
    const chain = createChain({ data: null, error: { message: 'error' } });
    mockFrom.mockReturnValue(chain);

    const { result } = renderHook(() => usePositions());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.positions).toEqual([]);
  });

  it('provides refetch function', async () => {
    const chain = createChain({ data: [], error: null });
    mockFrom.mockReturnValue(chain);

    const { result } = renderHook(() => usePositions());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(typeof result.current.refetch).toBe('function');
  });
});

describe('useQuestions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches active questions ordered by sort_order', async () => {
    const chain = createChain({
      data: [{ id: 'q1', prompt: 'Why?', is_active: true, sort_order: 0 }],
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    const { result } = renderHook(() => useQuestions());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.questions).toHaveLength(1);
    expect(mockFrom).toHaveBeenCalledWith('questions');
    expect(mockEq).toHaveBeenCalledWith('is_active', true);
  });
});

describe('useApplication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null and stops loading when no userId', async () => {
    const { result } = renderHook(() => useApplication(undefined));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.application).toBeNull();
  });

  it('fetches single application for a given user', async () => {
    const chain = createChain({
      data: { id: 'a1', status: 'submitted', user_id: 'user1', application_positions: [] },
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    const { result } = renderHook(() => useApplication('user1'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.application).toBeTruthy();
    expect(result.current.application.id).toBe('a1');
    expect(mockFrom).toHaveBeenCalledWith('applications');
    expect(mockEq).toHaveBeenCalledWith('user_id', 'user1');
  });
});

describe('useAllApplications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches all applications with joined data', async () => {
    const chain = createChain({
      data: [
        { id: 'a1', status: 'submitted', profiles: { first_name: 'John' }, application_positions: [{ id: 'ap1', positions: { title: 'VP' } }] },
      ],
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    const { result } = renderHook(() => useAllApplications());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.applications).toHaveLength(1);
    expect(typeof result.current.refetch).toBe('function');
  });
});
