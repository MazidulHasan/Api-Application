# 02. Profile Management

**Collection Section:** `02. Profile Management`
**Source:** `Practice_API_Collection.json`

This section tests the authenticated user's ability to read their own profile. It validates both the happy path (with a valid token) and the negative path (no token), and enforces that sensitive fields like `password` are never returned.

---

## How to Run This Section

```
Prerequisites (must complete before running this section):
  ✓ Section 01 — Step 1: Register New Dynamic User   (sets dynamicEmail, dynamicFirstName, dynamicLastName)
  ✓ Section 01 — Step 2: Login Dynamic User           (sets accessToken)

Tests in this section:
  1. Get Profile Validation              ← requires accessToken + dynamic user variables
  2. Negative: Access Profile Without Token  ← standalone, no token needed
```

---

## Endpoints

---

### 1. Get Profile Validation

#### Prerequisites

> **Must run after:**
> 1. `Register New Dynamic User` (Section 01, Step 1) — creates the user in the DB and sets `dynamicEmail`, `dynamicFirstName`, `dynamicLastName`
> 2. `Login Dynamic User` (Section 01, Step 2) — authenticates the registered user and sets `accessToken`
>
> **Required environment variables:**
> | Variable | Set By | If Missing |
> |----------|--------|------------|
> | `accessToken` | Login Dynamic User (01.2) | API returns `401 Unauthorized` |
> | `dynamicEmail` | Register pre-request script (01.1) | Profile email assertion fails |
> | `dynamicFirstName` | Register pre-request script (01.1) | First name assertion fails |
> | `dynamicLastName` | Register pre-request script (01.1) | Last name assertion fails |
>
> **What happens if you skip registration and login:**
> - Without `accessToken`: request returns `401`, all assertions fail
> - Without dynamic user variables: request may return `200`, but all three data assertions will fail because they compare against empty strings

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **URL** | `{{baseUrl}}/users/me` |
| **Auth** | `Bearer {{accessToken}}` |

#### Request Headers

| Header | Value | Required |
|--------|-------|----------|
| `Authorization` | `Bearer {{accessToken}}` | Yes — omitting this returns `401` |

#### Request Body

None — `GET` request with no body.

#### Expected Response — `200 OK`

```json
{
  "email": "user_abc123@practice.com",
  "firstName": "Sarah",
  "lastName": "Mitchell"
}
```

#### Response Field Reference

| Field | Type | Description | Security Constraint |
|-------|------|-------------|---------------------|
| `email` | string | The authenticated user's email address | Must match `dynamicEmail` |
| `firstName` | string | User's first name | Must match `dynamicFirstName` |
| `lastName` | string | User's last name | Must match `dynamicLastName` |
| `password` | — | **Must NOT be present** | API must strip this field before responding |

#### Assertions

| Test | Expected | Implication If It Fails |
|------|----------|------------------------|
| Status is 200 | `200 OK` | Token rejected or route broken |
| `email` matches `dynamicEmail` | Exact match | Data stored at registration does not match what's returned |
| `firstName` matches `dynamicFirstName` | Exact match | First name stored incorrectly or returned from wrong user |
| `lastName` matches `dynamicLastName` | Exact match | Last name stored incorrectly or returned from wrong user |
| `password` field is absent | Property must not exist | Critical security issue — password hash/plaintext is being leaked |

#### What This Step Produces

Nothing — this is a read-only validation step with no side effects.

---

### 2. Negative: Access Profile Without Token

#### Prerequisites

> **None required** — this is a standalone negative test that can be run independently at any time.
>
> **Important:** This test deliberately sends **no** `Authorization` header. Do not add a token — doing so would change it from a negative test to a positive one.

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **URL** | `{{baseUrl}}/users/me` |
| **Auth** | None (intentionally omitted) |

#### Request Headers

None — the absence of the `Authorization` header is the whole point of this test.

#### Request Body

None.

#### Expected Response — `401 Unauthorized`

```json
{
  "error": {
    "code": "UNAUTHORIZED"
  }
}
```

#### Response Field Reference

| Field | Type | Value | Description |
|-------|------|-------|-------------|
| `error` | object | — | Wrapper for error details |
| `error.code` | string | `"UNAUTHORIZED"` | Machine-readable error code for clients to act on |

#### Assertions

| Test | Expected | Implication If It Fails |
|------|----------|------------------------|
| Status is 401 | `401 Unauthorized` | Endpoint is publicly accessible without auth — security hole |
| `error.code` is `"UNAUTHORIZED"` | Exact match | Error response schema is inconsistent — clients cannot reliably parse errors |

#### What This Step Produces

Nothing — negative test with no side effects.

---

## Section Dependency Map

```
[Section 01 — Step 1: Register New Dynamic User]
   sets: dynamicEmail, dynamicFirstName, dynamicLastName
        │
        ▼
[Section 01 — Step 2: Login Dynamic User]
   sets: accessToken
        │
        ▼
GET /users/me  (Authorization: Bearer {{accessToken}})
   ├─ asserts: email = dynamicEmail
   ├─ asserts: firstName = dynamicFirstName
   ├─ asserts: lastName = dynamicLastName
   └─ asserts: password field is absent

GET /users/me  (no Authorization header)  ─────────────────► 401 { error: { code: "UNAUTHORIZED" } }
   (independent — runs anytime)
```

---

## Security Considerations

| Risk | Mitigation Tested |
|------|-------------------|
| Password hash leaked in response | Asserted: `password` property must not exist |
| Unauthenticated access to profile | Asserted: missing token returns `401` |
| IDOR (user viewing another user's profile) | Endpoint uses `/me` — no user ID parameter accepted |
| Inconsistent error schema | Asserted: error format is `{ error: { code: "..." } }` |

---

## Common Failure Scenarios

| Scenario | Symptom | Root Cause |
|----------|---------|------------|
| `accessToken` is expired or invalid | Status 401 instead of 200 | Token TTL too short or clock skew |
| `dynamicEmail` variable cleared between runs | Email assertion fails (`undefined` vs actual email) | Postman environment was reset manually |
| `password` field present in response | Security assertion fails | Serializer / DTO not stripping the field |
| `/users/me` accepts a user ID in path | N/A (not tested here) | Potential IDOR — should be investigated separately |
