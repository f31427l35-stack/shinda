# Promo Draw Admin — USSD Free-Entry Prize Draw

A Next.js app (deployable entirely on Vercel) for running a free-to-enter
USSD prize draw: listeners dial a short code, enter a keyword announced on
air, and are logged as entries. Admins log into a dashboard to manage
campaigns, view entries, and randomly draw N winners.

No money changes hands anywhere in this app — entry is free, and prizes are
handled by you outside the system (announced on air, delivered manually).

## 1. Database setup

1. In your Vercel project, go to **Storage → Create Database → Postgres**
   (this is Neon under the hood) and attach it to this project.
2. Pull the env vars locally: `vercel env pull .env.local`
3. Run the schema against your database:
   ```
   psql "$POSTGRES_URL" -f db/schema.sql
   ```
   (or paste the contents of `db/schema.sql` into the Vercel Postgres
   dashboard's query editor)
4. Set `SESSION_SECRET` in your Vercel project's Environment Variables
   (Settings → Environment Variables) — any long random string, e.g. output
   of `openssl rand -base64 32`.
5. Create your first admin login:
   ```
   node db/seed-admin.mjs "Your Name" "you@example.com" "a-strong-password"
   ```

## 2. Local development

```
npm install
npm run dev
```

Visit `http://localhost:3000`, sign in with the admin account you seeded.

## 3. Deploy to Vercel

```
vercel deploy --prod
```

Or connect the GitHub repo in the Vercel dashboard for automatic deploys.

## 4. Connect OnfonMedia to your USSD webhook

Your webhook endpoint is:

```
https://<your-vercel-domain>/api/ussd
```

In your OnfonMedia dashboard, set this as the **callback/endpoint URL** for
your USSD code.

**Important — check the payload format Onfon actually sends you.** Onfon's
exact field names and response format vary slightly by account and how your
short code was provisioned. The webhook at `src/app/api/ussd/route.ts` is
built around Onfon's common `{ USERID, MSISDN, SESSIONID, INPUT, NEWREQUEST }`
request shape and responds with `{ USERID, MSISDN, MSG, MSGTYPE }` (where
`MSGTYPE: true` means "show another screen" and `false` means "end
session"). Onfon's dashboard has a sample payload for your specific code —
compare it against the `OnfonPayload` type at the top of that file and adjust
field names if they differ. If your integration instead expects plain text
`CON`/`END` responses (Africa's Talking style), there's a commented
alternate `respond()` implementation in the same file — swap to it.

Test the flow by dialing your USSD code from a phone once it's live, or ask
Onfon support for their simulator/test tool.

## 5. Running a campaign on air

1. Log into `/dashboard/campaigns`
2. Create a campaign with a name, a keyword (e.g. `WIN`), and a prize
   description
3. It's automatically set active (only one campaign is active at a time —
   creating a new active one deactivates the previous one)
4. Announce the keyword on air; listeners dial your USSD code and enter it
5. Watch entries roll in live on `/dashboard/entries` and
   `/dashboard` (charts)
6. When ready, go to Campaigns, set how many winners to draw, and click
   **Pick winners** — this randomly selects that many *distinct phone
   numbers* from valid entries (no repeats, and previous winners of the same
   campaign are excluded from being drawn again)
7. Winners appear on `/dashboard/winners` with a timestamp and who picked
   them

## Notes on the data model

- **Unlimited entries per number** — a listener can enter as many times as
  they want; each USSD session that submits the correct keyword logs a new
  row in `entries`. Winner selection only draws from *distinct* phone
  numbers, so entering many times doesn't multiply your odds in the current
  implementation. If you'd rather have entering more times increase a
  listener's chances, that's a one-line change in the winner-picking query
  (draw from all entry rows instead of `DISTINCT ON` phone number) — say the
  word and I'll adjust it.
- **Roles**: `admin` can manage users and everything else; `presenter` can
  run campaigns and view entries/winners but not manage other user accounts.
