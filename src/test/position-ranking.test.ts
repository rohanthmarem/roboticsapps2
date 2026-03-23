import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');

// ============================================================================
// 1. Migration Tests — verify the SQL migration is correct and safe
// ============================================================================
describe('Position Ranking Migration', () => {
  const migrationPath = join(ROOT, 'supabase/migrations/20260323000000_add_position_ranking.sql');
  let sql: string;

  try {
    sql = readFileSync(migrationPath, 'utf-8');
  } catch {
    sql = '';
  }

  it('migration file exists', () => {
    expect(sql.length).toBeGreaterThan(0);
  });

  it('adds position_rank column to application_positions', () => {
    expect(sql).toContain('ALTER TABLE public.application_positions');
    expect(sql).toContain('position_rank');
    expect(sql).toContain('integer');
  });

  it('uses IF NOT EXISTS for idempotent column addition', () => {
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS');
  });

  it('assigns default ranks to existing rows using random order', () => {
    expect(sql).toContain('ROW_NUMBER()');
    expect(sql).toContain('PARTITION BY application_id');
    expect(sql).toContain('ORDER BY random()');
  });

  it('updates existing rows via CTE (not destructive)', () => {
    expect(sql).toContain('WITH ranked AS');
    expect(sql).toContain('UPDATE public.application_positions');
    expect(sql).toContain('SET position_rank = ranked.rn');
  });

  it('creates RLS policy for user updates on draft positions', () => {
    expect(sql).toContain('CREATE POLICY');
    expect(sql).toContain('FOR UPDATE');
    expect(sql).toContain("status = 'draft'");
  });

  it('RLS policy restricts to own applications only', () => {
    expect(sql).toContain('user_id = auth.uid()');
  });

  it('does not drop any existing policies (backward compatible)', () => {
    expect(sql).not.toContain('DROP POLICY');
  });

  it('does not add NOT NULL constraint (allows null for backward compatibility)', () => {
    // The column should be nullable so existing code that doesn't set rank still works
    expect(sql).not.toContain('NOT NULL');
  });

  it('does not alter or drop any existing columns', () => {
    expect(sql).not.toContain('DROP COLUMN');
    // Should only have one ALTER TABLE statement for adding the column
    const alterStatements = sql.match(/ALTER TABLE/g) || [];
    expect(alterStatements.length).toBe(1);
  });
});

