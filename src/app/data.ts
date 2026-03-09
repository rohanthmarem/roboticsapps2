// All data is now fetched from Supabase.
// This file contains only shared constants.

export const ACTIVITY_TYPES = [
  "Robotics",
  "STEM Club",
  "Athletics",
  "Arts",
  "Community Service",
  "Student Council",
  "Work Experience",
  "Research",
  "Tutoring",
  "Other",
];

export const GRADE_LEVELS = ["Grade 9", "Grade 10", "Grade 11", "Grade 12"];

export const RECOGNITION_LEVELS = [
  "School",
  "Regional",
  "Provincial",
  "National",
  "International",
];

export const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under Review",
  interview_scheduled: "Interview",
  accepted: "Accepted",
  rejected: "Declined",
};
