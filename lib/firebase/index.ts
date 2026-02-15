/**
 * Firebase Module Exports
 * 
 * Central export point for all Firebase-related utilities
 */

// Firebase configuration and instances
export { db, auth, storage } from './config'
export { adminDb, adminAuth } from './admin'

// Database utilities
export { 
  from,
  getAll,
  getById,
  getByField,
  create,
  update,
  updateByField,
  remove,
  Collections,
  type QueryOptions
} from './db'

// Members service
export {
  getMembers,
  getMemberById,
  getMemberByMondayId,
  createMember,
  updateMember,
  deleteMember
} from './members-service'

// Webhook handler
export {
  handleMondayWebhook,
  BOARDS,
  MEMBER_COLUMNS,
  type MondayWebhookPayload
} from './webhook-handler'