// ============================================================================
// 2. Ranking Logic Unit Tests — pure function tests for ranking behavior
// ============================================================================
describe('Position Ranking Logic', () => {
  // Simulate the sorting logic used in the UI
  function sortByRank(positions: Array<{ id: string; position_rank: number | null }>) {
    return [...positions].sort((a, b) => (a.position_rank ?? 999) - (b.position_rank ?? 999));
  }

  it('sorts positions by rank ascending', () => {
    const positions = [
      { id: 'c', position_rank: 3 },
      { id: 'a', position_rank: 1 },
      { id: 'b', position_rank: 2 },
    ];
    const sorted = sortByRank(positions);
    expect(sorted.map(p => p.id)).toEqual(['a', 'b', 'c']);
  });

  it('handles null ranks by placing them at the end', () => {
    const positions = [
      { id: 'b', position_rank: null },
      { id: 'a', position_rank: 1 },
      { id: 'c', position_rank: null },
    ];
    const sorted = sortByRank(positions);
    expect(sorted[0].id).toBe('a');
    // null-ranked items come after ranked ones
    expect(sorted[0].position_rank).toBe(1);
  });

  it('handles empty array', () => {
    expect(sortByRank([])).toEqual([]);
  });

  it('handles single position', () => {
    const positions = [{ id: 'a', position_rank: 1 }];
    const sorted = sortByRank(positions);
    expect(sorted).toEqual([{ id: 'a', position_rank: 1 }]);
  });

  it('handles all null ranks', () => {
    const positions = [
      { id: 'a', position_rank: null },
      { id: 'b', position_rank: null },
    ];
    const sorted = sortByRank(positions);
    expect(sorted).toHaveLength(2);
  });

  it('does not mutate original array', () => {
    const positions = [
      { id: 'b', position_rank: 2 },
      { id: 'a', position_rank: 1 },
    ];
    const original = [...positions];
    sortByRank(positions);
    expect(positions).toEqual(original);
  });

  // Simulate rank swap logic
  function swapRanks(
    positions: Array<{ id: string; position_rank: number }>,
    id: string,
    direction: 'up' | 'down'
  ): Array<{ id: string; position_rank: number }> {
    const sorted = [...positions].sort((a, b) => a.position_rank - b.position_rank);
    const idx = sorted.findIndex(p => p.id === id);
    if (idx === -1) return sorted;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return sorted;

    const result = sorted.map(p => ({ ...p }));
    const tempRank = result[idx].position_rank;
    result[idx].position_rank = result[swapIdx].position_rank;
    result[swapIdx].position_rank = tempRank;
    return result.sort((a, b) => a.position_rank - b.position_rank);
  }

  it('swaps ranks correctly when moving up', () => {
    const positions = [
      { id: 'a', position_rank: 1 },
      { id: 'b', position_rank: 2 },
      { id: 'c', position_rank: 3 },
    ];
    const result = swapRanks(positions, 'b', 'up');
    expect(result.map(p => p.id)).toEqual(['b', 'a', 'c']);
    expect(result.map(p => p.position_rank)).toEqual([1, 2, 3]);
  });

  it('swaps ranks correctly when moving down', () => {
    const positions = [
      { id: 'a', position_rank: 1 },
      { id: 'b', position_rank: 2 },
      { id: 'c', position_rank: 3 },
    ];
    const result = swapRanks(positions, 'b', 'down');
    expect(result.map(p => p.id)).toEqual(['a', 'c', 'b']);
    expect(result.map(p => p.position_rank)).toEqual([1, 2, 3]);
  });

  it('does not change anything when moving first item up', () => {
    const positions = [
      { id: 'a', position_rank: 1 },
      { id: 'b', position_rank: 2 },
    ];
    const result = swapRanks(positions, 'a', 'up');
    expect(result.map(p => p.id)).toEqual(['a', 'b']);
  });

  it('does not change anything when moving last item down', () => {
    const positions = [
      { id: 'a', position_rank: 1 },
      { id: 'b', position_rank: 2 },
    ];
    const result = swapRanks(positions, 'b', 'down');
    expect(result.map(p => p.id)).toEqual(['a', 'b']);
  });

  it('handles non-existent id gracefully', () => {
    const positions = [
      { id: 'a', position_rank: 1 },
      { id: 'b', position_rank: 2 },
    ];
    const result = swapRanks(positions, 'nonexistent', 'up');
    expect(result.map(p => p.id)).toEqual(['a', 'b']);
  });

  it('handles single position swap attempts', () => {
    const positions = [{ id: 'a', position_rank: 1 }];
    expect(swapRanks(positions, 'a', 'up').map(p => p.id)).toEqual(['a']);
    expect(swapRanks(positions, 'a', 'down').map(p => p.id)).toEqual(['a']);
  });

  // Simulate re-ranking after removal
  function reRankAfterRemoval(
    positions: Array<{ id: string; position_rank: number }>,
    removedId: string
  ): Array<{ id: string; position_rank: number }> {
    return positions
      .filter(p => p.id !== removedId)
      .sort((a, b) => a.position_rank - b.position_rank)
      .map((p, i) => ({ ...p, position_rank: i + 1 }));
  }

  it('re-ranks correctly after removing first position', () => {
    const positions = [
      { id: 'a', position_rank: 1 },
      { id: 'b', position_rank: 2 },
      { id: 'c', position_rank: 3 },
    ];
    const result = reRankAfterRemoval(positions, 'a');
    expect(result).toEqual([
      { id: 'b', position_rank: 1 },
      { id: 'c', position_rank: 2 },
    ]);
  });

  it('re-ranks correctly after removing middle position', () => {
    const positions = [
      { id: 'a', position_rank: 1 },
      { id: 'b', position_rank: 2 },
      { id: 'c', position_rank: 3 },
    ];
    const result = reRankAfterRemoval(positions, 'b');
    expect(result).toEqual([
      { id: 'a', position_rank: 1 },
      { id: 'c', position_rank: 2 },
    ]);
  });

  it('re-ranks correctly after removing last position', () => {
    const positions = [
      { id: 'a', position_rank: 1 },
      { id: 'b', position_rank: 2 },
      { id: 'c', position_rank: 3 },
    ];
    const result = reRankAfterRemoval(positions, 'c');
    expect(result).toEqual([
      { id: 'a', position_rank: 1 },
      { id: 'b', position_rank: 2 },
    ]);
  });

  it('handles removing from single-item list', () => {
    const positions = [{ id: 'a', position_rank: 1 }];
    const result = reRankAfterRemoval(positions, 'a');
    expect(result).toEqual([]);
  });

  it('handles removing non-existent id', () => {
    const positions = [
      { id: 'a', position_rank: 1 },
      { id: 'b', position_rank: 2 },
    ];
    const result = reRankAfterRemoval(positions, 'nonexistent');
    expect(result).toEqual([
      { id: 'a', position_rank: 1 },
      { id: 'b', position_rank: 2 },
    ]);
  });

  // Simulate computing next rank for new positions
  function getNextRank(existingPositions: Array<{ position_rank: number | null }>): number {
    return existingPositions.reduce(
      (max, ap) => Math.max(max, ap.position_rank ?? 0),
      0
    ) + 1;
  }

  it('computes next rank correctly with existing positions', () => {
    expect(getNextRank([{ position_rank: 1 }, { position_rank: 2 }])).toBe(3);
  });

  it('computes next rank as 1 when no existing positions', () => {
    expect(getNextRank([])).toBe(1);
  });

  it('computes next rank correctly with null ranks', () => {
    expect(getNextRank([{ position_rank: null }, { position_rank: 2 }])).toBe(3);
  });

  it('computes next rank correctly when all ranks are null', () => {
    expect(getNextRank([{ position_rank: null }, { position_rank: null }])).toBe(1);
  });
});

