-- POVODEŇ scoreboard schema (PostgreSQL).
-- One row per finished campaign. Rankings are computed over created_at windows:
--   all-time  = every row
--   monthly   = created_at >= date_trunc('month', now())
--   weekly    = created_at >= date_trunc('week',  now())   (ISO week, Monday start)

CREATE TABLE IF NOT EXISTS scores (
  id            BIGSERIAL PRIMARY KEY,
  name          VARCHAR(24)  NOT NULL,               -- player-chosen display name
  town          VARCHAR(32)  NOT NULL,               -- municipality played
  score         INTEGER      NOT NULL CHECK (score BETWEEN 0 AND 100),
  grade         VARCHAR(2)   NOT NULL,               -- A+ .. F
  re_election   INTEGER      NOT NULL CHECK (re_election BETWEEN 0 AND 100),
  region_deaths INTEGER      NOT NULL CHECK (region_deaths >= 0),
  region_damage INTEGER      NOT NULL CHECK (region_damage >= 0),  -- €M
  lang          VARCHAR(2)   NOT NULL DEFAULT 'en',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Ranking order: best score first, earlier submission breaks ties.
CREATE INDEX IF NOT EXISTS scores_rank_idx    ON scores (score DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS scores_created_idx ON scores (created_at);
