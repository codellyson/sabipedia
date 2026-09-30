CREATE TABLE community_evidence (
 id TEXT PRIMARY KEY,
 guide_slug TEXT NOT NULL,
 source_url TEXT NOT NULL,
 source_title TEXT NOT NULL,
 excerpts TEXT NOT NULL CHECK(json_valid(excerpts)),
 post_count INTEGER NOT NULL CHECK(post_count >= 0),
 content_hash TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'awaiting_review' CHECK(status IN ('awaiting_review','reviewed','dismissed')),
 moderator_note TEXT,
 reviewed_by TEXT REFERENCES user(id),
 scraped_at TEXT NOT NULL,
 reviewed_at TEXT,
 created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX community_evidence_status ON community_evidence(status, scraped_at);
