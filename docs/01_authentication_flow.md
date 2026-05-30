# 01. Authentication Flow

**Collection Section:** `01. Authentication Flow`
**Source:** `Practice_API_Collection.json` + `Reg.postman_collection.json`

This section is the **root of the entire dependency chain**. Every protected endpoint in sections 02–05 requires tokens produced here. No other section can run successfully without first completing the steps in this section.

---

## How to Run This Section

Run requests in this exact order:

```
1. Register New Dynamic User     ← entry point, no prior steps needed
2. Login Dynamic User            ← requires step 1 to have set credentials
3. Validate Admin Login          ← independent of steps 1–2, but must run before sections 03 and 05
```

---

## Endpoints

---

### 1. Register New Dynamic User

#### Prerequisites

> **None** — this is the entry point of the entire test suite.
>
> However, the following **system prerequisites** must be satisfied:
> - The API server must be running at `{{baseUrl}}` (default: `http://localhost:3000`)
> - The database must be accessible and accept new user records
> - The email format `user_<UUID>@practice.com` must not already exist (guaranteed by UUID uniqueness)

#### What Runs Automatically Before This Request

A **pre-request script** fires before the HTTP call and sets four environment variables used in the request body:

| Variable Set | Generated As | Example |
|---|---|---|
| `dynamicEmail` | `user_<UUID>@practice.com` | `user_a3f2...@practice.com` |
| `dynamicPassword` | `Pass123!<randomInt>` | `Pass123!4872` |
| `dynamicFirstName` | Random first name | `Sarah` |
| `dynamicLastName` | Random last name | `Mitchell` |

These variables are **stored in the Postman environment** and persist for subsequent requests in this run.

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **URL** | `{{baseUrl}}/auth/register` |
| **Auth** | None |
| **Content-Type** | `application/json` |

#### Request Body

```json
{
  "email": "{{dynamicEmail}}",
  "password": "{{dynamicPassword}}",
  "firstName": "{{dynamicFirstName}}",
  "lastName": "{{dynamicLastName}}"
}
```

#### Request Body Field Reference

| Field | Type | Required | Constraint | Example |
|-------|------|----------|------------|---------|
| `email` | string | Yes | Must be a valid email format, must be unique | `user_abc@practice.com` |
| `password` | string | Yes | Min length implied by `Pass123!<int>` pattern | `Pass123!4872` |
| `firstName` | string | Yes | Non-empty string | `Sarah` |
| `lastName` | string | Yes | Non-empty string | `Mitchell` |

#### Expected Response — `201 Created`

```json
{
  "message": "User created successfully",
  "userId": "a1b2c3d4-...",
  "createdAt": "2026-05-29T10:00:00.000Z"
}
```

#### Response Field Reference

| Field | Type | Description |
|-------|------|-------------|
| `message` | string | Always `"User created successfully"` on success |
| `userId` | string | Unique ID of the created user (UUID or similar) |
| `createdAt` | string | ISO 8601 timestamp of account creation |

#### Assertions

| Test | Expected | What Breaks If It Fails |
|------|----------|------------------------|
| Status is 201 | `201 Created` | User was not created — all downstream steps will fail |
| `message` equals `"User created successfully"` | Exact string match | Server message contract changed |
| `userId` is present | Property exists | No user ID returned — downstream ID lookups impossible |
| `createdAt` is present | Property exists | Timestamp field missing |
| Response time < 1000ms | `< 1000ms` | Performance regression |

#### What This Step Produces (Used Downstream)

| Variable | Used By |
|----------|---------|
| `dynamicEmail` | Login Dynamic User (body), Get Profile Validation (assertion) |
| `dynamicPassword` | Login Dynamic User (body) |
| `dynamicFirstName` | Get Profile Validation (assertion) |
| `dynamicLastName` | Get Profile Validation (assertion) |

---

### 2. Login Dynamic User

#### Prerequisites

> **Must run after:** Register New Dynamic User (step 1 of this section)
>
> **Requires these environment variables to be set:**
> - `dynamicEmail` — set by the pre-request script in step 1
> - `dynamicPassword` — set by the pre-request script in step 1
>
> **What happens if prerequisites are missing:**
> - If `dynamicEmail` / `dynamicPassword` are not set, the request body sends empty strings → API returns `401` or `400`, not `200`
> - The test `"User object in response matches auth context"` will also fail because it compares `jsonData.user.email` against the environment variable

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **URL** | `{{baseUrl}}/auth/login` |
| **Auth** | None |
| **Content-Type** | `application/json` |

#### Request Body

```json
{
  "email": "{{dynamicEmail}}",
  "password": "{{dynamicPassword}}"
}
```

#### Request Body Field Reference

| Field | Type | Required | Source |
|-------|------|----------|--------|
| `email` | string | Yes | `dynamicEmail` env var (set in step 1 pre-request) |
| `password` | string | Yes | `dynamicPassword` env var (set in step 1 pre-request) |

