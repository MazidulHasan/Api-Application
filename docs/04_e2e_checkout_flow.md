# 04. E2E Checkout Flow

**Collection Section:** `04. E2E Checkout Flow`
**Source:** `Practice_API_Collection.json`

This is the most complex section of the entire API suite. It is a **4-step sequential workflow** where every step feeds the next. The section also converges dependencies from all three previous sections. A single failure anywhere in the upstream chain will cascade through every step below it.

---

## How to Run This Section

```
Prerequisites (ALL of the following must complete successfully first):
  ✓ Section 01 — Step 1: Register New Dynamic User   (creates user account in DB)
  ✓ Section 01 — Step 2: Login Dynamic User           (sets accessToken)
  ✓ Section 01 — Step 3: Validate Admin Login         (sets adminAccessToken)
  ✓ Section 03 — Step 2: Create Product using Admin   (sets customProductId, product price = 149.99)

Internal execution order (steps are numbered and must run in sequence):
  Step 1: DELETE /cart            ← clears leftover cart state
  Step 2: POST   /cart            ← adds customProductId at quantity 2
  Step 3: POST   /checkout        ← converts cart to order, total must = 299.98
  Step 4: GET    /orders          ← verifies new order appears in history
```

> **If any internal step fails, do not skip ahead.** Each step builds state that the next step depends on.

---

## Endpoints

---

### Step 1 — Clear Pre-existing Cart

#### Prerequisites

> **Must run after:** `Login Dynamic User` (Section 01, Step 2)
>
> **Required environment variables:**
> | Variable | Set By | If Missing |
> |----------|--------|------------|
> | `accessToken` | Login Dynamic User (01.2) | API returns `401 Unauthorized` |
>
> **Purpose of this step:**
> This is a **setup/teardown step**, not a feature test. Its sole purpose is to ensure the cart is empty before step 2 adds items. Without this:
> - Leftover items from a previous test run will still be in the cart
> - The checkout total in step 3 will include those extra items
> - The `amount === 299.98` assertion will fail because the actual total will be higher

| Field | Value |
|-------|-------|
| **Method** | `DELETE` |
| **URL** | `{{baseUrl}}/cart` |
| **Auth** | `Bearer {{accessToken}}` |

#### Request Headers

| Header | Value | Required |
|--------|-------|----------|
| `Authorization` | `Bearer {{accessToken}}` | Yes |

#### Request Body

None — the entire cart belonging to the authenticated user is cleared.

#### Expected Response — `200 OK`

No specific body structure is asserted — only the status code is checked.

```json
{}
```
or
```json
{ "message": "Cart cleared" }
```

#### Assertions

| Test | Expected | Implication If It Fails |
|------|----------|------------------------|
| Status is 200 | `200 OK` | Cart could not be cleared — step 2's add operation may stack on dirty state |

#### What This Step Produces

| Side Effect | Description |
|-------------|-------------|
| Cart is empty | Server-side cart state for this user is wiped — allows step 2 to build a clean, predictable cart |

---

### Step 2 — Add Extracted Product to Cart

#### Prerequisites

> **Must run after:**
> 1. `Login Dynamic User` (Section 01, Step 2) — provides `accessToken`
> 2. `Create Product using Admin` (Section 03, Step 2) — provides `customProductId` with price `149.99`
> 3. `Clear Pre-existing Cart` (This section, Step 1) — ensures cart is empty before adding
>
> **Required environment variables:**
> | Variable | Set By | If Missing |
> |----------|--------|------------|
> | `accessToken` | Login Dynamic User (01.2) | API returns `401 Unauthorized` |
> | `customProductId` | Create Product (03.2) | `productId` field is `undefined` — API likely returns `404` or `400` |
>
> **What happens if `customProductId` is missing:**
> - The request body sends `"productId": "undefined"` (as a literal string)
> - The API will likely return `404 Not Found` (product does not exist) or `400 Bad Request`
> - Step 3 (checkout) will either have an empty cart or a broken cart state — assertion for total `299.98` fails
>
> **What happens if Step 1 (DELETE /cart) was skipped:**
> - Old items remain in the cart
> - Cart response body will contain extra items from previous runs
> - The item quantity assertion may still pass, but the checkout total in step 3 will be wrong

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **URL** | `{{baseUrl}}/cart` |
| **Auth** | `Bearer {{accessToken}}` |
| **Content-Type** | `application/json` |

#### Request Headers

| Header | Value | Required |
|--------|-------|----------|
| `Authorization` | `Bearer {{accessToken}}` | Yes |
| `Content-Type` | `application/json` | Yes |

#### Request Body

```json
{
  "productId": "{{customProductId}}",
  "quantity": 2
}
```

#### Request Body Field Reference

