-- AI second opinion for moderators; JSON, NULL until the check runs
ALTER TABLE submission ADD COLUMN ai_review TEXT;
