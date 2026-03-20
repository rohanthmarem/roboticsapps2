-- Add unique constraint on (application_id, question_id) for responses table
-- Required for efficient upsert operations (replaces SELECT+UPDATE/INSERT pattern)

-- First, deduplicate any existing rows: keep the most recently updated one
DELETE FROM public.responses
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY application_id, question_id
             ORDER BY updated_at DESC NULLS LAST, id DESC
           ) AS rn
    FROM public.responses
  ) ranked
  WHERE rn > 1
);

ALTER TABLE public.responses
ADD CONSTRAINT responses_application_question_unique
UNIQUE (application_id, question_id);
