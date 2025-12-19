# BlckBx Partnerships Portal

A modern, stylish partnerships pipeline management system built with Next.js, Supabase, and Airtable integration. Self-hostable on Coolify.

![BlckBx Partnerships Portal](https://via.placeholder.com/800x400/1C1D1F/F5F3F0?text=BlckBx+Partnerships+Portal)

## Features

### Dashboard
- **Pipeline Overview** - Visual pie chart showing leads, negotiation, and signed partners
- **Leadership Summary** - Weekly stats including new leads, partners in negotiation, signed deals
- **Negotiation Funnel** - Bar chart showing progression through contacted → call booked → call had → contract sent
- **Recent Activity** - Timeline of recent partner updates
- **Time Tracking** - Average days to sign displayed prominently

### Partner Management
- **Multiple Views** - Leads, Negotiation, Signed, and All Partners tabs
- **Excel-like Interface** - Inline editing, sorting, and searching
- **Move Buttons** - One-click transitions between pipeline stages:
  - Leads → "Move to Negotiation"
  - Negotiation → "Move to Signed"
  - Signed → "Send to Core" (syncs to Airtable)

### Data Tracking
- **Automatic Timestamps** - Created date recorded on entry
- **Signed Timestamp** - Recorded when moved to Signed status
- **Days in Pipeline** - Calculated field showing how long each partner has been in the system
- **Negotiation Progress** - Checkboxes for Contacted, Call Booked, Call Had, Contract Sent

### Airtable Integration
- **Send to Core** button pushes signed partners to Airtable
- All partner data synced including time-to-sign metrics

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS with custom BlckBx theme
- **Animations**: Framer Motion
- **Charts**: Recharts
- **Database**: Supabase (PostgreSQL)
- **External Sync**: Airtable API
- **Deployment**: Docker / Coolify

## Color Scheme

| Color | Hex | Usage |
|-------|-----|-------|
| Base Black | `#1C1D1F` | Primary background, text |
| Sand | `#F5F3F0` | Light backgrounds |
| Dark Sand | `#E8E5E0` | Borders, hover states |
| CTA | `#6B1488` | Buttons, accents |
| Alert | `#FFBB95` | Warnings, leads indicator |

## Setup Instructions

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd partnerships-portal
npm install
```

### 2. Configure Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the contents of `supabase-schema.sql`
3. Go to Settings → API and copy your URL and anon key

### 3. Configure Airtable

1. Create a new base in Airtable
2. Create a table called "Partners" with these fields:
   - Partner (Single line text)
   - Lifestyle Category (Single select)
   - Contact Name (Single line text)
   - Position (Single line text)
   - Contact Number (Phone)
   - Email (Email)
   - Opportunity Type (Single select: "Big Ticket", "Everyday")
   - Partnership Link (URL)
   - Status (Single select)
   - Created At (Date)
   - Signed At (Date)
   - Days to Sign (Number)

3. Get your API key from [airtable.com/account](https://airtable.com/account)
4. Get your Base ID from the API documentation

### 4. Environment Variables

Create a `.env.local` file:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Airtable
AIRTABLE_API_KEY=your-api-key
AIRTABLE_BASE_ID=your-base-id
AIRTABLE_TABLE_NAME=Partners
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deployment to Coolify

### Option 1: Docker (Recommended)

1. Push your code to a Git repository
2. In Coolify, create a new service and select your repo
3. Choose "Dockerfile" as the build method
4. Add environment variables in Coolify's UI
5. Deploy!

### Option 2: Nixpacks

Coolify will auto-detect Next.js and use Nixpacks. Just add your environment variables.

### Environment Variables in Coolify

Add these in your Coolify service settings:

```
NEXT_PUBLIC_SUPABASE_URL=<your-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-key>
AIRTABLE_API_KEY=<your-key>
AIRTABLE_BASE_ID=<your-base-id>
AIRTABLE_TABLE_NAME=Partners
```

## Project Structure

```
partnerships-portal/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── airtable/
│   │   │       └── route.ts      # Airtable sync endpoint
│   │   ├── globals.css           # Global styles
│   │   ├── layout.tsx            # Root layout
│   │   └── page.tsx              # Main page component
│   ├── components/
│   │   ├── AddPartnerModal.tsx   # Add partner form
│   │   ├── Dashboard.tsx         # Dashboard with charts
│   │   ├── PartnerTable.tsx      # Excel-like data table
│   │   └── Sidebar.tsx           # Navigation sidebar
│   ├── lib/
│   │   ├── airtable.ts           # Airtable integration
│   │   └── supabase.ts           # Supabase client & queries
│   └── types/
│       └── index.ts              # TypeScript types
├── supabase-schema.sql           # Database schema
├── Dockerfile                    # Docker build config
├── tailwind.config.js            # Tailwind with BlckBx colors
└── package.json
```

## Usage Guide

### Adding a Partner
1. Navigate to any tab (Leads, Negotiation, Signed, All)
2. Click "Add Partner" button
3. Fill in the required fields
4. Select the initial status
5. Click "Add Partner"

### Moving Partners Through Pipeline
1. In Leads tab: Click "To Negotiation" to move partner
2. In Negotiation tab: Check progress boxes as you go
3. Click "To Signed" when ready
4. In Signed tab: Click "Send to Core" to sync to Airtable

### Editing Partners
1. Click the edit (pencil) icon on any row
2. Modify fields inline
3. Click the checkmark to save or X to cancel

### Viewing Stats
- Dashboard shows weekly leadership summary
- Pie chart shows pipeline distribution
- Bar chart shows negotiation funnel progress
- Days column shows time in pipeline for each partner

## Demo Mode

The portal includes mock data that runs without Supabase configured. This is useful for:
- Trying out the interface
- Development and testing
- Demonstrations

To use real data, configure your Supabase environment variables.

## License

Proprietary - BlckBx Ltd. All rights reserved.
