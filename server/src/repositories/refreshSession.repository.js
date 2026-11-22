import RefreshSession from '../models/refreshSession.model.js';

export function findByTokenHash(tokenHash) {
  return RefreshSession.findOne({ tokenHash }).select(
    '+tokenHash +replacedByTokenHash +authVersion',
  );
}

export function createRefreshSession(data, session) {
  return new RefreshSession(data).save(session ? { session } : undefined);
}

export function replaceActiveToken({
  sessionId,
  tokenHash,
  replacementTokenHash,
  now,
}) {
  return RefreshSession.findOneAndUpdate(
    {
      _id: sessionId,
      tokenHash,
      revokedAt: null,
      expiresAt: { $gt: now },
    },
    {
      $set: {
        revokedAt: now,
        lastUsedAt: now,
        replacedByTokenHash: replacementTokenHash,
      },
    },
    { returnDocument: 'after' },
  ).select('+tokenHash');
}

export function revokeFamily(familyId, revokedAt) {
  return RefreshSession.updateMany(
    { familyId, revokedAt: null },
    { $set: { revokedAt } },
  );
}

export function revokeAllForUser(userId, revokedAt, session) {
  const update = RefreshSession.updateMany(
    { user: userId, revokedAt: null },
    { $set: { revokedAt } },
  );

  if (session) {
    update.session(session);
  }

  return update;
}

export function deleteByTokenHash(tokenHash) {
  return RefreshSession.deleteOne({ tokenHash });
}
