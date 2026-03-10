-- Add per-question limit_mode column (characters or words)
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS limit_mode text NOT NULL DEFAULT 'characters'
  CHECK (limit_mode IN ('characters', 'words'));
