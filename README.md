# Wedding Photo Wall

A guest photo submission app for weddings: QR code → camera capture → caption → submit for approval. Public gallery shows only approved photos; admins moderate via Supabase Auth.

## Stack

- **Frontend:** Vite, React, TypeScript, Tailwind, shadcn-style UI, Framer Motion (optional), React Router
- **Backend:** Netlify Functions (submit, gallery, photo, admin CRUD, export)
- **Data:** Supabase (Postgres, Storage, Auth)
- **Abuse control:** Upstash Redis rate limiting, server-side image processing (sharp)

## What you need to do (detailed steps)

Follow these in order. Each subsection is a single task broken into small steps.

---

### Part 1: Supabase project and database

You can use a **new** or an **existing** Supabase project. The migration only adds new tables (`submissions`, `admin_users`) and does not touch your other tables or auth users.

1. **Open your Supabase project**
   - **New project:** Go to [supabase.com](https://supabase.com) → **New project** → set Name, Database password, Region → **Create new project**.
   - **Existing project:** Go to [supabase.com](https://supabase.com), open the project you want to use, and continue from step 2.

2. **Run the database migration**
   - In the Supabase Dashboard, open **SQL Editor** in the left sidebar.
   - Click **New query**.
   - Open the file `supabase/migrations/001_initial.sql` in this repo and copy its entire contents.
   - Paste into the SQL Editor.
   - Click **Run** (or press Cmd/Ctrl+Enter).
   - Confirm there are no errors. You should see “Success. No rows returned” (creating tables returns no rows).
   - The migration uses `create table if not exists`, so it’s safe to run once; if you already ran it, re-running will not duplicate tables. If your project already has tables named `submissions` or `admin_users` from something else, the migration will fail—rename those or use a different project.

3. **Create the two storage buckets**
   - In the left sidebar, go to **Storage**.
   - Click **New bucket**.
   - Name: `wedding-photos`. Leave **Public bucket** unchecked (private). Click **Create bucket**.
   - Click **New bucket** again.
   - Name: `wedding-thumbs`. Leave **Public bucket** unchecked. Click **Create bucket**.

4. **(Optional) Enable Realtime for “New photos” toasts**
   - In the left sidebar, go to **Database** → **Replication** (or **Publication** in some UIs).
   - Find the **supabase_realtime** publication (or the one used for Realtime).
   - Ensure the `submissions` table is included in the publication so the app can subscribe to new approved rows. If you don’t see table toggles, check Supabase docs for “Enable Realtime on a table” for your project version.

5. **Create at least one admin user**
   - Go to **Authentication** → **Users** in the left sidebar.
   - Either **create a new user** (Add user → Create new user, set email/password) or **pick an existing user** you want to use as admin.
   - In the users list, click that user and copy their **User UID** (a UUID like `a1b2c3d4-e5f6-7890-abcd-ef1234567890`).
   - Go back to **SQL Editor** → **New query**.
   - Run (replace the UUID with the one you copied):
     ```sql
     insert into public.admin_users (user_id) values ('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
     ```
   - Click **Run**. You should see “Success. 1 row inserted” (or similar).

6. **Run the app settings migration (approvals toggle)**
   - In the SQL Editor, open **New query**, then open `supabase/migrations/002_app_settings.sql` in this repo and copy its entire contents.
   - Paste into the SQL Editor and click **Run**. This creates the `app_settings` table and default “approvals enabled” so admins can turn approvals on/off later.

---

### Part 2: Get your Supabase keys and URLs

7. **Copy Supabase URL and keys**
   - In the Supabase Dashboard, go to **Project Settings** (gear icon in the left sidebar).
   - Open **API** in the left of the settings page.
   - Copy and save:
     - **Project URL** → you’ll use this as `SUPABASE_URL` and `VITE_SUPABASE_URL`.
     - **anon public** key (under “Project API keys”) → `SUPABASE_ANON_KEY` and `VITE_SUPABASE_ANON_KEY`.
     - **service_role** key (click “Reveal” if needed) → `SUPABASE_SERVICE_ROLE_KEY`. Never commit this or expose it in the frontend.

---

### Part 3: Upstash Redis (for rate limiting)

8. **Create an Upstash Redis database**
   - Go to [upstash.com](https://upstash.com) and sign in (or create an account).
   - In the console, click **Create Database**.
   - Choose **Global** or a region near your Netlify/Supabase region.
   - Name it (e.g. `wedding-photowall-ratelimit`). Click **Create**.
   - Open the database and go to the **REST API** (or “Connect”) section.
   - Copy the **UPSTASH_REDIS_REST_URL** and **UPSTASH_REDIS_REST_TOKEN** and save them for the next part.

---

### Part 4: Generate salts for hashing

9. **Generate two random salts**
   - On your machine, run in a terminal:
     ```bash
     openssl rand -hex 16
     openssl rand -hex 16
     ```
   - Save the first as `IP_HASH_SALT` and the second as `FINGERPRINT_HASH_SALT`. If you don’t have `openssl`, use any secure random string generator (e.g. a password manager “generate password” 32 characters).

---

### Part 5: Environment variables (local and Netlify)

10. **Create a local `.env` file (for running the app and functions locally)**
   - In the project root, copy the example file:
     ```bash
     cp .env.example .env
     ```
   - Edit `.env` and fill in every value (no quotes needed unless the value contains spaces):
     - `SUPABASE_URL` = Project URL from step 6.
     - `SUPABASE_ANON_KEY` = anon key from step 6.
     - `SUPABASE_SERVICE_ROLE_KEY` = service_role key from step 6.
     - `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` = from step 7.
     - `IP_HASH_SALT` and `FINGERPRINT_HASH_SALT` = from step 8.
     - `SUBMISSIONS_ENABLED` = `true` to allow uploads (or `false` to disable).
     - `VITE_SUPABASE_URL` = same as `SUPABASE_URL`.
     - `VITE_SUPABASE_ANON_KEY` = same as `SUPABASE_ANON_KEY`.
   - Save the file. Add `.env` to `.gitignore` if it isn’t already (do not commit secrets).

11. **Install dependencies and run locally**
    - In the project root:
      ```bash
      npm install
      ```
    - To run the app and the Netlify Functions together (so upload/gallery/admin work):
      ```bash
      npm run dev:netlify
      ```
      (The Netlify CLI is a dev dependency—no global install needed. You don’t need a Netlify account or a linked project to run locally; it uses your `.env` and runs everything on your machine.)
    - Open the URL it prints (e.g. `http://localhost:5174`). Try the gallery, upload flow, and admin login with the user you created in step 5.
    - **Test from your phone (same Wi‑Fi):** Run `npm run dev:netlify:host` instead. The terminal will print a **network** URL (e.g. `http://192.168.1.x:5174`). Open that URL on your phone to test the app and camera upload.

---

### Part 6: Deploy to Netlify

12. **Connect the repo to Netlify**
    - Go to [app.netlify.com](https://app.netlify.com) and sign in.
    - Click **Add new site** → **Import an existing project**.
    - Connect your Git provider (GitHub/GitLab/Bitbucket) and select the repository that contains this code.
    - Proceed to the build settings.

13. **Set Netlify build and publish settings**
    - **Build command:** `npm run build`
    - **Publish directory:** `dist`
    - **Functions directory:** `netlify/functions` (or leave default if Netlify auto-detects the `netlify/functions` folder).
    - Click **Deploy site** (or **Save** then trigger a deploy). The first deploy may fail until env vars are set; that’s expected.

14. **Add environment variables in Netlify**
    - In the Netlify site dashboard, go to **Site configuration** → **Environment variables** (or **Site settings** → **Environment variables**).
    - Click **Add a variable** (or **Add environment variable** / **Import from .env`**).
    - Add each of these, one by one, with the same values you used in `.env`:
      - `SUPABASE_URL`
      - `SUPABASE_ANON_KEY`
      - `SUPABASE_SERVICE_ROLE_KEY`
      - `UPSTASH_REDIS_REST_URL`
      - `UPSTASH_REDIS_REST_TOKEN`
      - `IP_HASH_SALT`
      - `FINGERPRINT_HASH_SALT`
      - `SUBMISSIONS_ENABLED` = `true`
      - `VITE_SUPABASE_URL` (same as `SUPABASE_URL`)
      - `VITE_SUPABASE_ANON_KEY` (same as `SUPABASE_ANON_KEY`)
    - Save. Trigger a **Clear cache and deploy site** (or push a new commit) so the new env vars are used.

15. **Verify the deployed site**
    - Open your site URL (e.g. `https://your-site-name.netlify.app`).
    - Check that the gallery loads (may be empty).
    - Go to **Admin** → log in with the admin user from step 5.
    - Submit a test photo from a phone or browser (Upload → take/choose photo → caption → Submit), then approve it in Admin and confirm it appears on the gallery.

---

### Quick reference: env vars

| Variable | Where to get it | Used by |
|----------|-----------------|--------|
| `SUPABASE_URL` | Supabase → Project Settings → API → Project URL | Backend + frontend |
| `SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon public | Backend (auth check) + frontend |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → service_role | Backend only (never in frontend) |
| `UPSTASH_REDIS_REST_URL` | Upstash dashboard → your database → REST API | Backend (rate limit) |
| `UPSTASH_REDIS_REST_TOKEN` | Same as above | Backend (rate limit) |
| `IP_HASH_SALT` | `openssl rand -hex 16` | Backend (hash IPs) |
| `FINGERPRINT_HASH_SALT` | `openssl rand -hex 16` | Backend (hash fingerprint) |
| `SUBMISSIONS_ENABLED` | Set to `true` or `false` | Backend (kill switch) |
| `VITE_SUPABASE_URL` | Same as `SUPABASE_URL` | Frontend build |
| `VITE_SUPABASE_ANON_KEY` | Same as `SUPABASE_ANON_KEY` | Frontend build |

## Routes

- `/` – Gallery (approved photos) + Upload / Admin buttons
- `/upload` – Camera capture → preview → caption → submit
- `/p/:id` – Single photo view
- `/admin` – Admin dashboard (requires login)
- `/admin/login` – Email/password login

## Admin approvals toggle

On the admin dashboard, a checkbox **Approvals on** (admin-only) lets you enable or disable approving and rejecting submissions. When unchecked, Approve/Reject are disabled in the UI and the backend returns 503 for approve/reject requests, so you can turn approvals off later in the night without logging out. The setting is stored in Supabase `app_settings` and shared for all admins.

## Testing

- **Unit tests** (Vitest + React Testing Library): `npm run test` or `npm run test:watch`
- **E2E tests** (Playwright): `npm run test:e2e`. Use `npm run test:e2e:headed` to run with a visible browser (Chromium with stability options). For Google Chrome instead, run `npx playwright test --project=chrome-headed`. Use `npm run test:e2e:ui` for the Playwright UI. Playwright starts the Vite dev server on port 8888 by default (or use Netlify with `PLAYWRIGHT_USE_NETLIFY=1`). If that port is in use, start the app yourself with `npm run dev:e2e` in one terminal, then run the test command in another.
- **All tests**: `npm run test:all`
- Install Playwright browsers once: `npx playwright install`

## Security notes

- All writes (submissions, storage) go through Netlify Functions with the service role; the frontend never writes directly to Supabase.
- Submissions are rate-limited by IP (and optionally by device/fingerprint).
- Images are validated, resized, EXIF-stripped, and re-encoded server-side.
- Storage buckets are private; the app uses signed URLs for display.

## Wedding day checklist

- Set `SUBMISSIONS_ENABLED=true`.
- Confirm at least one admin can log in.
- If needed, turn off submissions with `SUBMISSIONS_ENABLED=false`.
