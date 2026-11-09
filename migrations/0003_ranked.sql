-- Ranked is scored on the server: each player's RP lives here, and each ranked run's record.
ALTER TABLE players ADD COLUMN rp INTEGER NOT NULL DEFAULT 2000;
ALTER TABLE players ADD COLUMN peak INTEGER NOT NULL DEFAULT 2000;
ALTER TABLE players ADD COLUMN runs INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS players_by_rp ON players (rp DESC);

-- status: live (playing), won (reached 10 wins and was scored; Endless fights can go on), done (finished)
CREATE TABLE IF NOT EXISTS runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id TEXT NOT NULL,
  round INTEGER NOT NULL DEFAULT 1,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  hp INTEGER NOT NULL DEFAULT 10,
  status TEXT NOT NULL DEFAULT 'live',
  rp_delta INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS runs_by_player ON runs (player_id, status);
