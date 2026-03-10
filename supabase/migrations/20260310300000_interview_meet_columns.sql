-- Add Google Meet link and Calendar event ID columns to interview_bookings
ALTER TABLE interview_bookings
  ADD COLUMN IF NOT EXISTS meet_link TEXT,
  ADD COLUMN IF NOT EXISTS calendar_event_id TEXT;
