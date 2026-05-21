# Deployment

This project is prepared for GitHub + Vercel deployment.

If this environment does not have `git`, `npm`, or `vercel` CLI installed, do not block implementation. Use the commands below on a local machine that has Node.js and Git installed.

## Prerequisites

- Node.js 20 LTS or newer
- npm
- Git for Windows, macOS Git, or Linux Git
- A GitHub account
- A Vercel account

## Environment Variables

Create these in Vercel, or copy `.env.example` locally:

```bash
NEXT_PUBLIC_APP_NAME=Quant Event Alpha Lab Taiwan
NEXT_PUBLIC_DATA_MODE=Demo
NEXT_PUBLIC_ENABLE_DEMO_DATA=true
```

## Local Run

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## Local Checks

```bash
npm run lint
npm run typecheck
npm run build
```

## Method A: GitHub + Vercel Dashboard

1. Create an empty GitHub repository.
2. Push this project:

```bash
git init
git add .
git commit -m "Build Quant Event Alpha Lab Super MVP"
git branch -M quant-event-alpha-lab-super-mvp
git remote add origin <YOUR_GITHUB_REPO_URL>
git push -u origin quant-event-alpha-lab-super-mvp
```

3. Open Vercel Dashboard.
4. Choose Add New Project.
5. Import the GitHub repository.
6. Framework preset: Next.js.
7. Build command: `npm run build`.
8. Output directory: `.next`.
9. Add the environment variables listed above.
10. Deploy.

After the GitHub repo is imported, Vercel will automatically deploy future pushes to the configured production branch.

## Method B: Vercel CLI

```bash
npm i -g vercel
vercel login
vercel link
vercel deploy
vercel deploy --prod
```

## Future Auto Deploy Updates

After Vercel is connected to GitHub:

```bash
git add .
git commit -m "Update Quant Event Alpha Lab"
git push
```

Vercel will detect the push and deploy automatically.

## Project Config

`vercel.json` is included:

- Framework: Next.js
- Build command: `npm run build`
- Output directory: `.next`
- Region: `hkg1`

## Current Environment Note

In the Codex desktop workspace used to generate this project, the available shell did not expose `git`, `npm`, `gh`, `winget`, or `vercel` on PATH. The project files were still generated completely, and deployment can continue from any machine with the prerequisites above.
