DROP TABLE IF EXISTS posts;

CREATE TABLE posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content_html TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_posts_created ON posts(created_at DESC);
