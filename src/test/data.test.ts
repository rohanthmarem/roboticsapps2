import { describe, it, expect } from 'vitest';
import { STATUS_LABELS, ACTIVITY_TYPES, GRADE_LEVELS, RECOGNITION_LEVELS } from '../app/data';

describe('data.ts constants', () => {
  describe('STATUS_LABELS', () => {
    it('has labels for all valid application statuses', () => {
      const requiredStatuses = ['draft', 'submitted', 'under_review', 'interview_scheduled', 'accepted', 'rejected'];
      for (const status of requiredStatuses) {
        expect(STATUS_LABELS[status]).toBeDefined();
        expect(typeof STATUS_LABELS[status]).toBe('string');
        expect(STATUS_LABELS[status].length).toBeGreaterThan(0);
      }
    });

    it('does not have extra undefined statuses', () => {
      const validStatuses = ['draft', 'submitted', 'under_review', 'interview_scheduled', 'accepted', 'rejected'];
      for (const key of Object.keys(STATUS_LABELS)) {
        expect(validStatuses).toContain(key);
      }
    });
  });

  describe('ACTIVITY_TYPES', () => {
    it('is a non-empty array of strings', () => {
      expect(Array.isArray(ACTIVITY_TYPES)).toBe(true);
      expect(ACTIVITY_TYPES.length).toBeGreaterThan(0);
      for (const type of ACTIVITY_TYPES) {
        expect(typeof type).toBe('string');
      }
    });

    it('includes expected types', () => {
      expect(ACTIVITY_TYPES).toContain('Robotics');
      expect(ACTIVITY_TYPES).toContain('Other');
    });
  });

  describe('GRADE_LEVELS', () => {
    it('has all high school grades', () => {
      expect(GRADE_LEVELS).toEqual(['Grade 9', 'Grade 10', 'Grade 11', 'Grade 12']);
    });
  });

  describe('RECOGNITION_LEVELS', () => {
    it('has all recognition levels in ascending order', () => {
      expect(RECOGNITION_LEVELS).toEqual(['School', 'Regional', 'Provincial', 'National', 'International']);
    });
  });
});
