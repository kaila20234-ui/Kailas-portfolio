# Portfolio — Full-Stack (Node.js + TypeScript + HTML/CSS)

A developer portfolio with a real backend: a TypeScript/Express API serves your
projects and experience data, handles contact form submissions, and includes
a password-protected admin dashboard for adding/editing content without
touching code. The public frontend is plain HTML/CSS/JS that fetches from
the API — no build step needed on the frontend.

## Stack

- **Backend:** Node.js, TypeScript, Express, express-session, bcryptjs, multer
- **Frontend:** HTML5, CSS3, vanilla JavaScript (fetch API)
- **Data:** MongoDB stores projects, experience, contact messages, and profile asset URLs.
   Uploaded files remain in `public/uploads/`.

## Project structure

```
portfolio-fullstack/
├── src/                        # TypeScript backend source
│   ├── server.ts               # Express app entrypoint + session setup
│   ├── middleware/
│   │   └── auth.ts             # requireAuth — guards admin pages & admin API
│   ├── routes/
│   │   ├── portfolio.route.ts  # GET /api/projects, GET /api/experience (public)
│   │   ├── contact.route.ts    # POST /api/contact (public, validates + stores)
│   │   ├── auth.route.ts       # GET/POST /admin/login, POST /admin/logout
│   │   └── admin.route.ts      # GET /admin + protected CRUD & upload routes
│   ├── data/
│   │   ├── seed.ts             # First-run seed content only
│   │   └── store.ts            # MongoDB persistence and JSON import
│   └── types/
│       ├── index.ts            # Shared TypeScript interfaces
│       └── session.d.ts        # Adds isAdmin to express-session's types
├── views/                       # Admin HTML, rendered by the login/dashboard routes
│   ├── admin-login.html         # login is public; dashboard requires authentication
│   └── admin-dashboard.html
├── admin/
│   └── admin.css                # Served at /admin-assets/admin.css, outside public/
├── public/                     # Static frontend, served by Express
│   ├── index.html
│   ├── css/style.css
│   ├── js/main.js              # Fetches data from the API, handles the contact form
│   └── uploads/                # Uploaded photos/resumes land here
├── scripts/
│   └── hash-password.ts        # CLI to generate your admin password hash
├── package.json
├── tsconfig.json
└── .env.example
```

## Getting started

```bash
npm install
cp .env.example .env
```

Start a local MongoDB server, or replace `MONGODB_URI` in `.env` with your MongoDB Atlas
connection string. On first startup, existing data in `data/db.json` is imported into
empty MongoDB collections; seed data is used if that file is absent.

Then fill in the admin settings in `.env`:

```bash
# generates a bcrypt hash to paste into ADMIN_PASSWORD_HASH
npm run hash-password -- yourChosenPassword

# generates a random session secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Set `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, and `SESSION_SECRET` in `.env`, then:

```bash
npm run dev        # starts the server with auto-reload at http://localhost:5000
```

Other scripts:

```bash
npm run build       # compiles TypeScript to dist/
npm start           # runs the compiled server (after npm run build)
npm run typecheck   # type-checks without emitting files
```

## Using the admin dashboard

1. Go to `http://localhost:5000/admin/login` and sign in with the
   username/password you set in `.env`.
2. You'll land on `/admin`, where you can:
   - Add, edit, or delete **projects** (name, description, tags, live/source URLs)
   - Review the **contact inbox**, mark messages read or handled, and delete them
   - Add or delete **experience** entries (dates, role, org, description)
   - **Upload** a photo or resume (PNG/JPG/WEBP/PDF, 5MB max) — images replace the public
       profile photo and PDFs update the public resume link
3. Changes save to MongoDB and appear on the public site immediately — no restart needed.
4. Click **Log out** when you're done, or the session expires after 8 hours.

**How visitors are kept out:** every write endpoint (`/api/admin/...`) and the
dashboard page itself (`/admin`) run through a `requireAuth` middleware that
checks for a valid session — set only after a correct login. A visitor
without that session gets a `401` from the API or is redirected to the login
page; nothing on the public site links to `/admin` at all. The public `GET`
endpoints (`/api/projects`, `/api/experience`, `/api/profile-assets`) stay open to everyone.

## Making it yours

1. **Your info:** edit the hero, about, and skills text directly in `public/index.html`;
   projects, experience, profile photo, and resume are managed from the admin dashboard.
2. **Contact form:** `POST /api/contact` validates and stores new submissions in
   MongoDB; review and manage them in the protected admin inbox. Submissions made
   before inbox storage was added were only logged to the server console and are
   not available in the dashboard. Email notifications are not configured.
3. **Deploying:** any Node host works (Render, Railway, Fly.io, a VPS, etc.).
   Run `npm run build` then `npm start`. Set `PORT`, `ADMIN_USERNAME`,
   `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`, and `SESSION_SECURE_COOKIE=true`
   (once you're on HTTPS) as environment variables on your host.
   Set `MONGODB_URI` to your production database. `public/uploads/` should live on
   persistent storage or be replaced with object storage if your host has an ephemeral filesystem.

## API reference

| Method | Route                      | Auth      | Description                          |
|--------|----------------------------|-----------|---------------------------------------|
| GET    | `/api/projects`            | Public    | Returns `{ projects: Project[] }`     |
| GET    | `/api/experience`          | Public    | Returns `{ experience: ExperienceEntry[] }` |
| GET    | `/api/profile-assets`      | Public    | Returns uploaded profile photo and resume URLs |
| POST   | `/api/contact`             | Public    | Validates `{ name, email, message }`, returns `{ success, errors? }` |
| GET    | `/api/admin/contacts`      | Protected | Returns stored contact messages, newest first |
| PATCH  | `/api/admin/contacts/:id`  | Protected | Update a message's `isRead` and/or `handled` status |
| DELETE | `/api/admin/contacts/:id`  | Protected | Delete a contact message |
| GET    | `/health`                  | Public    | Basic health check                    |
| GET    | `/admin/login`              | Public    | Login page |
| POST   | `/admin/login`              | Public    | `{ username, password }` → sets session cookie |
| POST   | `/admin/logout`             | —         | Destroys the session |
| GET    | `/admin`                    | Protected | Admin dashboard page |
| POST   | `/api/admin/projects`       | Protected | Create a project |
| PUT    | `/api/admin/projects/:id`   | Protected | Update a project |
| DELETE | `/api/admin/projects/:id`   | Protected | Delete a project |
| POST   | `/api/admin/experience`     | Protected | Create an experience entry |
| PUT    | `/api/admin/experience/:id` | Protected | Update an experience entry |
| DELETE | `/api/admin/experience/:id` | Protected | Delete an experience entry |
| POST   | `/api/admin/upload`         | Protected | Upload a photo/resume and update its public URL |
