# CallieTools

School and personal calendars — synced by Callie ✨

## Architecture

- **Framework:** Next.js 14 (App Router)
- **Data:** Google Sheets API (service account)
- **Hosting:** Vercel
- **ICS feeds:** Server-rendered at `/api/ics/[id].ics` (also accessible via `/ics/[id].ics` rewrite)

## Local Development

```bash
npm install
npm run dev
```

Without Google credentials configured, the app uses mock data automatically. Visit `http://localhost:3000/calendar/CCPS25-26` to see the calendar page.

## Google Sheets Setup

### 1. Create a Google Cloud project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (e.g., "CallieTools")
3. Enable the **Google Sheets API** (APIs & Services → Library → search "Google Sheets API" → Enable)

### 2. Create a service account

1. Go to APIs & Services → Credentials → Create Credentials → Service Account
2. Name it (e.g., "callie-sheets")
3. Skip the optional permissions steps
4. Click into the service account → Keys → Add Key → Create new key → JSON
5. Download the JSON file — you'll need `client_email` and `private_key`

### 3. Share your spreadsheet

1. Open your Google Sheet
2. Click Share
3. Add the service account email (from the JSON file, looks like `callie-sheets@your-project.iam.gserviceaccount.com`)
4. Give it **Viewer** access

### 4. Configure environment variables

Copy `.env.example` to `.env.local` and fill in:

```
GOOGLE_SERVICE_ACCOUNT_EMAIL=callie-sheets@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SPREADSHEET_ID=144xjYUNy8A1sgoEkluoOBJp1SySQteoCqYzXo7-38Eg
```

**Important:** The private key must be on one line with `\n` for newlines (this is how Vercel stores it too).

### Spreadsheet format

**Calendars tab** (columns A–D):
| id | name | tier | last_updated |
|---|---|---|---|
| CCPS25-26 | CCPS Traditional Calendar 2025-2026 | free | 2025-06-01 |

**Events tab** (columns A–H):
| calendar_id | title | start_date | start_time | end_date | end_time | location | description |
|---|---|---|---|---|---|---|---|
| CCPS25-26 | First Day of School | 2025-09-02 | | 2025-09-02 | | | |

## Deploy to Vercel

1. Push to GitHub
2. Import the repo in [Vercel](https://vercel.com/new)
3. Add the environment variables from `.env.example` in Vercel project settings
4. Deploy

### Domain setup

1. In Vercel → Project Settings → Domains, add `callietools.com`
2. Update your domain's DNS as instructed by Vercel
3. Update `NEXT_PUBLIC_SITE_URL` to `https://callietools.com`

## URL Structure

| Path | Description |
|---|---|
| `/` | Homepage with school list |
| `/calendar/[id]` | Calendar subscribe page |
| `/calendar-concierge` | Concierge landing page |
| `/support` | Support / tip jar |
| `/api/calendar/[id]` | JSON calendar metadata |
| `/api/events/[id]` | JSON events list |
| `/api/ics/[id].ics` | ICS calendar feed |
| `/ics/[id].ics` | ICS feed (rewrite to API) |
