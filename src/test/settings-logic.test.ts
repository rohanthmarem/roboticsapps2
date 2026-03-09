import { describe, it, expect } from 'vitest';

// Test the boolean parsing logic used across the app for settings
// This pattern appears in: Settings.tsx, Communications.tsx, Decisions.tsx, Programs.tsx, Interview.tsx

function parseBooleanSetting(value: any): boolean {
  return value === true || value === 'true';
}

describe('Settings boolean parsing', () => {
  it('returns true for boolean true', () => {
    expect(parseBooleanSetting(true)).toBe(true);
  });

  it('returns true for string "true"', () => {
    expect(parseBooleanSetting('true')).toBe(true);
  });

  it('returns false for boolean false', () => {
    expect(parseBooleanSetting(false)).toBe(false);
  });

  it('returns false for string "false"', () => {
    expect(parseBooleanSetting('false')).toBe(false);
  });

  it('returns false for null', () => {
    expect(parseBooleanSetting(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(parseBooleanSetting(undefined)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(parseBooleanSetting('')).toBe(false);
  });

  it('returns false for number 1', () => {
    expect(parseBooleanSetting(1)).toBe(false);
  });
});

describe('Status pipeline transitions', () => {
  const NEXT_ACTIONS: Record<string, { label: string; status: string }[]> = {
    submitted: [
      { label: 'Begin Review', status: 'under_review' },
      { label: 'Advance to Interview', status: 'interview_scheduled' },
      { label: 'Decline', status: 'rejected' },
    ],
    under_review: [
      { label: 'Advance to Interview', status: 'interview_scheduled' },
      { label: 'Accept', status: 'accepted' },
      { label: 'Decline', status: 'rejected' },
    ],
    interview_scheduled: [
      { label: 'Accept', status: 'accepted' },
      { label: 'Decline', status: 'rejected' },
      { label: 'Back to Review', status: 'under_review' },
    ],
    accepted: [
      { label: 'Revert to Review', status: 'under_review' },
    ],
    rejected: [
      { label: 'Reopen for Review', status: 'under_review' },
    ],
  };

  it('submitted has valid next transitions', () => {
    const actions = NEXT_ACTIONS['submitted'];
    expect(actions).toBeDefined();
    expect(actions.map(a => a.status)).toContain('under_review');
    expect(actions.map(a => a.status)).toContain('rejected');
  });

  it('under_review can advance to interview or make final decision', () => {
    const actions = NEXT_ACTIONS['under_review'];
    expect(actions.map(a => a.status)).toContain('interview_scheduled');
    expect(actions.map(a => a.status)).toContain('accepted');
    expect(actions.map(a => a.status)).toContain('rejected');
  });

  it('interview_scheduled can accept, reject, or go back', () => {
    const actions = NEXT_ACTIONS['interview_scheduled'];
    expect(actions.map(a => a.status)).toContain('accepted');
    expect(actions.map(a => a.status)).toContain('rejected');
    expect(actions.map(a => a.status)).toContain('under_review');
  });

  it('accepted and rejected can revert to under_review', () => {
    expect(NEXT_ACTIONS['accepted'].map(a => a.status)).toContain('under_review');
    expect(NEXT_ACTIONS['rejected'].map(a => a.status)).toContain('under_review');
  });

  it('draft has no transitions (applicant must submit first)', () => {
    expect(NEXT_ACTIONS['draft']).toBeUndefined();
  });

  it('all target statuses are valid statuses', () => {
    const validStatuses = ['draft', 'submitted', 'under_review', 'interview_scheduled', 'accepted', 'rejected'];
    for (const actions of Object.values(NEXT_ACTIONS)) {
      for (const action of actions) {
        expect(validStatuses).toContain(action.status);
      }
    }
  });

  it('no status can transition to draft', () => {
    for (const actions of Object.values(NEXT_ACTIONS)) {
      for (const action of actions) {
        expect(action.status).not.toBe('draft');
      }
    }
  });

  it('no status can transition to submitted', () => {
    for (const actions of Object.values(NEXT_ACTIONS)) {
      for (const action of actions) {
        expect(action.status).not.toBe('submitted');
      }
    }
  });
});
