/**
 * Payment Services - Stub implementations for Sprint 1
 * These will be replaced with real Fiserv integration in Sprint 4
 */

export interface PaymentLinkRequest {
  memberId: string
  contractId: string
  amount: number
  currency?: string
  paymentType: 'membership' | 'renewal' | 'late_fee' | 'penalty' | 'other'
  description?: string
  dueDate?: Date
}

export interface PaymentLinkResponse {
  success: boolean
  paymentId: string
  paymentReference: string
  paymentLink: string
  fiservPaymentId: string
  expiresAt: Date
  error?: string
}

export interface PaymentStatusUpdate {
  paymentReference: string
  fiservPaymentId: string
  status: 'paid' | 'failed' | 'refunded' | 'cancelled'
  paidDate?: Date
  externalReference?: string
  metadata?: Record<string, unknown>
}

/**
 * Generate a fake payment link for testing
 * In Sprint 4, this will call the real Fiserv API
 */
export async function createPaymentLink(request: PaymentLinkRequest): Promise<PaymentLinkResponse> {
  try {
    // Generate fake payment reference
    const paymentReference = `PAY_${Date.now()}_${Math.random().toString(36).substring(2, 11).toUpperCase()}`
    
    // Generate fake Fiserv payment ID
    const fiservPaymentId = `FISERV_${Date.now()}_${Math.random().toString(36).substring(2, 11).toUpperCase()}`
    
    // Create fake payment link (in real implementation, this would be from Fiserv)
    const paymentLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payments/stub/${paymentReference}`
    
    // Set expiration to 30 days from now
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    console.log(`[STUB] Generated payment link for member ${request.memberId}:`, {
      paymentReference,
      fiservPaymentId,
      paymentLink,
      amount: request.amount
    })

    return {
      success: true,
      paymentId: '', // Will be set when saved to database
      paymentReference,
      paymentLink,
      fiservPaymentId,
      expiresAt
    }
  } catch (error) {
    console.error('[STUB] Error creating payment link:', error)
    return {
      success: false,
      paymentId: '',
      paymentReference: '',
      paymentLink: '',
      fiservPaymentId: '',
      expiresAt: new Date(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Mark a payment as paid (stub implementation)
 * In Sprint 4, this will be called by the Fiserv webhook
 */
export async function markPaymentPaid(update: PaymentStatusUpdate): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`[STUB] Marking payment as ${update.status}:`, {
      paymentReference: update.paymentReference,
      fiservPaymentId: update.fiservPaymentId,
      paidDate: update.paidDate
    })

    // In real implementation, this would update the database
    // For now, just log the action
    return {
      success: true
    }
  } catch (error) {
    console.error('[STUB] Error marking payment as paid:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Validate webhook signature (stub implementation)
 * In Sprint 4, this will validate the real Fiserv webhook signature
 */
export async function validateWebhookSignature(payload: string, signature: string): Promise<boolean> {
  try {
    // Stub implementation - always returns true for testing
    // In real implementation, this would validate the Fiserv webhook signature
    console.log('[STUB] Validating webhook signature:', { signature: signature.substring(0, 20) + '...' })
    
    // Simulate validation delay
    await new Promise(resolve => setTimeout(resolve, 100))
    
    return true
  } catch (error) {
    console.error('[STUB] Error validating webhook signature:', error)
    return false
  }
}

/**
 * Process webhook payload (stub implementation)
 * In Sprint 4, this will process real Fiserv webhook data
 */
export async function processWebhookPayload(payload: Record<string, unknown>): Promise<PaymentStatusUpdate | null> {
  try {
    console.log('[STUB] Processing webhook payload:', payload)
    
    // Extract payment information from stub payload with proper type checking
    const paymentReference = (payload.payment_reference || payload.reference) as string
    const fiservPaymentId = (payload.fiserv_payment_id || payload.payment_id) as string
    const status = (payload.status || payload.payment_status) as string
    const paidDate = payload.paid_date && typeof payload.paid_date === 'string' ? new Date(payload.paid_date) : new Date()
    const externalReference = (payload.external_reference || payload.transaction_id) as string

    if (!paymentReference || !fiservPaymentId || !status) {
      throw new Error('Missing required payment fields in webhook payload')
    }

    return {
      paymentReference,
      fiservPaymentId,
      status: status as 'paid' | 'failed' | 'refunded' | 'cancelled',
      paidDate: status === 'paid' ? paidDate : undefined,
      externalReference,
      metadata: payload
    }
  } catch (error) {
    console.error('[STUB] Error processing webhook payload:', error)
    return null
  }
}

/**
 * Generate sample webhook payload for testing
 */
export function generateSampleWebhookPayload(paymentReference: string, status: 'paid' | 'failed' | 'refunded' | 'cancelled' = 'paid') {
  return {
    payment_reference: paymentReference,
    fiserv_payment_id: `FISERV_${Date.now()}_${Math.random().toString(36).substring(2, 11).toUpperCase()}`,
    status: status,
    paid_date: status === 'paid' ? new Date().toISOString() : null,
    external_reference: `EXT_${Date.now()}`,
    amount: 89.99,
    currency: 'USD',
    payment_method: 'credit_card',
    webhook_type: 'payment_status_update',
    timestamp: new Date().toISOString()
  }
}
