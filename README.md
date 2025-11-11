# AI Gym 24/7 - Phase 1 Backend

A Next.js backend system that integrates with Monday.com to manage gym members and contracts through webhooks and provides REST API endpoints for data access.

## Features

- **Monday.com Integration**: Receives webhooks for real-time data synchronization
- **Member Management**: Track gym members with contact information and status
- **Contract Management**: Manage membership contracts with pricing and dates
- **Payment Tracking**: Record and monitor payment transactions
- **Class Scheduling**: Manage gym classes with booking system
- **REST API**: Full CRUD operations with pagination and filtering
- **Webhook Logging**: Monitor and debug webhook events
- **Statistics Dashboard**: Get insights on members, contracts, payments, and classes

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (ready for admin features)
- **TypeScript**: Full type safety
- **Deployment**: Vercel

## Quick Start

### Prerequisites

- Node.js 18+
- Supabase account
- Monday.com account with webhook access

### Installation

1. Clone and install dependencies:
\`\`\`bash
git clone <your-repo>
cd ai-gym-247
npm install
\`\`\`

2. Set up Supabase integration in Vercel project settings

3. Run the database migration:
\`\`\`bash
# Execute the SQL script in your Supabase dashboard or via v0
scripts/001_create_gym_tables.sql
\`\`\`

4. Configure Monday.com webhooks (see [Monday.com Setup](#mondaycom-setup))

5. Start development server:
\`\`\`bash
npm run dev
\`\`\`

## API Endpoints

### Members

- `GET /api/members` - List all members with pagination and filtering
- `GET /api/members/[id]` - Get member details with contracts

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (max: 100, default: 50)
- `status` - Filter by status (active, inactive)
- `search` - Search by name or email

### Contracts

- `GET /api/contracts` - List all contracts with member details
- `GET /api/contracts/[id]` - Get contract details with member info
- `POST /api/contracts` - Create new contract

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (max: 100, default: 50)
- `status` - Filter by status (active, inactive)
- `member_id` - Filter by member ID
- `contract_type` - Search by contract type

### Payments

- `GET /api/payments` - List all payment transactions
- `POST /api/payments` - Record new payment

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (max: 100, default: 50)
- `status` - Filter by status (completed, pending, failed)
- `member_id` - Filter by member ID
- `payment_method` - Filter by payment method

### Schedule

- `GET /api/schedule` - List all scheduled classes
- `POST /api/schedule` - Create new class

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (max: 100, default: 50)
- `class_type` - Filter by class type
- `status` - Filter by status (scheduled, cancelled, completed)
- `date` - Filter by specific date

### Bookings

- `GET /api/bookings` - List all class bookings
- `POST /api/bookings` - Create new booking

### Statistics

- `GET /api/stats` - Get dashboard statistics

**Response:**
\`\`\`json
{
  "success": true,
  "data": {
    "members": {
      "total": 150,
      "active": 142,
      "inactive": 8
    },
    "contracts": {
      "total": 180,
      "active": 165,
      "inactive": 15
    },
    "revenue": {
      "monthly": 12500.00,
      "currency": "USD"
    },
    "recentActivity": [...]
  }
}
\`\`\`

### Webhook Logs

- `GET /api/webhook-logs` - Monitor webhook events

**Query Parameters:**
- `page` - Page number
- `limit` - Items per page
- `webhook_type` - Filter by event type
- `status` - Filter by processing status

### Webhooks

- `POST /api/webhook/monday` - Monday.com webhook endpoint

## Monday.com Setup

### 1. Board Configuration

Create two boards in Monday.com:

**Members Board:**
- Name column (default)
- Email column (Email type)
- Phone column (Phone type)
- Status column (Status type: Active, Inactive)

**Contracts Board:**
- Contract Type column (Text)
- Member column (Connect to Members board)
- Start Date column (Date type)
- End Date column (Date type)
- Monthly Fee column (Numbers type)
- Status column (Status type: Active, Inactive, Expired)

### 2. Webhook Setup

1. Go to Monday.com Developer Center
2. Create a new app or use existing
3. Add webhook integrations:

**For Members Board:**
\`\`\`
Webhook URL: https://your-domain.vercel.app/api/webhook/monday
Events: Item created, Column value changed
Board ID: [Your Members Board ID]
\`\`\`

**For Contracts Board:**
\`\`\`
Webhook URL: https://your-domain.vercel.app/api/webhook/monday
Events: Item created, Column value changed
Board ID: [Your Contracts Board ID]
\`\`\`

### 3. Update Configuration

Update the board IDs in `/app/api/webhook/monday/route.ts`:

\`\`\`typescript
const MEMBERS_BOARD_ID = 123456789; // Replace with your Members board ID
const CONTRACTS_BOARD_ID = 987654321; // Replace with your Contracts board ID
\`\`\`

## Database Schema

### Members Table
\`\`\`sql
- id (UUID, Primary Key)
- monday_member_id (Text, Unique)
- name (Text, Required)
- email (Text)
- phone (Text)
- status (Text, Default: 'active')
- created_at (Timestamp)
- updated_at (Timestamp)
\`\`\`

### Contracts Table
\`\`\`sql
- id (UUID, Primary Key)
- monday_contract_id (Text, Unique)
- member_id (UUID, Foreign Key to members)
- contract_type (Text, Required)
- start_date (Date)
- end_date (Date)
- monthly_fee (Decimal)
- status (Text, Default: 'active')
- created_at (Timestamp)
- updated_at (Timestamp)
\`\`\`

### Webhook Log Table
\`\`\`sql
- id (UUID, Primary Key)
- webhook_type (Text, Required)
- payload (JSONB, Required)
- processed_at (Timestamp)
- status (Text, Default: 'received')
- error_message (Text)
\`\`\`

### Payments Table
\`\`\`sql
- id (UUID, Primary Key)
- contract_id (UUID, Foreign Key to contracts)
- member_id (UUID, Foreign Key to members)
- amount (Decimal, Required)
- payment_date (Date, Required)
- payment_method (Text, Default: 'credit_card')
- status (Text, Default: 'completed')
- transaction_id (Text)
- notes (Text)
- created_at (Timestamp)
- updated_at (Timestamp)
\`\`\`

### Schedule Table
\`\`\`sql
- id (UUID, Primary Key)
- class_name (Text, Required)
- instructor (Text)
- class_type (Text, Required)
- start_time (Timestamp, Required)
- end_time (Timestamp, Required)
- max_capacity (Integer, Default: 20)
- current_bookings (Integer, Default: 0)
- status (Text, Default: 'scheduled')
- description (Text)
- created_at (Timestamp)
- updated_at (Timestamp)
\`\`\`

### Bookings Table
\`\`\`sql
- id (UUID, Primary Key)
- schedule_id (UUID, Foreign Key to schedule)
- member_id (UUID, Foreign Key to members)
- booking_date (Timestamp, Default: NOW())
- status (Text, Default: 'confirmed')
- notes (Text)
- created_at (Timestamp)
\`\`\`

## Security

- **Row Level Security (RLS)**: Enabled on all tables
- **Public Access**: Currently configured for webhook access
- **Future**: Ready for admin authentication integration

## Monitoring

- All webhook events are logged to `webhook_log` table
- API includes comprehensive error handling
- Console logging for debugging (search for `[v0]` prefix)

## Deployment

1. Push to GitHub
2. Connect to Vercel
3. Add Supabase integration in Vercel project settings
4. Deploy automatically

## Next Steps (Phase 2)

- Admin dashboard UI
- Member authentication
- Payment processing integration
- Advanced reporting
- Mobile app API extensions

## Support

For issues or questions:
1. Check webhook logs via `/api/webhook-logs`
2. Monitor Vercel function logs
3. Verify Monday.com webhook configuration
4. Check Supabase database connectivity
