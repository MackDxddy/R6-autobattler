-- Players, their run backups, and the boards they took into fights (the pool for real ghosts later).
CREATE TABLE IF NOT EXISTS players (
  id         TEXT PRIMARY KEY,          -- 'g_' + random, public
  token_hash TEXT NOT NULL,             -- sha256 of the secret the device keeps
  name       TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_seen  INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS saves (
  player_id  TEXT PRIMARY KEY REFERENCES players(id),
  data       TEXT NOT NULL,             -- JSON: battler.save, battler.profile
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS boards (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id  TEXT NOT NULL REFERENCES players(id),
  mode       TEXT NOT NULL,
  round      INTEGER NOT NULL,
  wins       INTEGER NOT NULL,
  losses     INTEGER NOT NULL,
  team       TEXT NOT NULL,             -- JSON: the five (or fewer) players, as sent to battle
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS boards_by_round ON boards(round, wins);
CREATE INDEX IF NOT EXISTS boards_by_player ON boards(player_id);
