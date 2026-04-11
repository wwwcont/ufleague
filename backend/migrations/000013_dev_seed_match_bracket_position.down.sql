UPDATE matches
SET
  stage_slot_column = NULL,
  stage_slot_row = NULL
WHERE id BETWEEN 3001 AND 3015;
