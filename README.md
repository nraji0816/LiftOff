# Liftoff

Name something in the category. Basic answers stay on the ground. Niche answers launch your rocket to space.

Daily Flight (7 shared prompts a day) and Unlimited mode, a live public leaderboard, badges, and an AI judge. Every answer is scored on the server, so the leaderboard can't be faked from the browser.

## What you need

| Service | What it does | Cost |
|---|---|---|
| [Vercel](https://vercel.com) | Hosts the site and runs the small server functions in `api/` | Free Hobby plan (for non-commercial use) |
| [Supabase](https://supabase.com) | Database for pilots, flights, the leaderboard and daily prompts | Free plan |
| [Anthropic API](https://console.anthropic.com) | Claude writes prompts and judges answers | Pay per use. Check current prices at anthropic.com/pricing |
| [GitHub](https://github.com) | Holds the code so Vercel can deploy it | Free |

About 15 to 20 minutes the first time.

## Deploy

### 1. Supabase (database)
1. Sign up at supabase.com and click **New project**. Pick a name and a database password, and choose the region closest to your players.
2. When it's ready, open **SQL Editor**, click **New query**, paste everything in `supabase/schema.sql`, and click **Run**. You should see "Success".
3. Open **Project Settings → API** (in newer dashboards: **Project Settings → Data API** and **API Keys**) and copy two things:
   - the **Project URL** (looks like `https://abcd1234.supabase.co`)
   - the **service_role** secret key. Keep this secret. It only ever goes into Vercel, never into the page.

### 2. Anthropic (AI judge)
1. Sign up at console.anthropic.com, add billing, and create an API key under **API Keys**.
2. Set a monthly spend limit in the Console under **Limits**. That is your hard cap on cost.

### 3. GitHub (code)
1. Create a new repository (it can be private), for example `liftoff`.
2. Click **Add file → Upload files** and drag in everything from this folder, including `api/`, `supabase/`, `index.html`, `package.json` and `vercel.json`. Commit.

### 4. Vercel (go live)
1. Sign up at vercel.com with your GitHub account and click **Add New → Project**, then import the `liftoff` repo.
2. Framework preset: **Other**. Leave the build settings empty.
3. Open **Environment Variables** and add:
   - `SUPABASE_URL` = your Project URL
   - `SUPABASE_SERVICE_ROLE_KEY` = your service_role key
   - `ANTHROPIC_API_KEY` = your Anthropic key
4. Click **Deploy**. In about a minute you get a public address like `liftoff-yourname.vercel.app`. Anyone can open it, play, and land on the leaderboard.
5. Optional: under **Settings → Domains**, connect your own domain (bought from any registrar).

To update the game later, change files in the GitHub repo. Vercel redeploys automatically.

## Keeping costs in check

Claude is called only when it's needed:
- **Prompts:** one call writes 8 prompts for an Unlimited flight. Daily prompts are written once per day for everyone.
- **Answer lists:** written once per prompt, then cached in the database and reused for every player.
- **Judging:** answers on the cached list are scored instantly with no AI call. Only unusual answers go to Claude.

Built-in limits (change them with environment variables on Vercel):
- `MAX_AI_CALLS_PER_DAY` (default 4000): after this, the game keeps working on the cached lists and built-in prompts until the next day.
- `MAX_REQUESTS_PER_IP_PER_DAY` (default 1500) and `MAX_RUNS_PER_PLAYER_PER_DAY` (default 60) slow down spam.
- `ANTHROPIC_MODEL` (default `claude-haiku-5-5`): the fast, low-cost model.

Your Anthropic spend limit is the final backstop.

## Try it on your computer first (optional)

You need Node.js 18 or newer.

```
npm run dev
```

Then open http://localhost:3000. With no keys it runs in **demo mode**: data lives in memory and prompts come from the built-in list. To test against your real services, copy `.env.example` to `.env` and fill it in.

## How it works

- `index.html` is the whole game.
- `api/` holds the server functions:
  - `player` and `me` create anonymous pilots and handle names. Each browser gets a pilot id and secret token, with no sign-up.
  - `daily` serves today's shared prompts.
  - `run-start` begins a flight. Only one Daily Flight is allowed per pilot per day.
  - `prompts` serves fresh Unlimited prompts.
  - `list` serves the answer list used for spelling checks.
  - `judge` scores each answer and updates the flight.
  - `run-end` saves the flight to the pilot's record.
  - `leaderboard` lists every pilot.
- `supabase/schema.sql` creates the tables. Row level security is on, so only the server can read or write.

## Good to know

- Pilots are tied to a browser. Clearing site data or switching devices starts a new pilot.
- Board names are cleaned of odd characters but not filtered for profanity. You can rename or delete rows in Supabase under **Table Editor → players**.
- The Daily Flight resets at midnight UTC.