| Field | Type | Required | Value | Constraint |
|-------|------|----------|-------|------------|
| `productId` | string | Yes | `{{customProductId}}` | Product must exist in DB (created in section 03) |
| `quantity` | integer | Yes | `2` | **Must be `2`** — checkout total assertion relies on `149.99 × 2 = 299.98` |

> **Critical:** The `quantity: 2` is hardcoded. Changing it will break the `amount === 299.98` assertion in step 3.

#### Expected Response — `200 OK`

```json
{
  "cart": {
    "items": [
      {
        "productId": "prod_xyz789",
        "quantity": 2
      }
    ]
  }
}
```

#### Response Field Reference

| Field | Type | Description |
|-------|------|-------------|
| `cart` | object | The updated cart state |
| `cart.items` | array | All items currently in the cart |
| `cart.items[].productId` | string | Product ID of each item |
| `cart.items[].quantity` | integer | Quantity of each item |

#### Assertions

| Test | Expected | Implication If It Fails |
|------|----------|------------------------|
| Status is 200 | `200 OK` | Item not added to cart |
| Cart contains item where `productId === customProductId` | Item found in `items` array | Product was not added or wrong product ID used |
| `item.quantity` equals `2` | Exact match | Wrong quantity — checkout total will be wrong |

#### What This Step Produces

| Side Effect | Description |
|-------------|-------------|
| Cart contains product | Server-side cart now has `customProductId` at quantity `2`, priced at `149.99` each |

---

### Step 3 — Checkout Order

#### Prerequisites

> **Must run after:**
> 1. `Login Dynamic User` (Section 01, Step 2) — provides `accessToken`
> 2. `Clear Pre-existing Cart` (This section, Step 1) — ensures no stale items
> 3. `Add Extracted Product to Cart` (This section, Step 2) — cart must be non-empty with exactly `customProductId × 2`
>
> **Required environment variables:**
> | Variable | Set By | If Missing |
> |----------|--------|------------|
> | `accessToken` | Login Dynamic User (01.2) | API returns `401 Unauthorized` |
>
> **Required server-side state:**
> - Cart must be non-empty (populated in step 2)
> - Cart must contain only `customProductId` at quantity `2` (step 1 cleared any stale data, step 2 added exactly this)
> - Product `customProductId` must be priced at exactly `149.99` (set during creation in section 03)
>
> **What happens if cart is empty:**
> - Checkout may return `400 Bad Request` (nothing to check out) or create a `$0` order
> - The `amount === 299.98` assertion fails

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **URL** | `{{baseUrl}}/checkout` |
| **Auth** | `Bearer {{accessToken}}` |

#### Request Headers

| Header | Value | Required |
|--------|-------|----------|
| `Authorization` | `Bearer {{accessToken}}` | Yes |

#### Request Body

**None** — the checkout endpoint reads the cart from server-side state. The items to order are determined by the authenticated user's current cart (populated in step 2).

#### Expected Response — `201 Created`

```json
{
  "orderId": "ord_def456",
  "amount": 299.98,
  "status": "confirmed"
}
```

#### Response Field Reference

| Field | Type | Description | Constraint |
|-------|------|-------------|------------|
| `orderId` | string | Unique identifier for the newly created order | Must be present — used in step 4 |
| `amount` | number | Total order cost in USD | Must be exactly `299.98` = `149.99 × 2` |
| `status` | string | Order lifecycle status | Must be `"confirmed"` immediately |

#### How `amount` Is Calculated

```
product price × quantity = total
   149.99    ×     2     = 299.98
```

This calculation depends on:
- Product priced at `149.99` (hardcoded in Section 03, Step 2)
- Quantity `2` (hardcoded in this section, Step 2)
- No other items in cart (Step 1 ensured this)

#### Assertions

| Test | Expected | Implication If It Fails |
|------|----------|------------------------|
| Status is 201 | `201 Created` | Order not created — checkout failed |
| `amount` equals `299.98` | Exact float match | Cart had wrong items, wrong quantity, or wrong product price |
| `orderId` is present | Property exists | No order ID — step 4 cannot verify the order |
| `status` is `"confirmed"` | Exact match | Order created but in unexpected state |

#### What Runs After Response (Order ID Capture Script)

```js
var jsonData = pm.response.json();
pm.environment.set("latestOrderId", jsonData.orderId);
```

#### What This Step Produces (Used Downstream)

| Variable | Used By |
|----------|---------|
| `latestOrderId` | GET /orders (Step 4) — to verify the order appears in history |

---

### Step 4 — Verify Order Appears In History

#### Prerequisites

