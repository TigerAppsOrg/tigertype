-- TigerType Database Schema

-- Users table for storing Princeton netids and basic account information
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  netid VARCHAR(50) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  avg_wpm NUMERIC(5,2) DEFAULT 0,
  avg_accuracy NUMERIC(5,2) DEFAULT 0,
  races_completed INTEGER DEFAULT 0,
  fastest_wpm NUMERIC(5,2) DEFAULT 0,
  has_completed_tutorial BOOLEAN DEFAULT false
);

-- Snippets table for storing text that users will type
CREATE TABLE IF NOT EXISTS snippets (
  id SERIAL PRIMARY KEY,
  text TEXT NOT NULL UNIQUE,
  source VARCHAR(255),
  category VARCHAR(100),
  difficulty INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  word_count INTEGER,
  character_count INTEGER,
  is_princeton_themed BOOLEAN DEFAULT FALSE
);

-- Lobbies table for managing race sessions
CREATE TABLE IF NOT EXISTS lobbies (
  id SERIAL PRIMARY KEY,
  code VARCHAR(8) UNIQUE NOT NULL,
  type VARCHAR(20) CHECK (type IN ('public', 'private', 'practice')) NOT NULL,
  status VARCHAR(20) CHECK (status IN ('waiting', 'countdown', 'racing', 'finished')) NOT NULL,
  snippet_id INT REFERENCES snippets(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  finished_at TIMESTAMP,
  host_id INTEGER REFERENCES users(id),
  text_category VARCHAR(20) DEFAULT 'general'
);

-- Race results table for tracking performance in races
CREATE TABLE IF NOT EXISTS race_results (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  lobby_id INT REFERENCES lobbies(id),
  snippet_id INT REFERENCES snippets(id),
  wpm DECIMAL(6, 2),
  accuracy DECIMAL(5, 2),
  completion_time DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Junction table for managing players in a lobby
CREATE TABLE IF NOT EXISTS lobby_players (
  lobby_id INTEGER REFERENCES lobbies(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  is_ready BOOLEAN DEFAULT FALSE,
  join_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (lobby_id, user_id)
);

-- Badges table for tracking user achievements
CREATE TABLE IF NOT EXISTS badges (
  id SERIAL PRIMARY KEY,
  key VARCHAR UNIQUE NOT NULL,   
  name VARCHAR NOT NULL,          
  description TEXT,
  icon_url VARCHAR,                   
  criteria_type VARCHAR NOT NULL,          
  criteria_value INTEGER NOT NULL             
);

-- Junction table for managing user badges
-- This table tracks which users have been awarded which badges
CREATE TABLE IF NOT EXISTS user_badges (
  user_id INTEGER REFERENCES users(id)  ON DELETE CASCADE,
  badge_id INTEGER REFERENCES badges(id) ON DELETE CASCADE,
  awarded_at TIMESTAMPTZ DEFAULT now(),
  is_selected BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (user_id, badge_id)
);

-- Title table for tracking user achievements
CREATE TABLE IF NOT EXISTS titles (
  id SERIAL PRIMARY KEY,
  key VARCHAR UNIQUE NOT NULL,
  name VARCHAR UNIQUE NOT NULL,      -- Unique title name
  description TEXT,                  -- Description of the title
  criteria_type VARCHAR NOT NULL,    -- Type of criteria for earning the title
  criteria_value INTEGER NOT NULL     -- Value required to earn the title
);

-- Junction table for managing user titles
-- This table tracks which users have been awarded which titles
CREATE TABLE IF NOT EXISTS user_titles (
  user_id INTEGER REFERENCES users(id)  ON DELETE CASCADE,
  title_id INTEGER REFERENCES titles(id) ON DELETE CASCADE,
  awarded_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, title_id)
);

-- User sessions table for storing session data
DO $$
BEGIN
    -- Check if the table exists
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'user_sessions') THEN
        -- Create the table if it doesn't exist
        CREATE TABLE "user_sessions" (
            "sid" varchar NOT NULL COLLATE "default",
            "sess" json NOT NULL,
            "expire" timestamp(6) NOT NULL
        ) WITH (OIDS=FALSE);

        -- Add primary key constraint
        ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
    END IF;
END $$;


-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_race_results_user_id ON race_results(user_id);
CREATE INDEX IF NOT EXISTS idx_race_results_lobby_id ON race_results(lobby_id);
CREATE INDEX IF NOT EXISTS idx_lobby_players_lobby_id ON lobby_players(lobby_id);
CREATE INDEX IF NOT EXISTS idx_lobby_players_user_id ON lobby_players(user_id);

-- Sample data for testing - Only insert if not already present
DO $$
BEGIN
    -- Check if basic test snippets exist
    IF NOT EXISTS (SELECT 1 FROM snippets WHERE text LIKE 'The quick brown fox%') THEN
        -- Test snippet examples
        INSERT INTO snippets (text, source, category, difficulty)
        VALUES 
            ('The quick brown fox jumps over the lazy dog.', 'Typing Exercise', 'beginner', 1),
            ('Princeton University is located in Princeton, New Jersey and is one of the oldest universities in the United States.', 'Princeton Facts', 'Medium', 2),
            ('To be or not to be, that is the question. Whether ''tis nobler in the mind to suffer the slings and arrows of outrageous fortune, or to take arms against a sea of troubles, and by opposing end them.', 'Shakespeare', 'advanced', 3);
    END IF;

    -- Check if Princeton-themed snippets exist
    IF NOT EXISTS (SELECT 1 FROM snippets WHERE is_princeton_themed = TRUE LIMIT 1) THEN
        -- Princeton-themed snippets
        INSERT INTO snippets (text, source, category, difficulty, is_princeton_themed, word_count, character_count)
        VALUES 
            ('Princeton University, founded in 1746 as the College of New Jersey, is a private Ivy League research university in Princeton, New Jersey. The university is one of the oldest institutions of higher education in the United States.', 'Princeton History', 'princeton', 2, TRUE, 36, 203),
            
            ('Nassau Hall, one of Princeton''s oldest buildings, was named for King William III, Prince of Orange, of the House of Nassau. When completed in 1756, it was the largest college building in North America.', 'Princeton Landmarks', 'princeton', 2, TRUE, 37, 183),
            
            ('Princeton''s undergraduate program operates on a liberal arts curriculum, providing students with both depth in a chosen academic department and breadth across disciplines through distribution requirements and interdisciplinary certificate programs.', 'Princeton Academics', 'princeton', 3, TRUE, 29, 209),
            
            ('The Princeton University Honor Code, established in 1893, is a code of academic integrity that prohibits students from cheating on exams. Students pledge their honor that they have not violated the Honor Code during examinations.', 'Princeton Traditions', 'princeton', 2, TRUE, 33, 188),
            
            ('The Princeton Tigers are the athletic teams of Princeton University. The school sponsors 38 varsity sports, making it one of the most diverse athletic programs among NCAA Division I schools.', 'Princeton Athletics', 'princeton', 1, TRUE, 26, 150);
    END IF;

    INSERT INTO badges (key, name, description, icon_url, criteria_type, criteria_value)
    VALUES
      ('first_race',       'First Race',     'Complete your first race',      '/assets/badges/firstrace.png', 'races_completed', 1),
      ('ten_race',         '10 Races',       'Complete 10 races',           '/assets/badges/10races.png',   'races_completed', 10),
      ('one_hundred_race', '100 Races',      'Complete 100 races',          '/assets/badges/100races.png',  'races_completed', 100),
      ('novice',         'Novice',         'Average WPM ≥ 60',            '/assets/badges/novice.png',    'avg_wpm',         60),
      ('intermediate',     'Intermediate',   'Average WPM ≥ 100',           '/assets/badges/intermediate.png','avg_wpm',         100),
      ('advanced',       'Advanced',       'Average WPM ≥ 125',           '/assets/badges/advanced.png',  'avg_wpm',         125),
      ('expert',         'Expert',         'Average WPM ≥ 150',           '/assets/badges/expert.png',    'avg_wpm',         150),
      ('fast',           'Fast',           'Fastest WPM ≥ 150',           '/assets/badges/fast.png',      'fastest_wpm',     150),
      ('faster',         'Faster',         'Fastest WPM ≥ 175',           '/assets/badges/faster.png',    'fastest_wpm',     175),
      ('fastest',        'Fastest',        'Fastest WPM ≥ 200',           '/assets/badges/fastest.png',   'fastest_wpm',     200)
    ON CONFLICT (key) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      icon_url = EXCLUDED.icon_url,
      criteria_type = EXCLUDED.criteria_type,
      criteria_value = EXCLUDED.criteria_value;

    INSERT INTO titles (key, name, description, criteria_type, criteria_value)
    VALUES 
      ('wawa_warrior', 'Wawa Warrior', 'Complete a race or practice session with the super secret Wawa snippet', 'snippet_completed', 589),
      ('orange_lightning', 'Orange Lightning', 'Achieve an average WPM of 150+', 'avg_wpm', 150),
      ('president_eisgruber', 'President Eisgruber', 'Fastest recorded time for the 15-second global leaderboard', 'global_fastest', 0),
      ('beta_tester', 'Beta Tester', 'Complete a race before May 15, 2025', 'beta_tester', 20250515),
      ('needs_a_shower', 'Needs A Shower', 'Complete 1000 tests or sessions', 'sessions_completed', 1000),
      ('commitment_issues', 'Commitment Issues', 'Achieve a completion rate of less than 5% across all sessions', 'completion_rate_low', 5),
      ('princetons_fastest_typer', 'Princeton''s Fastest Typer', 'Highest average WPM across all users', 'global_highest_avg_wpm', 0),
      ('princetons_slowest_typer', 'Princeton''s Slowest Typer', 'Lowest average WPM across all users (min 10 sessions)', 'global_lowest_avg_wpm', 0),
      ('spia_major', 'SPIA Major', 'Type over 10,000 words in total', 'words_typed', 10000),
      ('record_holder', 'Record Holder', 'Highest recorded fastest WPM across all users', 'global_highest_fastest_wpm', 0)
    ON CONFLICT (key) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      criteria_type = EXCLUDED.criteria_type,
      criteria_value = EXCLUDED.criteria_value;
      
END $$;

-- Example queries

-- Get top 10 users by average WPM
-- SELECT netid, avg_wpm FROM users ORDER BY avg_wpm DESC LIMIT 10;

-- Get a user's race history with snippet details
-- SELECT r.wpm, r.accuracy, r.completion_time, s.text, s.category, l.type, r.created_at
-- FROM race_results r
-- JOIN snippets s ON r.snippet_id = s.id
-- JOIN lobbies l ON r.lobby_id = l.id
-- WHERE r.user_id = 1
-- ORDER BY r.created_at DESC
-- LIMIT 10;

-- Find active public lobbies
-- SELECT l.*, s.category, COUNT(lp.user_id) as player_count
-- FROM lobbies l
-- JOIN lobby_players lp ON l.id = lp.lobby_id
-- JOIN snippets s ON l.snippet_id = s.id
-- WHERE l.type = 'public' AND l.status = 'waiting'
-- GROUP BY l.id, s.category
-- ORDER BY l.created_at ASC;

-- Get race results for a specific lobby
-- SELECT r.*, u.netid 
-- FROM race_results r
-- JOIN users u ON r.user_id = u.id
-- WHERE r.lobby_id = 123
-- ORDER BY r.wpm DESC;

-- Timed Leaderboard table for tracking performance in timed tests
CREATE TABLE IF NOT EXISTS timed_leaderboard (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  duration INT NOT NULL CHECK (duration IN (15, 30, 60, 120)), -- Timed test duration in seconds
  wpm DECIMAL(6, 2) NOT NULL,
  accuracy DECIMAL(5, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for timed leaderboard performance
CREATE INDEX IF NOT EXISTS idx_timed_leaderboard_user_id ON timed_leaderboard(user_id);
CREATE INDEX IF NOT EXISTS idx_timed_leaderboard_duration ON timed_leaderboard(duration);
CREATE INDEX IF NOT EXISTS idx_timed_leaderboard_wpm ON timed_leaderboard(wpm DESC);
CREATE INDEX IF NOT EXISTS idx_timed_leaderboard_created_at ON timed_leaderboard(created_at DESC);

-- Recalculate user statistics
-- UPDATE users u
-- SET 
--   avg_wpm = subquery.avg_wpm,
--   avg_accuracy = subquery.avg_accuracy,
--   races_completed = subquery.race_count
-- FROM (
--   SELECT 
--     user_id,
--     AVG(wpm) as avg_wpm,
--     AVG(accuracy) as avg_accuracy,
--     COUNT(*) as race_count
--   FROM race_results
--   WHERE user_id = 1 -- Replace 1 with the actual user_id
--   GROUP BY user_id
-- ) as subquery
-- WHERE u.id = subquery.user_id;

-- Partial Sessions table for tracking words typed in incomplete sessions
CREATE TABLE IF NOT EXISTS partial_sessions (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  session_type VARCHAR(20) NOT NULL, -- 'snippet' or 'timed'
  words_typed INT NOT NULL,
  characters_typed INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for partial_sessions performance
CREATE INDEX IF NOT EXISTS idx_partial_sessions_user_id ON partial_sessions(user_id);

-- Feedback entries table for capturing in-app feedback/bug reports
CREATE TABLE IF NOT EXISTS feedback_entries (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  netid VARCHAR(50),
  category VARCHAR(20) NOT NULL DEFAULT 'feedback',
  message TEXT NOT NULL,
  contact_info TEXT,
  page_path TEXT,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_feedback_entries_user_id ON feedback_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_entries_created_at ON feedback_entries(created_at);

