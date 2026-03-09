import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');

// Test that the RLS migration file has all required policies
describe('RLS Policies: Migration completeness', () => {
  const migrationPath = join(ROOT, 'supabase/migrations/20260308000100_fix_recursive_rls.sql');
  let sql: string;

  try {
    sql = readFileSync(migrationPath, 'utf-8');
  } catch {
    sql = '';
  }

  it('migration file exists', () => {
    expect(sql.length).toBeGreaterThan(0);
  });

  it('uses security definer function for admin checks', () => {
    expect(sql).toContain('security definer');
    expect(sql).toContain('public.is_admin()');
  });

  it('is_admin() function checks profiles table correctly', () => {
    expect(sql).toContain("select exists");
    expect(sql).toContain("role = 'admin'");
    expect(sql).toContain("auth.uid()");
  });

  // Test all tables have proper policies
  const tables = [
    'profiles', 'positions', 'questions', 'settings',
    'applications', 'responses', 'activities', 'honors',
    'interview_slots', 'interview_bookings', 'reviews', 'decisions',
  ];

  for (const table of tables) {
    it(`has policies for ${table} table`, () => {
      expect(sql).toContain(`on public.${table}`);
    });
  }

  // Test admin policies use is_admin() instead of subqueries
  it('admin policies use is_admin() function, not raw subqueries', () => {
    const adminPolicies = sql.match(/create policy "Admins can[\s\S]*?;/g) || [];
    for (const policy of adminPolicies) {
      if (policy.includes('public.is_admin()')) continue;
      // If it references profiles directly in an admin policy, that's the old bug
      if (policy.includes("from public.profiles where id = auth.uid()")) {
        throw new Error(`Admin policy uses raw subquery instead of is_admin(): ${policy.slice(0, 80)}`);
      }
    }
  });

  // Test specific security concerns
  it('users can only view their own profiles', () => {
    expect(sql).toContain('Users can view own profile');
    expect(sql).toContain('auth.uid() = id');
  });

  it('users can only view their own applications', () => {
    expect(sql).toContain('Users can view own applications');
    expect(sql).toContain('auth.uid() = user_id');
  });

  it('users can only view their own decisions', () => {
    expect(sql).toContain('Users can view own decisions');
  });

  it('positions are readable by anyone', () => {
    expect(sql).toContain('Anyone can view positions');
    // The policy should use "using (true)"
    const posSelectPolicy = sql.match(/create policy "Anyone can view positions"[\s\S]*?;/);
    expect(posSelectPolicy?.[0]).toContain('using (true)');
  });

  it('settings are readable by anyone', () => {
    expect(sql).toContain('Anyone can view settings');
  });

  it('only admins can insert/update/delete positions', () => {
    expect(sql).toContain('Admins can insert positions');
    expect(sql).toContain('Admins can update positions');
    expect(sql).toContain('Admins can delete positions');
  });

  it('only admins can manage decisions', () => {
    expect(sql).toContain('Admins can insert decisions');
    expect(sql).toContain('Admins can update decisions');
    expect(sql).toContain('Admins can view all decisions');
  });
});

describe('RLS Policies: Known vulnerability checks', () => {
  const migrationPath = join(ROOT, 'supabase/migrations/20260308000100_fix_recursive_rls.sql');
  let sql: string;
  try {
    sql = readFileSync(migrationPath, 'utf-8');
  } catch {
    sql = '';
  }

  it('interview_slots update policy exists (known broad policy)', () => {
    // This documents the known issue: interview_slots has a broad update policy
    // The policy "Users can update slots for booking" uses (true)
    expect(sql).toContain('Users can update slots for booking');
    // Document that this is intentionally broad for booking functionality
    // but should be tightened in a future iteration
  });

  it('drops all old policies before recreating', () => {
    const dropCount = (sql.match(/drop policy if exists/g) || []).length;
    const createCount = (sql.match(/create policy/g) || []).length;
    // Should have at least as many drops as creates
    expect(dropCount).toBeGreaterThanOrEqual(createCount);
  });
});
