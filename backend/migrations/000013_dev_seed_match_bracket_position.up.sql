UPDATE matches
SET
  stage_slot_column = mapping.stage_slot_column,
  stage_slot_row = mapping.stage_slot_row
FROM (
  VALUES
    (3001, 1, 1),
    (3002, 1, 2),
    (3003, 1, 3),
    (3004, 1, 4),
    (3005, 1, 5),
    (3006, 1, 6),
    (3007, 1, 7),
    (3008, 1, 8),
    (3009, 2, 1),
    (3010, 2, 2),
    (3011, 2, 3),
    (3012, 2, 4),
    (3013, 3, 1),
    (3014, 3, 2),
    (3015, 4, 1)
) AS mapping(match_id, stage_slot_column, stage_slot_row)
WHERE matches.id = mapping.match_id;
