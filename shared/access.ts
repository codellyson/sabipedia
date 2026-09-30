import { createAccessControl } from 'better-auth/plugins/access'
import { defaultStatements, adminAc } from 'better-auth/plugins/admin/access'
export const ac = createAccessControl({ ...defaultStatements, guide: ['submit', 'review', 'publish', 'confirm', 'flag'] } as const)
export const roles = {
 contributor: ac.newRole({guide: ['submit', 'confirm', 'flag']}),
 moderator: ac.newRole({guide: ['submit', 'review', 'publish', 'confirm', 'flag']}),
 admin: ac.newRole({...adminAc.statements, guide: ['submit', 'review', 'publish', 'confirm', 'flag']})
}
