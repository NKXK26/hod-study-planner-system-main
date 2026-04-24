# First-time Setup (for teammates)

Follow these steps in order. Skip a step and nothing will work.

## 1. Install prerequisites

You need these installed on your computer first:

- **Git** — https://git-scm.com/download/win
- **Node.js 20 or newer** — https://nodejs.org/en/download (pick the LTS installer)
- **PostgreSQL 15 or newer** — https://www.postgresql.org/download/windows/
  - During install, set the password for the `postgres` user to `postgres` (easiest), or remember whatever you chose.
  - Let it run on the default port `5432`.

After installing, open a new Command Prompt and verify:
```
git --version
node --version
npm --version
psql --version
```
All four should print a version number.

## 2. Clone the project

```
cd C:\Users\YOUR_NAME\Desktop
git clone https://github.com/NKXK26/hod-study-planner-system-main.git
cd hod-study-planner-system-main
git checkout electron1
```

## 3. Install project dependencies

From inside the project folder:
```
npm install
```
This pulls down every library the app needs. Takes 2–5 minutes the first time.

## 4. Set up your local environment file

The project ships with an `.env.example` showing every variable the app expects. Copy it:

```
copy .env.example .env.local
```

Open `.env.local` in Notepad. If you used a different Postgres password than `postgres`, update the password inside both `DATABASE_URL` and `DIRECT_URL`. Otherwise leave everything else as-is.

## 5. Create the database

Open pgAdmin (installed with PostgreSQL) OR a Command Prompt with `psql`, and create a database called `studyplanner`:

```
psql -U postgres -c "CREATE DATABASE studyplanner;"
```
(it'll prompt for the postgres password)

Then apply the schema and seed data:
```
npx prisma generate
npx prisma migrate deploy
npm run db:seed
```

## 6. Build the app once

```
npm run electron:prep
```
Takes 2–3 minutes. Only needs to be run again when code changes.

## 7. Launch the app

```
npm run electron:fast
```

The app window opens in ~10 seconds and lands on the Dashboard as a Superadmin. Done.

---

## Daily use after setup

Just run:
```
npm run electron:fast
```

## When someone pushes new code

Pull the changes and rebuild once:
```
git pull
npm install
npm run electron:prep
```
Then continue using `npm run electron:fast` as normal.

## Troubleshooting

- **"ECONNREFUSED" or server not reachable**: Postgres isn't running. Open Services → start `postgresql-x64-XX`.
- **"database studyplanner does not exist"**: run `psql -U postgres -c "CREATE DATABASE studyplanner;"` again.
- **App window is blank / stuck on "Checking permissions"**: delete the `.next` folder and rebuild: `rmdir /s /q .next && npm run electron:prep`.
- **Port 3000 already in use**: another program is holding it. Close other Node apps or change `NEXT_PUBLIC_SERVER_URL` in `.env.local`.
