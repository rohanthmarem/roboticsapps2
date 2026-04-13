-- Soft-eliminate an applicant from a specific position in rankings
-- Does not notify the applicant or change their application status
ALTER TABLE application_positions
  ADD COLUMN IF NOT EXISTS eliminated boolean NOT NULL DEFAULT false;
