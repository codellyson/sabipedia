CREATE TABLE review_annotation (
 id TEXT PRIMARY KEY,
 submission_id TEXT NOT NULL REFERENCES submission(id) ON DELETE CASCADE,
 reviewer_id TEXT NOT NULL REFERENCES user(id),
 quote TEXT NOT NULL,
 note TEXT NOT NULL,
 start_offset INTEGER NOT NULL CHECK(start_offset >= 0),
 end_offset INTEGER NOT NULL CHECK(end_offset > start_offset),
 created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX review_annotation_submission ON review_annotation(submission_id,created_at);