// ============================================================================
// 3. Onboarding Ranking Logic Tests
// ============================================================================
describe('Onboarding Ranking Logic', () => {
  // Simulate the ordered array toggle/reorder logic from Onboarding
  function togglePosition(ranked: string[], id: string): string[] {
    if (ranked.includes(id)) {
      return ranked.filter(p => p !== id);
    }
    return [...ranked, id];
  }

  function movePosition(ranked: string[], id: string, direction: 'up' | 'down'): string[] {
    const idx = ranked.indexOf(id);
    if (idx === -1) return ranked;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= ranked.length) return ranked;
    const next = [...ranked];
    [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
    return next;
  }

  it('adds position to end of ranked list', () => {
    expect(togglePosition(['a', 'b'], 'c')).toEqual(['a', 'b', 'c']);
  });

  it('removes position from ranked list', () => {
    expect(togglePosition(['a', 'b', 'c'], 'b')).toEqual(['a', 'c']);
  });

  it('adds first position to empty list', () => {
    expect(togglePosition([], 'a')).toEqual(['a']);
  });

  it('removes only position from list', () => {
    expect(togglePosition(['a'], 'a')).toEqual([]);
  });

  it('toggle is idempotent for add then remove', () => {
    const list = ['a', 'b'];
    const added = togglePosition(list, 'c');
    const removed = togglePosition(added, 'c');
    expect(removed).toEqual(['a', 'b']);
  });

  it('moves position up in ranked list', () => {
    expect(movePosition(['a', 'b', 'c'], 'b', 'up')).toEqual(['b', 'a', 'c']);
  });

  it('moves position down in ranked list', () => {
    expect(movePosition(['a', 'b', 'c'], 'b', 'down')).toEqual(['a', 'c', 'b']);
  });

  it('does not move first item up', () => {
    expect(movePosition(['a', 'b'], 'a', 'up')).toEqual(['a', 'b']);
  });

  it('does not move last item down', () => {
    expect(movePosition(['a', 'b'], 'b', 'down')).toEqual(['a', 'b']);
  });

  it('handles move of non-existent item', () => {
    expect(movePosition(['a', 'b'], 'c', 'up')).toEqual(['a', 'b']);
  });

  it('generates correct position_rank inserts from ranked array', () => {
    const rankedPositions = ['pos-3', 'pos-1', 'pos-2'];
    const appId = 'app-1';
    const inserts = rankedPositions.map((position_id, i) => ({
      application_id: appId,
      position_id,
      position_rank: i + 1,
    }));
    expect(inserts).toEqual([
      { application_id: 'app-1', position_id: 'pos-3', position_rank: 1 },
      { application_id: 'app-1', position_id: 'pos-1', position_rank: 2 },
      { application_id: 'app-1', position_id: 'pos-2', position_rank: 3 },
    ]);
  });
});

// ============================================================================
// 4. Admin Display Logic Tests
// ============================================================================
describe('Admin Position Display with Ranking', () => {
  // Simulate getPositionTitles from Dashboard
  function getPositionTitles(app: any): string {
    const positions = app.application_positions;
    if (!Array.isArray(positions) || positions.length === 0) return '';
    return [...positions]
      .sort((a: any, b: any) => (a.position_rank ?? 999) - (b.position_rank ?? 999))
      .map((ap: any) => ap.positions?.title)
      .filter(Boolean)
      .join(', ');
  }

  it('returns empty string for no positions', () => {
    expect(getPositionTitles({ application_positions: [] })).toBe('');
    expect(getPositionTitles({ application_positions: null })).toBe('');
    expect(getPositionTitles({})).toBe('');
  });

  it('returns positions sorted by rank', () => {
    const app = {
      application_positions: [
        { position_rank: 2, positions: { title: 'VP' } },
        { position_rank: 1, positions: { title: 'President' } },
        { position_rank: 3, positions: { title: 'Secretary' } },
      ],
    };
    expect(getPositionTitles(app)).toBe('President, VP, Secretary');
  });

  it('handles null ranks (puts them at end)', () => {
    const app = {
      application_positions: [
        { position_rank: null, positions: { title: 'Unknown Rank' } },
        { position_rank: 1, positions: { title: 'First' } },
      ],
    };
    expect(getPositionTitles(app)).toBe('First, Unknown Rank');
  });

  it('handles missing position titles', () => {
    const app = {
      application_positions: [
        { position_rank: 1, positions: { title: 'President' } },
        { position_rank: 2, positions: null },
        { position_rank: 3, positions: { title: 'Secretary' } },
      ],
    };
    expect(getPositionTitles(app)).toBe('President, Secretary');
  });

  // Simulate rank tag display logic
  function formatRankTag(ap: { position_rank: number | null; positions?: { title: string } }) {
    const prefix = ap.position_rank != null ? `#${ap.position_rank} ` : '';
    return `${prefix}${ap.positions?.title || '?'}`;
  }

  it('formats rank tag with rank number', () => {
    expect(formatRankTag({ position_rank: 1, positions: { title: 'President' } }))
      .toBe('#1 President');
  });

  it('formats rank tag without rank number when null', () => {
    expect(formatRankTag({ position_rank: null, positions: { title: 'VP' } }))
      .toBe('VP');
  });

  it('formats rank tag with fallback title', () => {
    expect(formatRankTag({ position_rank: 2, positions: undefined }))
      .toBe('#2 ?');
  });
});

