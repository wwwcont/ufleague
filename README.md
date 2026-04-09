# UFL Cup Frontend

Mobile-first football tournament web app (React + TypeScript + Vite + Tailwind + React Router) with mock repositories.

## Requirements

- Node.js **20.19.0+** (recommended: **22.12.0+**)
- npm

If you use `nvm`:

```bash
nvm install 22
nvm use 22
```

A project `.nvmrc` file is included, so you can also run:

```bash
nvm use
```

## Run locally

```bash
npm install
npm run dev
```

App runs at Vite default URL (usually `http://localhost:5173`).

## Troubleshooting Node.js version errors

If you see errors like:

- `Vite requires Node.js version 20.19+ or 22.12+`
- `ReferenceError: CustomEvent is not defined`
- `npm WARN EBADENGINE ... current: node v18.x`

then your shell is still using Node 18 (or another unsupported version).  
Switch to Node 22 in the same terminal session and reinstall:

```bash
nvm use 22
node -v
npm install
npm run build
```

Expected `node -v` output: `v22.12.0` or newer.

### WSL + Windows note

If you are in WSL (`/mnt/...` paths), install/use Node **inside WSL** (Linux `nvm`), not Windows Node.  
You can verify which binary is active:

```bash
which node
node -v
```

`which node` should point to something under your Linux home (for example `~/.nvm/...`), not a Windows path.

## Included pages
- Home
- Matches
- Match Details
- Teams
- Team Details
- Players
- Player Details
- Standings
- Bracket
- Search
- Login (skeleton)
- Profile (skeleton)
