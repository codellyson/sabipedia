type MediaUser = { id: string; role?: string | null }

export function canReadUnpublishedMedia(
  user: MediaUser | null,
  media: { ownerId: string; submissionAuthorId?: string | null },
) {
  if (!user) return false
  if (user.id === media.ownerId || user.id === media.submissionAuthorId) return true
  return user.role?.split(',').some(role => role === 'admin' || role === 'moderator') ?? false
}