> **Must run after:**
> 1. `Login Dynamic User` (Section 01, Step 2) — provides `accessToken`
> 2. `Checkout Order` (This section, Step 3) — provides `latestOrderId` and creates the order record in DB
>
> **Required environment variables:**
> | Variable | Set By | If Missing |
> |----------|--------|------------|
> | `accessToken` | Login Dynamic User (01.2) | API returns `401 Unauthorized` |
> | `latestOrderId` | Checkout Order (04.3) | The verification assertion cannot match — will fail with `found = false` |
>
> **What happens if `latestOrderId` is missing:**
> - The API call still succeeds (returns `200` with the order list)
> - But the assertion `order.id === latestOrderId` fails because it is comparing against `undefined`
> - This is a silent dependency failure — the request appears to work but the test fails

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **URL** | `{{baseUrl}}/orders` |
| **Auth** | `Bearer {{accessToken}}` |

#### Request Headers

| Header | Value | Required |
|--------|-------|----------|
| `Authorization` | `Bearer {{accessToken}}` | Yes |

#### Request Body

None — `GET` request.

#### Expected Response — `200 OK`

```json
[
  {
    "id": "ord_def456",
    "amount": 299.98,
    "status": "confirmed",
    "createdAt": "2026-05-29T10:05:00.000Z"
  }
]
```

Response is a **flat array** of order objects (not paginated in this test).

#### Response Field Reference

| Field | Type | Description |
|-------|------|-------------|
| Root | array | List of all orders belonging to the authenticated user |
| `[].id` | string | Order ID — compared against `latestOrderId` |
| `[].amount` | number | Order total |
| `[].status` | string | Order status |
| `[].createdAt` | string | Order creation timestamp |

#### Assertions

| Test | Expected | Implication If It Fails |
|------|----------|------------------------|
| Status is 200 | `200 OK` | Orders endpoint broken or token invalid |
| Array contains entry where `id === latestOrderId` | Found = `true` | Order was not persisted, or orders are scoped to wrong user |

#### What This Step Produces

Nothing — read-only verification step.

---

## Full Dependency Map for This Section

```
╔══════════════════════════════════════════════════════════════════════╗
║  UPSTREAM DEPENDENCIES (from other sections)                         ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                       ║
║  Section 01 — Register New Dynamic User                               ║
║    └─ creates user account in DB                                      ║
║                                                                       ║
║  Section 01 — Login Dynamic User                                      ║
║    └─ sets: accessToken ─────────────────────────────────┐           ║
║                                                           │           ║
║  Section 01 — Validate Admin Login                        │           ║
║    └─ sets: adminAccessToken ──────────────┐              │           ║
║                                            │              │           ║
║  Section 03 — Create Product               │              │           ║
║    └─ (needs adminAccessToken) ────────────┘              │           ║
║    └─ sets: customProductId (price: 149.99) ──────────────┼──┐       ║
║                                                           │  │       ║
╚═══════════════════════════════════════════════════════════╪══╪═══════╝
                                                            │  │
                                                            ▼  ▼
                                          Step 1: DELETE /cart
                                            needs: accessToken
                                            side effect: cart is empty
                                                            │
                                                            ▼
                                          Step 2: POST /cart
                                            needs: accessToken
                                            needs: customProductId
                                            body: quantity = 2
                                            side effect: cart has 1 item
                                                            │
                                                            ▼
                                          Step 3: POST /checkout
                                            needs: accessToken
                                            reads: server cart state
                                            asserts: amount = 149.99 × 2 = 299.98
                                            sets: latestOrderId
                                                            │
                                                            ▼
                                          Step 4: GET /orders
                                            needs: accessToken
                                            needs: latestOrderId
                                            asserts: order appears in list
```

---

## Cascade Failure Table

If a step fails, here is what breaks downstream:

| Failed Step | Immediate Effect | Cascade Effect |
|-------------|-----------------|----------------|
| Section 01 — Register | No user in DB | Login (01.2) returns 401, `accessToken` never set — **all 4 steps fail** |
| Section 01 — Login | `accessToken` not set | Steps 1, 2, 3, 4 all return 401 |
| Section 01 — Admin Login | `adminAccessToken` not set | Create Product (03.2) returns 401, `customProductId` never set |
| Section 03 — Create Product | `customProductId` not set | Step 2: cart add fails (invalid product ID) — steps 3 and 4 cascade |
| Step 1 — DELETE /cart | Cart not cleared | Step 3 total includes stale items — `amount !== 299.98` assertion fails |
| Step 2 — POST /cart | Cart empty | Step 3 checkout fails (empty cart) — `latestOrderId` never set |
| Step 3 — POST /checkout | `latestOrderId` not set | Step 4 assertion fails (`found = false`) |

---

## Common Failure Scenarios

| Scenario | Symptom | Root Cause |
|----------|---------|------------|
| `customProductId` is `undefined` in step 2 | Cart add returns 404/400 | Create Product (03.2) was skipped or failed |
| Checkout total is wrong (not `299.98`) | Step 3 `amount` assertion fails | Stale cart items (step 1 skipped) or product price changed |
| Order not found in history | Step 4 assertion fails | Order was not committed to DB, or user scope mismatch |
| `accessToken` expired between steps | Steps return 401 | Token TTL shorter than test suite runtime |