// ============================================================================
// 5. Edge Cases for Existing Users Without Rankings
// ============================================================================
describe('Backward Compatibility — Existing Applications', () => {
  it('existing application_positions without rank are handled in sort', () => {
    // Simulates data from before the migration runs
    const positions = [
      { id: 'a', position_rank: undefined, positions: { title: 'A' } },
      { id: 'b', position_rank: undefined, positions: { title: 'B' } },
    ];
    const sorted = [...positions].sort(
      (a, b) => (a.position_rank ?? 999) - (b.position_rank ?? 999)
    );
    // Both have 999, so order is preserved (stable sort)
    expect(sorted).toHaveLength(2);
  });

  it('mixed ranked and unranked positions sort correctly', () => {
    const positions = [
      { id: 'c', position_rank: undefined },
      { id: 'a', position_rank: 1 },
      { id: 'b', position_rank: 2 },
      { id: 'd', position_rank: undefined },
    ];
    const sorted = [...positions].sort(
      (a: any, b: any) => (a.position_rank ?? 999) - (b.position_rank ?? 999)
    );
    expect(sorted[0].id).toBe('a');
    expect(sorted[1].id).toBe('b');
    // Unranked come last
    expect(sorted[2].position_rank).toBeUndefined();
    expect(sorted[3].position_rank).toBeUndefined();
  });

  it('new positions added after existing ones get sequential ranks', () => {
    const existingMaxRank = [
      { position_rank: 1 },
      { position_rank: 2 },
    ].reduce((max, ap) => Math.max(max, ap.position_rank ?? 0), 0);

    const newIds = ['new-1', 'new-2'];
    const toInsert = newIds.map((id, i) => ({
      position_id: id,
      position_rank: existingMaxRank + i + 1,
    }));

    expect(toInsert).toEqual([
      { position_id: 'new-1', position_rank: 3 },
      { position_id: 'new-2', position_rank: 4 },
    ]);
  });

  it('first positions added to empty application start at rank 1', () => {
    const existingMaxRank = ([] as any[]).reduce(
      (max: number, ap: any) => Math.max(max, ap.position_rank ?? 0),
      0
    );
    expect(existingMaxRank).toBe(0);

    const toInsert = ['pos-1', 'pos-2'].map((id, i) => ({
      position_id: id,
      position_rank: existingMaxRank + i + 1,
    }));
    expect(toInsert[0].position_rank).toBe(1);
    expect(toInsert[1].position_rank).toBe(2);
  });
});

// ============================================================================
// 6. Security Migration Tests
// ============================================================================
describe('Position Ranking RLS Security', () => {
  const migrationPath = join(ROOT, 'supabase/migrations/20260323000000_add_position_ranking.sql');
  let sql: string;
  try {
    sql = readFileSync(migrationPath, 'utf-8');
  } catch {
    sql = '';
  }

  it('update policy checks application ownership', () => {
    expect(sql).toContain('user_id = auth.uid()');
  });

  it('update policy restricts to draft applications only', () => {
    expect(sql).toContain("status = 'draft'");
  });

  it('does not grant DELETE or INSERT privileges (only UPDATE for ranking)', () => {
    // The migration should only add an UPDATE policy, not new INSERT/DELETE
    const createPolicies = sql.match(/CREATE POLICY/g) || [];
    expect(createPolicies.length).toBe(1);
    expect(sql).toContain('FOR UPDATE');
    expect(sql).not.toMatch(/FOR INSERT/);
    expect(sql).not.toMatch(/FOR DELETE/);
  });

  it('does not expose admin-only operations to users', () => {
    // No SELECT ALL or admin bypass
    expect(sql).not.toContain('USING (true)');
  });
});
