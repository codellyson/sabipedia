CREATE TABLE guide (
 id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, created_by TEXT NOT NULL REFERENCES user(id),
 current_version_id TEXT REFERENCES guide_version(id), created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE submission (
 id TEXT PRIMARY KEY, guide_id TEXT REFERENCES guide(id), base_version_id TEXT REFERENCES guide_version(id),
 author_id TEXT NOT NULL REFERENCES user(id), content TEXT NOT NULL CHECK(json_valid(content)),
 state TEXT NOT NULL DEFAULT 'awaiting_review' CHECK(state IN ('draft','awaiting_review','published','rejected')),
 moderator_note TEXT, reviewed_by TEXT REFERENCES user(id), created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE guide_version (
 id TEXT PRIMARY KEY, guide_id TEXT NOT NULL REFERENCES guide(id), number INTEGER NOT NULL,
 content TEXT NOT NULL CHECK(json_valid(content)), author_id TEXT NOT NULL REFERENCES user(id),
 published_by TEXT NOT NULL REFERENCES user(id), created_at TEXT NOT NULL DEFAULT (datetime('now')),
 UNIQUE(guide_id,number)
);
CREATE TRIGGER immutable_version_update BEFORE UPDATE ON guide_version BEGIN SELECT RAISE(ABORT,'Published revisions are immutable'); END;
CREATE TRIGGER immutable_version_delete BEFORE DELETE ON guide_version BEGIN SELECT RAISE(ABORT,'Published revisions are immutable'); END;
CREATE TABLE confirmation (
 id TEXT PRIMARY KEY, version_id TEXT NOT NULL REFERENCES guide_version(id), user_id TEXT NOT NULL REFERENCES user(id),
 reason TEXT NOT NULL, community TEXT NOT NULL DEFAULT '', location TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now')),
 UNIQUE(version_id,user_id)
);
CREATE TABLE dispute (
 id TEXT PRIMARY KEY, guide_id TEXT NOT NULL REFERENCES guide(id), version_id TEXT NOT NULL REFERENCES guide_version(id),
 author_id TEXT NOT NULL REFERENCES user(id), note TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','resolved')), resolution TEXT, resolved_by TEXT REFERENCES user(id),
 created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX confirmation_version ON confirmation(version_id);
CREATE INDEX dispute_guide_status ON dispute(guide_id,status);
CREATE INDEX submission_state ON submission(state);
CREATE TABLE media (
 id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES user(id), object_key TEXT NOT NULL UNIQUE,
 content_type TEXT NOT NULL, size INTEGER NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
