# 03. Data & Product Workflows

**Collection Section:** `03. Data & Product Workflows`
**Source:** `Practice_API_Collection.json`

This section covers the product catalog. Listing products is public (no auth), but creating products is **admin-only**. The `customProductId` produced by the Create Product step is a **critical dependency** — it feeds directly into the E2E Checkout Flow in section 04.

---

## How to Run This Section

```
Prerequisites (must complete before creating products):
  ✓ Section 01 — Step 3: Validate Admin Login   (sets adminAccessToken)

Tests in this section (recommended order):
  1. Get All Products with Pagination   ← public, no auth needed, but DB must have seeded products
  2. Create Product using Admin          ← requires adminAccessToken
  3. Negative: Create Product Invalid Schema  ← requires adminAccessToken (to reach validation layer)
```

> **Note:** Step 1 (Get All Products) can run independently at any time. Steps 2 and 3 both require `adminAccessToken`.

---

## Endpoints

---

### 1. Get All Products with Pagination

#### Prerequisites

> **No authentication required** — this is a public endpoint.
>
> **System prerequisites:**
> - The database must contain at least **1 product** for the test assertion to pass
> - If the database is empty, the test `"Extract Product ID for later tests"` will explicitly fail with: `"No products found to extract ID"`
>
> **Environment variables required:** None

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **URL** | `{{baseUrl}}/products?page=1&limit=5` |
| **Auth** | None |

#### Query Parameters

| Parameter | Type | Value | Description |
|-----------|------|-------|-------------|
| `page` | integer | `1` | Page number, 1-indexed |
| `limit` | integer | `5` | Maximum number of results to return per page |

#### Request Headers

None required.

#### Request Body

None — `GET` request.

#### Expected Response — `200 OK`

```json
{
  "data": [
    {
      "id": "prod_abc123",
      "name": "Sample Product",
      "price": 29.99,
      "category": "Electronics",
      "stock": 50
    }
  ],
  "page": 1,
  "limit": 5,
  "total": 12
}
```

#### Response Field Reference

| Field | Type | Description |
|-------|------|-------------|
| `data` | array | Array of product objects for the current page |
| `data[].id` | string | Unique product identifier |
| `data[].name` | string | Product display name |
| `data[].price` | number | Unit price in USD |
| `data[].category` | string | Product category label |
| `data[].stock` | number | Available inventory count |
| `page` | number | Current page returned |
| `limit` | number | Max items per page (echoed from query param) |
| `total` | number | Total product count across all pages |

#### Assertions

| Test | Expected | Implication If It Fails |
|------|----------|------------------------|
| Status is 200 | `200 OK` | Products endpoint is broken |
| `limit` equals `5` | Exact match — server must honour the query param | Pagination control is ignored |
| `data.length <= 5` | At most 5 items | Server is returning more records than requested |
| `data[0].id` captured as `firstProductId` | Non-empty string | DB has no products — seeding required |

#### What Runs After Response (ID Capture Script)

```js
var jsonData = pm.response.json();
if (jsonData.data.length > 0) {
    pm.environment.set("firstProductId", jsonData.data[0].id);
} else {
    pm.expect.fail("No products found to extract ID");
}
```

#### What This Step Produces (Used Downstream)

| Variable | Used By |
|----------|---------|
| `firstProductId` | Available for use — not directly used in this test suite's checkout flow (section 04 uses `customProductId` instead) |

---

### 2. Create Product using Admin

#### Prerequisites

> **Must run after:** `Validate Admin Login` (Section 01, Step 3)
>
> **Required environment variables:**
> | Variable | Set By | If Missing |
> |----------|--------|------------|
> | `adminAccessToken` | Validate Admin Login (01.3) | API returns `401 Unauthorized` — never reaches product creation logic |
>
> **What happens if prerequisites are missing:**
> - Without `adminAccessToken`: request returns `401` — product is not created, `customProductId` is never set
> - If `customProductId` is never set: Section 04 Step 2 (Add to Cart) sends `undefined` as product ID → cart add will fail
>
> **What runs automatically before this request:**
> A **pre-request script** generates a unique product name to prevent name collision across runs:
> ```js
> pm.environment.set("dynamicProductName", "Automated Product " + pm.variables.replaceIn('{{$randomUUID}}'));
> ```

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **URL** | `{{baseUrl}}/products` |
| **Auth** | `Bearer {{adminAccessToken}}` |
| **Content-Type** | `application/json` |

#### Request Headers

| Header | Value | Required |
|--------|-------|----------|
| `Authorization` | `Bearer {{adminAccessToken}}` | Yes — regular user token returns `403 Forbidden` |
| `Content-Type` | `application/json` | Yes |

#### Request Body

```json
{
  "name": "{{dynamicProductName}}",
  "price": 149.99,
  "category": "Electronics",
  "stock": 10,
  "description": "An amazing QA creation"
}
```

#### Request Body Field Reference

| Field | Type | Required | Constraint | Example |
|-------|------|----------|------------|---------|
| `name` | string | Yes | Must be unique (UUID suffix guarantees this) | `"Automated Product a3f2..."` |
| `price` | number | Yes | Positive float — **must be `149.99`** for checkout assertion to pass | `149.99` |
| `category` | string | Yes | Non-empty string | `"Electronics"` |
| `stock` | integer | Yes | Non-negative integer | `10` |
| `description` | string | No | Optional text description | `"An amazing QA creation"` |

> **Critical:** The `price` value `149.99` is **hardcoded** here. Section 04's checkout step asserts that the total is `299.98` (i.e., `149.99 × 2`). Changing this value will break that assertion.

