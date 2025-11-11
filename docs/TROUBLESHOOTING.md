# Troubleshooting Guide

## Common Issues

### 1. Webhook Not Receiving Data

**Symptoms:**
- No new members/contracts appearing
- Webhook logs show no recent activity

**Solutions:**
1. Verify webhook URL in Monday.com:
   \`\`\`
   https://your-domain.vercel.app/api/webhook/monday
   \`\`\`

2. Check Monday.com webhook status in Developer Center

3. Verify board IDs in `/app/api/webhook/monday/route.ts`:
   \`\`\`typescript
   const MEMBERS_BOARD_ID = 123456789; // Your actual board ID
   const CONTRACTS_BOARD_ID = 987654321; // Your actual board ID
   \`\`\`

4. Test webhook manually:
   \`\`\`bash
   curl -X POST https://your-domain.vercel.app/api/webhook/monday \
     -H "Content-Type: application/json" \
     -d '{"type":"create_pulse","boardId":123456789,"pulseId":1,"pulseName":"Test"}'
   \`\`\`

### 2. Database Connection Issues

**Symptoms:**
- API returns 500 errors
- "Failed to fetch" messages

**Solutions:**
1. Verify Supabase integration in Vercel project settings
2. Check environment variables are set:
   - `SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. Run database migration script:
   \`\`\`sql
   -- Execute in Supabase SQL editor
   scripts/001_create_gym_tables.sql
   \`\`\`

### 3. Data Not Updating

**Symptoms:**
- Webhook receives data but database doesn't update
- Members/contracts show old information

**Solutions:**
1. Check webhook logs:
   \`\`\`
   GET /api/webhook-logs?status=error
   \`\`\`

2. Verify column mapping in webhook handler matches your Monday.com setup

3. Check Monday.com column IDs match the handler:
   \`\`\`typescript
   switch (payload.columnId) {
     case 'email': // This should match your Monday.com column ID
     case 'phone': // This should match your Monday.com column ID
     // ...
   }
   \`\`\`

### 4. API Pagination Issues

**Symptoms:**
- Missing data in API responses
- Incorrect total counts

**Solutions:**
1. Verify query parameters:
   \`\`\`
   /api/members?page=1&limit=50
   \`\`\`

2. Check for RLS policy conflicts in Supabase

3. Ensure proper indexing on filtered columns

### 5. Monday.com Column Mapping

**Common Column Types and Values:**

\`\`\`typescript
// Email column
{
  "email": {
    "email": "user@example.com",
    "text": "user@example.com"
  }
}

// Phone column
{
  "phone": "+1234567890"
}

// Status column
{
  "label": {
    "index": 0,
    "text": "Active"
  }
}

// Date column
{
  "date": {
    "date": "2024-01-15",
    "time": "10:30:00"
  }
}

// Numbers column
{
  "numbers": "99.99"
}

// Text column
{
  "text": "Premium Membership"
}
\`\`\`

## Debugging Steps

### 1. Enable Detailed Logging

Add console logs to webhook handler:

\`\`\`typescript
console.log('[DEBUG] Full payload:', JSON.stringify(payload, null, 2));
console.log('[DEBUG] Column ID:', payload.columnId);
console.log('[DEBUG] Column Value:', JSON.stringify(payload.value, null, 2));
\`\`\`

### 2. Check Webhook Logs

\`\`\`bash
# Get recent webhook activity
curl https://your-domain.vercel.app/api/webhook-logs?limit=10

# Filter by errors
curl https://your-domain.vercel.app/api/webhook-logs?status=error
\`\`\`

### 3. Verify Database State

\`\`\`sql
-- Check recent members
SELECT * FROM members ORDER BY created_at DESC LIMIT 10;

-- Check recent contracts
SELECT * FROM contracts ORDER BY created_at DESC LIMIT 10;

-- Check webhook logs
SELECT * FROM webhook_log ORDER BY processed_at DESC LIMIT 10;
\`\`\`

### 4. Test API Endpoints

\`\`\`bash
# Test members endpoint
curl https://your-domain.vercel.app/api/members

# Test stats endpoint
curl https://your-domain.vercel.app/api/stats

# Test specific member
curl https://your-domain.vercel.app/api/members/[member-id]
\`\`\`

## Performance Optimization

### 1. Database Indexes

Ensure these indexes exist:
\`\`\`sql
CREATE INDEX IF NOT EXISTS idx_members_monday_id ON members(monday_member_id);
CREATE INDEX IF NOT EXISTS idx_contracts_monday_id ON contracts(monday_contract_id);
CREATE INDEX IF NOT EXISTS idx_contracts_member_id ON contracts(member_id);
\`\`\`

### 2. API Rate Limiting

Consider implementing rate limiting for webhook endpoint:
\`\`\`typescript
// Add to webhook handler
const rateLimiter = new Map();
const RATE_LIMIT = 100; // requests per minute
\`\`\`

### 3. Webhook Deduplication

Add deduplication logic:
\`\`\`typescript
// Check if webhook already processed
const existingLog = await supabase
  .from('webhook_log')
  .select('id')
  .eq('payload->originalTriggerUuid', payload.originalTriggerUuid)
  .single();

if (existingLog.data) {
  return NextResponse.json({ success: true, message: 'Already processed' });
}
\`\`\`

## Getting Help

1. Check Vercel function logs in dashboard
2. Monitor Supabase logs in dashboard
3. Verify Monday.com webhook delivery status
4. Review API response codes and error messages
