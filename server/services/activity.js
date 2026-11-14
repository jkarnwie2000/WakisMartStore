// Admin activity log. Recording must never break the action being recorded.
import { prisma } from '../utils/prisma.js';

/**
 * @param {import('express').Request|null} req  the admin request (null for automatic/system actions)
 * @param {string} action  e.g. PRODUCT_UPDATED
 * @param {string} summary human-readable description
 * @param {{entityType?:string, entityId?:string|number}} [target]
 */
export async function logActivity(req, action, summary, { entityType, entityId } = {}) {
  try {
    await prisma.adminActivity.create({
      data: {
        userId: req?.user?.id ?? null,
        userName: req?.user?.name ?? 'System',
        userEmail: req?.user?.email ?? 'system',
        action,
        entityType: entityType ?? null,
        entityId: entityId == null ? null : String(entityId),
        summary: String(summary).slice(0, 1000),
      },
    });
  } catch (err) {
    console.warn('[activity] could not record activity:', err.message);
  }
}