#### Expected Response — `201 Created`

```json
{
  "product": {
    "id": "prod_xyz789",
    "name": "Automated Product a3f2...",
    "price": 149.99,
    "category": "Electronics",
    "stock": 10,
    "description": "An amazing QA creation"
  }
}
```

#### Response Field Reference

| Field | Type | Description |
|-------|------|-------------|
| `product` | object | The newly created product object |
| `product.id` | string | Unique product ID — **captured as `customProductId`** |
| `product.name` | string | Echo of submitted name |
| `product.price` | number | Echo of submitted price — must be `149.99` |
| `product.category` | string | Echo of submitted category |
| `product.stock` | number | Echo of submitted stock |
| `product.description` | string | Echo of submitted description |

#### Assertions

| Test | Expected | Implication If It Fails |
|------|----------|------------------------|
| Status is 201 | `201 Created` | Product not created — `customProductId` never set, section 04 breaks |
| `product.name` matches `dynamicProductName` | Exact match | Name stored incorrectly |
| `product.price` equals `149.99` | Exact float match | Checkout total assertion in section 04 will be wrong |
| `product.id` captured as `customProductId` | Non-empty string | Cart/checkout cannot reference this product |

#### What Runs After Response (ID Capture Script)

```js
var jsonData = pm.response.json();
pm.environment.set("customProductId", jsonData.product.id);
```

#### What This Step Produces (Used Downstream)

| Variable | Used By |
|----------|---------|
| `customProductId` | POST /cart (Section 04, Step 2) — the specific product added to cart |
| `dynamicProductName` | Available in environment (used in assertion only, not needed downstream) |

---

### 3. Negative: Create Product Invalid Schema

#### Prerequisites

> **Must run after:** `Validate Admin Login` (Section 01, Step 3)
>
> **Required environment variables:**
> | Variable | Set By | If Missing |
> |----------|--------|------------|
> | `adminAccessToken` | Validate Admin Login (01.3) | Request returns `401` instead of the expected `422` — test fails |
>
> **Why auth is required for a negative test:**
> The server must first verify the caller has admin permissions before it validates the request body. If the token is missing, the server returns `401` (authentication failure) before it even looks at the body. This test checks the **validation layer**, not the auth layer — so a valid admin token is needed to reach that layer.

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **URL** | `{{baseUrl}}/products` |
| **Auth** | `Bearer {{adminAccessToken}}` |
| **Content-Type** | `application/json` |

#### Request Headers

| Header | Value | Required |
|--------|-------|----------|
| `Authorization` | `Bearer {{adminAccessToken}}` | Yes — to pass auth and reach the validation layer |
| `Content-Type` | `application/json` | Yes |

#### Request Body (Intentionally Invalid)

```json
{
  "name": "No Price Or Category Provided"
}
```

**Missing required fields:** `price` and `category`.

#### Why This Body Is Invalid

| Field | Status | Reason |
|-------|--------|--------|
| `name` | Present | Valid |
| `price` | **Missing** | Required field — cannot create a product without a price |
| `category` | **Missing** | Required field — cannot create a product without categorization |
| `stock` | Missing | Required field (omitted silently in this test) |

#### Expected Response — `422 Unprocessable Entity`

```json
{
  "error": {
    "code": "VALIDATION_ERROR"
  }
}
```

#### Response Field Reference

| Field | Type | Value | Description |
|-------|------|-------|-------------|
| `error` | object | — | Error wrapper |
| `error.code` | string | `"VALIDATION_ERROR"` | Machine-readable code — clients distinguish this from auth errors |

#### Assertions

| Test | Expected | Implication If It Fails |
|------|----------|------------------------|
| Status is 422 | `422 Unprocessable Entity` | Validation not being enforced — invalid products could be created |
| `error.code` is `"VALIDATION_ERROR"` | Exact match | Error schema is inconsistent — client error handling breaks |

#### What This Step Produces

Nothing — no product is created, no environment variables are set.

---

## Section Dependency Map

```
[System: DB has at least 1 seeded product]
        │
        ▼
GET /products?page=1&limit=5  (public, no auth)
   └─ sets: firstProductId (first product in list)

[Section 01 — Step 3: Validate Admin Login]
   sets: adminAccessToken
        │
        ▼
[Pre-request script: sets dynamicProductName = "Automated Product <UUID>"]
        │
        ▼
POST /products  (Authorization: Bearer adminAccessToken)
   └─ sets: customProductId  ──────────────────────────────► Section 04 (Add to Cart, Checkout)

POST /products  (intentionally invalid body, still needs adminAccessToken)
   └─ expects: 422 VALIDATION_ERROR
```

---

## Notes on Price Constraint

The `price: 149.99` value in Create Product is **load-bearing** across two sections:

```
Section 03: POST /products → price: 149.99
                                    │
                                    ▼
Section 04: Step 2 → quantity: 2
                                    │
                                    ▼
Section 04: Step 3 → assert amount === 149.99 × 2 === 299.98
```

Changing the price in section 03 without updating the assertion in section 04 will cause a test failure.

---

## Common Failure Scenarios

| Scenario | Symptom | Root Cause |
|----------|---------|------------|
| `adminAccessToken` not set | Create Product returns 401 | Admin login (01.3) was skipped or failed |
| Regular user token used for Create Product | Returns 403 instead of 201 | Wrong token variable in request header |
| DB has no seeded products | Get All Products ID extraction fails | Seed script not run |
| Price changed from `149.99` | Section 04 checkout total assertion fails | Coupling between sections 03 and 04 |
