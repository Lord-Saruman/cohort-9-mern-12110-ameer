# Notes App

A full-stack application for private rich-text notes. Users can securely register, sign in, and manage notes that are visible only to their own account.

## Stack

- React and TypeScript
- Node.js, Express, and TypeScript
- MySQL 8
- Pino structured logging
- Mocha/Chai and Jest tests
- SonarQube-ready coverage configuration

## Run locally

1. Copy `apps/api/.env.example` to `apps/api/.env` and replace `JWT_SECRET`.
2. Start MySQL with `docker compose up -d mysql`.
3. Install dependencies with `npm install`.
4. Apply the schema with `npm run db:migrate --workspace=@notes/api`.
5. Start the API and web app with `npm run dev`.

## Quality commands

```bash
npm run format:check
npm run lint
npm test
npm run build
```
