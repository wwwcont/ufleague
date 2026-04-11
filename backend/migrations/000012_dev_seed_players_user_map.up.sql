UPDATE players
SET user_id = mapping.user_id
FROM (
  VALUES
    (2001, 9003),
    (2002, 9004),
    (2003, 9006),
    (2004, 9007),
    (2005, 9008),
    (2006, 9009),
    (2007, 9010),
    (2008, 9011),
    (2009, 9012),
    (2010, 9013),
    (2011, 9014),
    (2012, 9015),
    (2013, 9016),
    (2014, 9017),
    (2015, 9018),
    (2016, 9005)
) AS mapping(player_id, user_id)
WHERE players.id = mapping.player_id;