#### Expected Response — `200 OK`

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenType": "Bearer",
  "user": {
    "email": "user_abc@practice.com"
  }
}
```

#### Response Field Reference

| Field | Type | Description |
|-------|------|-------------|
| `accessToken` | string | Short-lived JWT — used in `Authorization: Bearer` header for all protected endpoints |
| `refreshToken` | string | Long-lived JWT — reserved for token refresh (not tested further in this suite) |
| `tokenType` | string | Always `"Bearer"` — tells clients how to format the auth header |
| `user.email` | string | Echoed email — used to validate the correct account was logged in |

#### Assertions

| Test | Expected | What Breaks If It Fails |
|------|----------|------------------------|
| Status is 200 | `200 OK` | Login failed — no tokens captured, all protected endpoints will return 401 |
| `accessToken` present | Property exists | Cannot authenticate subsequent requests |
| `refreshToken` present | Property exists | Token refresh flow unavailable |
| `tokenType` is `"Bearer"` | Exact match | Auth header format mismatch |
| `user.email` matches `dynamicEmail` | Exact match | Wrong user logged in — profile assertions in section 02 will fail |

#### What Runs After Response (Token Capture Script)

```js
var jsonData = pm.response.json();
if (jsonData.accessToken) pm.environment.set("accessToken", jsonData.accessToken);
if (jsonData.refreshToken) pm.environment.set("refreshToken", jsonData.refreshToken);
```

#### What This Step Produces (Used Downstream)

| Variable | Used By |
|----------|---------|
| `accessToken` | GET /users/me (02), DELETE /cart (04), POST /cart (04), POST /checkout (04), GET /orders (04), GET /admin/users — 403 test (05) |
| `refreshToken` | Reserved (not used in further tests) |

---

### 3. Validate Admin Login

#### Prerequisites

> **No dependency on steps 1–2** — this uses a **hardcoded** admin credential, not the dynamic user created above.
>
> **System prerequisites:**
> - A user account with email `admin@practice.com`, password `password123`, and role `admin` must be **pre-seeded** in the database
> - If this seed account does not exist or has a different password, this step returns `401` and `adminAccessToken` is never set
>
> **Impact if this step is skipped or fails:**
> - Section 03 — Create Product (POST /products) will return `401` (no admin token)
> - Section 05 — Admin: Get All Users (GET /admin/users) will return `401` (no admin token)

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **URL** | `{{baseUrl}}/auth/login` |
| **Auth** | None |
| **Content-Type** | `application/json` |

#### Request Body

```json
{
  "email": "admin@practice.com",
  "password": "password123"
}
```

> **Note:** These are hardcoded seed credentials, not dynamically generated.

#### Request Body Field Reference

| Field | Type | Value | Source |
|-------|------|-------|--------|
| `email` | string | `admin@practice.com` | Hardcoded — must match seeded admin account |
| `password` | string | `password123` | Hardcoded — must match seeded admin password |

#### Expected Response — `200 OK`

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "role": "admin"
  }
}
```

#### Response Field Reference

| Field | Type | Description |
|-------|------|-------------|
| `accessToken` | string | Admin JWT — carries `role: admin` claim, required for admin-only routes |
| `user.role` | string | Must be `"admin"` — this is explicitly asserted |

#### Assertions

| Test | Expected | What Breaks If It Fails |
|------|----------|------------------------|
| Status is 200 | `200 OK` | Admin login failed — `adminAccessToken` not set, section 03 and 05 cannot proceed |
| `user.role` is `"admin"` | Exact match | Account exists but is not an admin — role assignment is broken in seeding |

#### What Runs After Response (Admin Token Capture Script)

```js
var jsonData = pm.response.json();
if (jsonData.accessToken) pm.environment.set("adminAccessToken", jsonData.accessToken);
```

#### What This Step Produces (Used Downstream)

| Variable | Used By |
|----------|---------|
| `adminAccessToken` | POST /products (03), GET /admin/users (05), Negative: Create Product Invalid Schema (03) |

---

## Section Dependency Map

```
[System: DB seeded, server running]
        │
        ▼
[Pre-request script auto-runs]
  sets: dynamicEmail, dynamicPassword, dynamicFirstName, dynamicLastName
        │
        ▼
POST /auth/register
  ├─ creates user in DB
  └─ Response validates: userId, createdAt, message
        │
        ▼
POST /auth/login  (dynamicEmail + dynamicPassword)
  └─ sets: accessToken, refreshToken
        │
        │   [Independent path — hardcoded admin creds]
        │
        ▼
POST /auth/login  (admin@practice.com + password123)
  └─ sets: adminAccessToken
        │
        ├─────────────────────────────────────► Section 02 (accessToken)
        ├─────────────────────────────────────► Section 03 (adminAccessToken → customProductId)
        │                                                    ↓
        └─────────────────────────────────────► Section 04 (accessToken + customProductId)
                                              ► Section 05 (accessToken + adminAccessToken)
```

---

## Common Failure Scenarios

| Scenario | Symptom | Root Cause |
|----------|---------|------------|
| Pre-request script not executed | Login body has empty strings, returns 401 | Postman environment not loaded or scripting disabled |
| Admin account not seeded | Step 3 returns 401, `adminAccessToken` never set | DB migration / seed script not run |
| Duplicate email from previous run | Step 1 returns 409 Conflict | UUID not regenerating (static variable leftover) |
| Server not running | All requests time out | `baseUrl` environment variable wrong or server down |
