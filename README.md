# QA Practice API

A complete, simulated e-commerce API designed specifically for QA Engineers to practice manual and automation testing.

## Features

- **In-Memory Storage**: Resets on restart. No database required. Pre-seeded with 100 products and users.
- **Chaos Mode**: Simulates real-world flakiness with random delays (100-800ms) and occasional 500 Internal Server Errors (5% chance). Enable via `.env.qa` or by sending `X-Chaos-Mode: true` in requests.
- **Multiple Environments**: Different behaviors for QA vs PROD (e.g., token expiry lengths, rate limiting rules, verbose error tracing).
- **Authentication**: JWT access & refresh token rotation workflow, session invalidation on logout and password change.
- **Full Scope CRUD**: Users, Products, Cart, Orders, Admin endpoints.

## Running the API

Install dependencies first:

```bash
npm install
```

> **Note on Environment Variables (`.env.qa`, `.env.prod`)**:  
> You do **not** need to drag, drop, or manually import these files anywhere! They are already mapped mechanically in the `package.json` configurations. When you run the commands below, the application will automatically read the correct variables.

Run in **QA Environment** (Verbose errors, Chaos mode enabled):

```bash
npm run dev:qa
```

Run in **PROD Environment** (Minimal errors, strict rate limit, Chaos mode disabled):

```bash
npm run dev:prod
```

The server will run at `http://localhost:3000`.

## Linting & Formatting

The project comes with **ESLint** and **Prettier** configured to ensure code quality and consistent styling.

To format your code:
```bash
npm run format
```

To run lint checks:
```bash
npm run lint
```

## CI/CD Pipeline

A continuous integration (CI) pipeline is included via **GitHub Actions** (`.github/workflows/main.yml`). It automatically runs tests and linting on Push or Pull Requests to the `main` or `master` branches across multiple Node.js versions.

## Test Accounts

- **Admin Account**:
  - Email: `admin@practice.com`
  - Password: `password123`
- **Standard Account**:
  - Email: `qa@practice.com`
  - Password: `password123`

## Testing Assets

- **Swagger Docs**:  
  Navigate directly to `http://localhost:3000/docs` in your browser while the server is running to view and interact with the Swagger API UI. (The raw spec is located at `docs/swagger.yml`).
- **Postman Collection**:  
  Import `postman/Practice_API_Collection.json` into Postman. Make sure to run the `Login` request first; its test script will automatically set the `accessToken` environment variable for subsequent requests. The collection includes all CRUD endpoints for Cart, Orders, Admin, Products, Users, and Auth.
- **Automation Examples**:  
  See Playwright API tests in `examples/playwright-api/`.
