CREATE TABLE guide_video (
 id TEXT PRIMARY KEY,
 guide_id TEXT NOT NULL REFERENCES guide(id),
 version_id TEXT NOT NULL REFERENCES guide_version(id),
 object_key TEXT NOT NULL UNIQUE,
 content_type TEXT NOT NULL CHECK(content_type IN ('video/webm','video/mp4')),
 size INTEGER NOT NULL CHECK(size > 0),
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','rejected')),
 created_by TEXT NOT NULL REFERENCES user(id),
 reviewed_by TEXT REFERENCES user(id),
 created_at TEXT NOT NULL DEFAULT (datetime('now')),
 reviewed_at TEXT
);
CREATE INDEX guide_video_lookup ON guide_video(guide_id,version_id,status,created_at);
CREATE UNIQUE INDEX guide_video_active ON guide_video(guide_id,version_id) WHERE status IN ('draft','published');
