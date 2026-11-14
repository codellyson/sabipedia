CREATE TABLE language_reviewer (
 user_id TEXT NOT NULL REFERENCES user(id), language TEXT NOT NULL, added_by TEXT NOT NULL REFERENCES user(id),
 created_at TEXT NOT NULL DEFAULT (datetime('now')), PRIMARY KEY(user_id,language)
);
CREATE TABLE lesson (
 id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, language TEXT NOT NULL, created_by TEXT NOT NULL REFERENCES user(id),
 current_version_id TEXT REFERENCES lesson_version(id), created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE lesson_submission (
 id TEXT PRIMARY KEY, lesson_id TEXT REFERENCES lesson(id), base_version_id TEXT REFERENCES lesson_version(id),
 language TEXT NOT NULL, author_id TEXT NOT NULL REFERENCES user(id), content TEXT NOT NULL CHECK(json_valid(content)),
 state TEXT NOT NULL DEFAULT 'awaiting_review' CHECK(state IN ('awaiting_review','published','rejected')),
 reviewer_note TEXT, reviewed_by TEXT REFERENCES user(id), reviewed_at TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE lesson_version (
 id TEXT PRIMARY KEY, lesson_id TEXT NOT NULL REFERENCES lesson(id), number INTEGER NOT NULL,
 content TEXT NOT NULL CHECK(json_valid(content)), author_id TEXT NOT NULL REFERENCES user(id),
 published_by TEXT NOT NULL REFERENCES user(id), created_at TEXT NOT NULL DEFAULT (datetime('now')),
 UNIQUE(lesson_id,number)
);
CREATE TRIGGER immutable_lesson_version_update BEFORE UPDATE ON lesson_version BEGIN SELECT RAISE(ABORT,'Published revisions are immutable'); END;
CREATE TRIGGER immutable_lesson_version_delete BEFORE DELETE ON lesson_version BEGIN SELECT RAISE(ABORT,'Published revisions are immutable'); END;
CREATE TABLE phrase_flag (
 id TEXT PRIMARY KEY, lesson_id TEXT NOT NULL REFERENCES lesson(id), version_id TEXT NOT NULL REFERENCES lesson_version(id),
 phrase_index INTEGER NOT NULL, author_id TEXT NOT NULL REFERENCES user(id), note TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','resolved')), resolved_by TEXT REFERENCES user(id),
 created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX lesson_language ON lesson(language);
CREATE INDEX lesson_submission_state ON lesson_submission(state,language);
CREATE INDEX phrase_flag_open ON phrase_flag(status,lesson_id);
