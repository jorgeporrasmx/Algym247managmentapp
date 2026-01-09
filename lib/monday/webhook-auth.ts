/**
 * Monday.com Webhook Authentication
 * Handles signature verification for incoming webhooks
 */

import { createHmac, timingSafeEqual } from 'crypto'
import { getMondayWebhookSecret, isWebhookVerificationEnabled } from './config'

export interface WebhookVerificationResult {
  valid: boolean
  error?: string
  skipped?: boolean
}

/**
 * Verify Monday.com webhook signature
 * Monday sends a signature in the 'authorization' header
 *
 * @param rawBody - The raw request body as a string
 * @param signature - The signature from the request header
 * @returns Verification result
 */
export function verifyMondayWebhookSignature(
  rawBody: string,
  signature: string | null
): WebhookVerificationResult {
  // Check if verification is enabled
  if (!isWebhookVerificationEnabled()) {
    console.warn('[Monday Webhook] Signature verification is disabled. Set MONDAY_WEBHOOK_SECRET to enable.')
    return { valid: true, skipped: true }
  }

  // Signature is required when verification is enabled
  if (!signature) {
    return { valid: false, error: 'Missing webhook signature' }
  }

  try {
    const secret = getMondayWebhookSecret()

    // Monday.com uses HMAC-SHA256 for webhook signatures
    const expectedSignature = createHmac('sha256', secret)
      .update(rawBody)
      .digest('base64')

    // Use timing-safe comparison to prevent timing attacks
    const signatureBuffer = Buffer.from(signature)
    const expectedBuffer = Buffer.from(expectedSignature)

    if (signatureBuffer.length !== expectedBuffer.length) {
      return { valid: false, error: 'Invalid signature length' }
    }

    const isValid = timingSafeEqual(signatureBuffer, expectedBuffer)

    if (!isValid) {
      console.error('[Monday Webhook] Signature verification failed')
      return { valid: false, error: 'Invalid webhook signature' }
    }

    return { valid: true }
  } catch (error) {
    console.error('[Monday Webhook] Error verifying signature:', error)
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Signature verification error'
    }
  }
}

/**
 * Handle Monday.com webhook challenge
 * Monday sends a challenge request when setting up webhooks
 *
 * @param body - The parsed request body
 * @returns Challenge response if applicable, null otherwise
 */
export function handleMondayChallenge(body: unknown): { challenge: string } | null {
  if (
    typeof body === 'object' &&
    body !== null &&
    'challenge' in body &&
    typeof (body as Record<string, unknown>).challenge === 'string'
  ) {
    console.log('[Monday Webhook] Responding to challenge request')
    return { challenge: (body as { challenge: string }).challenge }
  }
  return null
}

/**
 * Extract signature from request headers
 * Monday uses the 'authorization' header for webhook signatures
 *
 * @param headers - Request headers
 * @returns The signature string or null
 */
export function extractMondaySignature(headers: Headers): string | null {
  // Monday sends signature in the 'authorization' header
  return headers.get('authorization')
}

/**
 * Validate webhook source IP (optional additional security)
 * Monday.com webhook IPs can be whitelisted
 */
export function validateWebhookSource(ip: string): boolean {
  // Monday.com doesn't publish a static IP list, so this is disabled by default
  // You can implement IP whitelisting if needed
  return true
}
