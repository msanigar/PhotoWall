# Photo Wall – project context & deployment notes

This file lives with the code so you can move the project (e.g. into your GitHub directory) and still have context for production deployment and future changes. When the repo is connected to Netlify, use the main [README.md](./README.md) plus this file (and Netlify’s deploy docs) for prod.

---

## Project summary

- **App:** Wedding photo wall – guests submit photos via camera/capture; admins approve; public gallery shows approved only.
- **Stack:** Vite + React + TypeScript, Netlify Functions, Supabase (Postgres, Storage, Auth), Upstash Redis (rate limit).
- **Notable features:** Admin approvals toggle (on/off), E2E + unit tests (Vitest, Playwright), app settings in DB (`app_settings` / `approvals_enabled`).

---

## Local dev (what we set up)

- **Command:** `npm run dev:netlify`
- **URL:** **http://localhost:5174** (Netlify Dev listens here and proxies app to Vite on 5175).
- **Why 5174:** Netlify CLI opens the browser to its own port; we set that to 5174 so the opened URL works. Vite runs on 5175 behind the proxy.
- **Config:** `netlify.toml` → `[dev]` with `port = 5174`, `targetPort = 5175`, command `npm run dev:netlify:vite`.
- **Proxy / “Could not proxy request”:** Fixed by dedicated ports and a Vite plugin so HTML isn’t parsed as JS when the proxy sends index.html with module-like headers.
- **Phone testing:** `npm run dev:netlify:host` → use the printed network URL (e.g. `http://192.168.x.x:5174`).

---

## Production deployment (Netlify)

1. **Push this project to GitHub** (e.g. into your usual GitHub directory).
2. **Connect repo in Netlify:** Add new site → Import from Git → choose the repo.
3. **Build settings:** Build command `npm run build`, Publish directory `dist`, Functions from `netlify/functions` (usually auto-detected).
4. **Environment variables in Netlify:** Set the same vars as in `.env` (see README table). **Use different values for the two hash salts in production** – generate new ones with `openssl rand -hex 16` and set `IP_HASH_SALT` and `FINGERPRINT_HASH_SALT` only in Netlify; keep your current values in local `.env` for dev.
5. **Supabase:** Run both migrations (`001_initial.sql`, `002_app_settings.sql`) in the Supabase project you use for prod. Create admin user(s) and storage buckets as in README.
6. **After first deploy:** Open the site URL, test gallery, admin login, upload flow, and the approvals toggle.

---

## Handy references

- **README.md** – Full setup (Supabase, Upstash, env vars, deploy steps).
- **.env.example** – List of required env vars (no secrets).
- **Netlify env vars:** Site configuration → Environment variables. Mark secrets as sensitive where possible.
- **Salts:** Different per environment; never commit real values.

---

## If you need help again

Open this project in Cursor (from its new location, e.g. your GitHub clone) and say you’re ready for prod deployment or need help with Netlify. This file gives the model context about the app, local setup, and prod checklist.
