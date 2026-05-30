# 05. Administrative Tasks & Security

**Collection Section:** `05. Administrative Tasks & Security`
**Source:** `Practice_API_Collection.json`

This section validates **Role-Based Access Control (RBAC)**. Both tests hit the same endpoint (`GET /admin/users`) with different tokens — one is a regular user token (expects `403`), the other is an admin token (expects `200`). The contrast between these two results proves the authorization layer is working correctly.

---

## How to Run This Section

```
Prerequisites for the RBAC negative test:
  ✓ Section 01 — Step 1: Register New Dynamic User   (creates a regular user account)
  ✓ Section 01 — Step 2: Login Dynamic User           (sets accessToken for a regular user)

Prerequisites for the admin positive test:
  ✓ Section 01 — Step 3: Validate Admin Login         (sets adminAccessToken)

Recommended execution order:
  1. Negative: Regular user attempts Admin action   ← uses accessToken (regular user)
  2. Admin action: Get all users                   ← uses adminAccessToken
```

---

## Endpoints

---

### 1. Negative: Regular User Attempts Admin Action

#### Prerequisites

> **Must run after:**
> 1. `Register New Dynamic User` (Section 01, Step 1) — creates a user account with role `user` (not `admin`)
> 2. `Login Dynamic User` (Section 01, Step 2) — sets `accessToken` for the non-admin user
>
> **Required environment variables:**
> | Variable | Set By | If Missing |
> |----------|--------|------------|
> | `accessToken` | Login Dynamic User (01.2) | Request returns `401 Unauthorized` instead of expected `403 Forbidden` — test fails |
>
> **Critical distinction — 401 vs 403:**
> - `401 Unauthorized` = token is missing or invalid (authentication failed)
> - `403 Forbidden` = token is valid but the user does not have the required role (authorization failed)
>
> This test **must use a valid token** to reach the authorization layer. If `accessToken` is missing or expired, the server short-circuits at authentication and returns `401` — which is a different error path than what this test is verifying.
>
> **What this test is NOT testing:**
> - It is not testing what happens with no token (that is tested in section 02)
> - It is not testing whether the admin account works (that is the next test)

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **URL** | `{{baseUrl}}/admin/users` |
| **Auth** | `Bearer {{accessToken}}` (regular user — intentional) |

#### Request Headers

| Header | Value | Purpose |
|--------|-------|---------|
| `Authorization` | `Bearer {{accessToken}}` | Proves the user is authenticated (not anonymous) — the 403 must come from role check, not missing token |

#### Request Body

None — `GET` request.

#### Expected Response — `403 Forbidden`

```json
{
  "error": {
    "code": "FORBIDDEN"
  }
}
```

#### Response Field Reference

| Field | Type | Value | Description |
|-------|------|-------|-------------|
| `error` | object | — | Error wrapper |
| `error.code` | string | `"FORBIDDEN"` | Machine-readable RBAC rejection code |

#### Assertions

| Test | Expected | Implication If It Fails |
|------|----------|------------------------|
| Status is 403 | `403 Forbidden` | If `401`: token invalid or missing; if `200`: authorization is broken — regular users can access admin data |
| `error.code` is `"FORBIDDEN"` | Exact match | RBAC error schema is inconsistent |

#### What This Step Produces

Nothing — authorization rejection with no side effects.

---

### 2. Admin Action: Get All Users

#### Prerequisites

> **Must run after:** `Validate Admin Login` (Section 01, Step 3)
>
> **Required environment variables:**
> | Variable | Set By | If Missing |
> |----------|--------|------------|
> | `adminAccessToken` | Validate Admin Login (01.3) | API returns `401 Unauthorized` — admin data is not returned |
>
> **System prerequisites:**
> - The database must contain at least one user record for the response body security assertion to run
> - If the users array is empty, the assertion `jsonData[0]).to.not.have.property('password')` is never evaluated (it is inside an `if` guard)
>
> **What this test verifies at a high level:**
> 1. Admin JWT grants access to the admin route (RBAC positive path)
> 2. Even admin-privileged responses never expose password data (defense in depth)

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **URL** | `{{baseUrl}}/admin/users` |
| **Auth** | `Bearer {{adminAccessToken}}` |

#### Request Headers

