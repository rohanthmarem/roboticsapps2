import { vi } from 'vitest';

// Chainable query builder mock
function createQueryBuilder(resolvedValue: { data: any; error: any } = { data: null, error: null }) {
  const builder: any = {
    _resolved: resolvedValue,
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockImplementation(() => Promise.resolve(resolvedValue)),
    maybeSingle: vi.fn().mockImplementation(() => Promise.resolve(resolvedValue)),
    then: vi.fn().mockImplementation((cb: any) => Promise.resolve(resolvedValue).then(cb)),
  };
  return builder;
}

export function createMockSupabase() {
  const queryBuilders = new Map<string, ReturnType<typeof createQueryBuilder>>();

  const mockSupabase = {
    from: vi.fn((table: string) => {
      if (!queryBuilders.has(table)) {
        queryBuilders.set(table, createQueryBuilder());
      }
      return queryBuilders.get(table)!;
    }),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      signInWithOtp: vi.fn().mockResolvedValue({ error: null }),
      verifyOtp: vi.fn().mockResolvedValue({ error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    // Helper to set resolved value for a table
    __setTableData: (table: string, data: any, error: any = null) => {
      const resolved = { data, error };
      const builder = createQueryBuilder(resolved);
      queryBuilders.set(table, builder);
      return builder;
    },
    __getQueryBuilder: (table: string) => queryBuilders.get(table),
    __reset: () => queryBuilders.clear(),
  };

  return mockSupabase;
}

export const mockSupabase = createMockSupabase();

// Default mock for the supabase module
vi.mock('../../app/lib/supabase', () => ({
  supabase: mockSupabase,
}));
