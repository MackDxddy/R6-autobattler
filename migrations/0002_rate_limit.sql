-- Simple fixed-window rate limits (e.g. new guests per IP per hour). The key holds a hash, never a raw IP.
CREATE TABLE IF NOT EXISTS rate (
  key    TEXT PRIMARY KEY,
  window INTEGER NOT NULL,   -- start of the current window (ms)
  count  INTEGER NOT NULL
);
