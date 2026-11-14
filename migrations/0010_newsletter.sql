CREATE TABLE newsletter_subscriber (
 email TEXT PRIMARY KEY, token TEXT NOT NULL UNIQUE, confirmed_at TEXT, unsubscribed_at TEXT,
 confirm_sent_at TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
