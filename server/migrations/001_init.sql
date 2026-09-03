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

-- ---------------------------------------------------------------------------
-- Research telemetry (STRICTLY OPT-IN in the game client).
-- One row per player decision/outcome event. participant_id is a random UUID
-- generated in the player's browser at consent time — pseudonymous, no
-- personal data. campaign_index counts that participant's campaigns (1, 2, …),
-- which is the longitudinal axis for behavior-change analysis: e.g. does the
-- cooperation ratio rise between a participant's first and third campaign?
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS events (
  id             BIGSERIAL PRIMARY KEY,
  participant_id UUID         NOT NULL,
  campaign_id    UUID         NOT NULL,      -- one per campaign run
  campaign_index INTEGER      NOT NULL CHECK (campaign_index >= 1),
  round          INTEGER,                    -- NULL for campaign-level events
  type           VARCHAR(24)  NOT NULL,      -- consent|campaign_start|invest|card|deal|meeting|favour|sharpen|round_end|campaign_end
  payload        JSONB        NOT NULL DEFAULT '{}',
  lang           VARCHAR(2)   NOT NULL DEFAULT 'en',
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS events_participant_idx ON events (participant_id, created_at);
CREATE INDEX IF NOT EXISTS events_campaign_idx    ON events (campaign_id);
CREATE INDEX IF NOT EXISTS events_type_idx        ON events (type);