| Header | Value | Required |
|--------|-------|----------|
| `Authorization` | `Bearer {{adminAccessToken}}` | Yes — regular user token returns `403` |

#### Request Body

None — `GET` request.

#### Expected Response — `200 OK`

```json
[
  {
    "id": "usr_abc123",
    "email": "user_xyz@practice.com",
    "firstName": "Sarah",
    "lastName": "Mitchell",
    "role": "user"
  },
  {
    "id": "usr_admin001",
    "email": "admin@practice.com",
    "firstName": "Admin",
    "lastName": "User",
    "role": "admin"
  }
]
```

Response is a **flat array** of all user objects.

#### Response Field Reference

| Field | Type | Description | Security Constraint |
|-------|------|-------------|---------------------|
| Root | array | All registered users in the system | — |
| `[].id` | string | Unique user identifier | — |
| `[].email` | string | User's email address | — |
| `[].firstName` | string | User's first name | — |
| `[].lastName` | string | User's last name | — |
| `[].role` | string | User role (`"user"` or `"admin"`) | — |
| `[].password` | — | **Must NOT be present** | Even admin callers must not receive password hashes |

#### Assertions

| Test | Expected | Implication If It Fails |
|------|----------|------------------------|
| Status is 200 | `200 OK` | Admin token rejected or admin route broken |
| Response is an array | Array type | Response schema changed unexpectedly |
| `password` field absent from user objects | Property must not exist | Critical security issue — password hashes exposed even to admins |

#### What This Step Produces

Nothing — read-only admin query.

---

## Section Dependency Map

```
[Section 01 — Step 1: Register New Dynamic User]
   creates: regular user with role "user" in DB
        │
[Section 01 — Step 2: Login Dynamic User]
   sets: accessToken (non-admin user token)
        │
        ▼
GET /admin/users  (Authorization: Bearer accessToken)
   ──────────────────────────────────────────────────────► 403 Forbidden
                                                           { error: { code: "FORBIDDEN" } }

[Section 01 — Step 3: Validate Admin Login]
   sets: adminAccessToken
        │
        ▼
GET /admin/users  (Authorization: Bearer adminAccessToken)
   ──────────────────────────────────────────────────────► 200 OK (array, no passwords)
```

---

## RBAC Matrix — Full Picture

| Endpoint | No Token | Regular User | Admin |
|----------|----------|--------------|-------|
| `POST /auth/register` | ✅ 201 | ✅ 201 | ✅ 201 |
| `POST /auth/login` | ✅ 200 | ✅ 200 | ✅ 200 |
| `GET /users/me` | ❌ 401 | ✅ 200 | N/A |
| `GET /products` | ✅ 200 | ✅ 200 | ✅ 200 |
| `POST /products` | ❌ 401 | ❌ 403 (implied) | ✅ 201 |
| `DELETE /cart` | ❌ 401 | ✅ 200 | N/A |
| `POST /cart` | ❌ 401 | ✅ 200 | N/A |
| `POST /checkout` | ❌ 401 | ✅ 201 | N/A |
| `GET /orders` | ❌ 401 | ✅ 200 | N/A |
| `GET /admin/users` | ❌ 401 | ❌ **403** | ✅ 200 |

---

## Security Considerations

| Concern | How It Is Tested |
|---------|-----------------|
| Regular user accessing admin endpoints | `GET /admin/users` with `accessToken` → must return `403` (not `200`) |
| Admin bypassing password protection | `GET /admin/users` response must not include `password` field |
| 401 vs 403 distinction | Regular user test uses a **valid** token to ensure `403` is role-based, not auth-based |
| Token isolation | Suite maintains `accessToken` and `adminAccessToken` as separate variables — no cross-contamination |

---

## Common Failure Scenarios

| Scenario | Symptom | Root Cause |
|----------|---------|------------|
| `accessToken` not set | Negative test returns 401 instead of 403 | Login Dynamic User (01.2) skipped or failed |
| `adminAccessToken` not set | Admin test returns 401 | Validate Admin Login (01.3) skipped or failed |
| Admin route returns 200 for regular user | Security assertion fails | RBAC middleware is missing or misconfigured |
| `password` present in admin response | Security assertion fails | User serializer is not stripping the password field |
| Admin account does not exist in DB | Admin login (01.3) returns 401 | Seed script not run |
