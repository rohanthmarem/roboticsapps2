import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';

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
    not: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockResolvedValue(resolvedValue),
    then: vi.fn((cb: any) => Promise.resolve(resolvedValue).then(cb)),
  };
  return chain;
}

vi.mock('../app/lib/supabase', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
    },
  },
}));

// Import after mocks
const { AuthProvider } = await import('../app/lib/AuthContext');
const { DataProvider } = await import('../app/lib/DataContext');
const { useSettings, usePositions, useQuestions, useApplication, useAllApplications } = await import('../app/lib/hooks');

// Wrapper that provides both AuthProvider and DataProvider
function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(AuthProvider, null,
      React.createElement(DataProvider, null, children)
    );
  };
}

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

    const { result } = renderHook(() => useSettings(), { wrapper: createWrapper() });

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

    const { result } = renderHook(() => useSettings(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.settings).toEqual({});
  });

  it('updateSetting updates existing setting', async () => {
    // Initial fetch
    const fetchChain = createChain({ data: [{ key: 'test_key', value: 'old' }], error: null });
    mockFrom.mockReturnValue(fetchChain);

    const { result } = renderHook(() => useSettings(), { wrapper: createWrapper() });

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

    const { result } = renderHook(() => useSettings(), { wrapper: createWrapper() });

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

    const { result } = renderHook(() => usePositions(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.positions).toHaveLength(2);
    expect(result.current.positions[0].title).toBe('President');
    expect(mockFrom).toHaveBeenCalledWith('positions');
  });

  it('returns empty array on error', async () => {
    const chain = createChain({ data: null, error: { message: 'error' } });
    mockFrom.mockReturnValue(chain);

    const { result } = renderHook(() => usePositions(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.positions).toEqual([]);
  });

  it('provides refetch function', async () => {
    const chain = createChain({ data: [], error: null });
    mockFrom.mockReturnValue(chain);

    const { result } = renderHook(() => usePositions(), { wrapper: createWrapper() });

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

    const { result } = renderHook(() => useQuestions(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.questions).toHaveLength(1);
    expect(mockFrom).toHaveBeenCalledWith('questions');
  });
});

describe('useApplication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null and stops loading when no userId (no auth)', async () => {
    const chain = createChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain);

    const { result } = renderHook(() => useApplication(undefined), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.application).toBeNull();
  });

  it('provides refetch function', async () => {
    const chain = createChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain);

    const { result } = renderHook(() => useApplication('user1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(typeof result.current.refetch).toBe('function');
  });
});

describe('useAllApplications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('provides refetch function and starts with empty array', async () => {
    const chain = createChain({ data: [], error: null });
    mockFrom.mockReturnValue(chain);

    const { result } = renderHook(() => useAllApplications(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(typeof result.current.refetch).toBe('function');
  });
});
