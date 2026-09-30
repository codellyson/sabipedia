import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

// Fixed local target: this command cannot be redirected to remote D1.
if (process.argv.length > 2) throw new Error('Use npm run db:clear-demo without arguments; this cleanup is local only.')
const root = dirname(dirname(fileURLToPath(import.meta.url)))
const cleanupSql = `
DELETE FROM confirmation
 WHERE id LIKE 'demo-%' OR version_id LIKE 'demo-%' OR user_id LIKE 'demo-%';
DELETE FROM dispute
 WHERE id LIKE 'demo-%' OR guide_id LIKE 'demo-%' OR version_id LIKE 'demo-%' OR author_id LIKE 'demo-%';
DELETE FROM submission
 WHERE id LIKE 'demo-%' OR guide_id LIKE 'demo-%' OR base_version_id LIKE 'demo-%' OR author_id LIKE 'demo-%';
UPDATE guide SET current_version_id=NULL WHERE id LIKE 'demo-%' OR slug LIKE 'demo-%';
DROP TRIGGER IF EXISTS immutable_version_update;
DROP TRIGGER IF EXISTS immutable_version_delete;
DELETE FROM guide_version
 WHERE id LIKE 'demo-%' OR guide_id LIKE 'demo-%' OR author_id LIKE 'demo-%' OR published_by LIKE 'demo-%';
DELETE FROM guide
 WHERE id LIKE 'demo-%' OR slug LIKE 'demo-%' OR created_by LIKE 'demo-%';
DELETE FROM session WHERE userId LIKE 'demo-%';
DELETE FROM account WHERE userId LIKE 'demo-%';
DELETE FROM verification WHERE identifier IN ('author@demo.invalid','moderator@demo.invalid','reader-a@demo.invalid','reader-b@demo.invalid','reader-c@demo.invalid');
DELETE FROM user WHERE id LIKE 'demo-%';
`
const restoreSql = `
CREATE TRIGGER IF NOT EXISTS immutable_version_update BEFORE UPDATE ON guide_version BEGIN SELECT RAISE(ABORT,'Published revisions are immutable'); END;
CREATE TRIGGER IF NOT EXISTS immutable_version_delete BEFORE DELETE ON guide_version BEGIN SELECT RAISE(ABORT,'Published revisions are immutable'); END;
`

const temp = await mkdtemp(join(tmpdir(), 'knowledge-bank-clear-demo-'))
try {
 const file = join(temp, 'clear-demo.sql')
 await writeFile(file, cleanupSql)
 const result = spawnSync(process.execPath, [join(root, 'node_modules/wrangler/bin/wrangler.js'), 'd1', 'execute', 'DB', '--local', '--file', file, '--yes'], { cwd: root, stdio: 'inherit' })
 if (result.error) throw result.error
 if (result.status !== 0) process.exitCode = result.status || 1
 else console.log('Removed local demo guides, attached demo submissions, demo feedback and demo accounts. Source research and community evidence were preserved.')
} finally {
 const restoreFile = join(temp, 'restore-immutable-triggers.sql')
 await writeFile(restoreFile, restoreSql)
 const restored = spawnSync(process.execPath, [join(root, 'node_modules/wrangler/bin/wrangler.js'), 'd1', 'execute', 'DB', '--local', '--file', restoreFile, '--yes'], { cwd: root, stdio: 'inherit' })
 if (restored.error) throw restored.error
 if (restored.status !== 0) throw new Error('Demo cleanup ran, but restoring immutable revision triggers failed.')
 await rm(temp, { recursive: true, force: true })
}
