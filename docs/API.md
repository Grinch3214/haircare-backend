# Haircare API

Reference for frontend developers: what each endpoint accepts and returns.

Status: **auth (register, login, refresh, logout) and `/api/users/me`.** Catalog and Google sign-in are not implemented yet.

## Basics

| | |
|---|---|
| Base URL (local) | `http://localhost:3000/api` — every route below starts with `/api` |
| Format | JSON in, JSON out. Send `Content-Type: application/json` |
| Allowed origin | the value of `CLIENT_URL` on the server (local: `http://localhost:5173`) |
| Credentials | **required** on every `/api/auth/*` request: `credentials: 'include'` (fetch) / `withCredentials: true` (axios). Without it the browser neither stores nor sends the refresh cookie |

### Authentication

Two tokens:

| | Access token | Refresh token |
|---|---|---|
| What | JWT | random opaque string |
| Lifetime | **15 minutes** | **30 days**, renewed on every refresh |
| Where | response body → keep **in memory** (Pinia store). Not in `localStorage` | `refresh_token` cookie: `HttpOnly`, `SameSite=Lax`, `Path=/api/auth`. JS can't read it — the browser stores and sends it automatically |
| Used for | `Authorization: Bearer` on protected requests | `POST /api/auth/refresh` only |

Login, register and refresh return a new `accessToken` and set a new refresh cookie.

- Keep the access token **in memory** (a Pinia store, a variable). Not in `localStorage`.
- Send it on protected requests: `Authorization: Bearer <accessToken>`.
- Its payload is readable on the frontend (base64), e.g. to check expiry:
  ```json
  { "sub": "<user id>", "role": "user", "iat": 1793555549, "exp": 1793556449 }
  ```
  `iat` / `exp` are Unix seconds. Never trust it for security decisions — the backend checks everything again.

#### Session flow on the frontend

1. **App start / page reload** — the in-memory token is gone. Call `POST /api/auth/refresh`: `200` → logged in (you get `accessToken` + `user`, no need for `/api/users/me`); `401` → guest.
2. **Protected request returns `401`** → call `POST /api/auth/refresh` once, then retry the request with the new token. If refresh fails → log out on the frontend.
3. **Never run two refreshes at once.** Each refresh invalidates the previous cookie, so the second parallel call gets `401`. Keep one shared in-flight promise (see the example below). Two browser tabs can still race — the losing tab just refreshes again on its next `401`.
4. **Logout** → `POST /api/auth/logout`, then drop the in-memory token.

Protected endpoints (marked 🔒 below) return `401` when:

| `message` | Cause |
|---|---|
| `"Missing access token"` | no `Authorization` header, or it doesn't start with `Bearer ` |
| `"Invalid or expired access token"` | token expired, malformed, or tampered with |

### Errors

Every error has the same shape:

```ts
type ApiError = {
  statusCode: number;
  error: string;               // "Bad Request", "Unauthorized", ...
  message: string | string[];  // string[] only for 400 validation errors
};
```

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": [
    "email must be an email",
    "password must be longer than or equal to 8 characters"
  ]
}
```

| Status | Meaning |
|---|---|
| `400` | request body failed validation; `message` lists every problem. Unknown fields are rejected too |
| `401` | wrong credentials / missing or expired token |
| `403` | authenticated, but not allowed (e.g. blocked user) |
| `409` | conflict with existing data (e.g. email taken) |

## Types

```ts
type PlatformRole = 'user' | 'superadmin';

type PublicUser = {
  id: string;               // uuid
  email: string;            // always lowercase
  name: string | null;
  phone: string | null;
  avatarUrl: string | null; // null → show the default avatar
  role: PlatformRole;
};

type AuthResponse = {
  accessToken: string;
  user: PublicUser;
};
```

Store roles (`admin` / `master` in a specific store) are not part of `PublicUser` yet.

## Endpoints

### `POST /api/auth/register`

Creates a user with role `user` and logs them in.

**Body**

| Field | Type | Rules |
|---|---|---|
| `email` | string | required, valid email, max 254. Trimmed and lowercased |
| `password` | string | required, 8–128 chars |
| `name` | string | optional, 1–100 chars, trimmed |

```json
{ "email": "anna@example.com", "password": "supersecret1", "name": "Анна" }
```

**`201 Created`** → `AuthResponse`

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "c260c9c9-2b52-4b1c-848e-0ff80d1fbcc2",
    "email": "anna@example.com",
    "name": "Анна",
    "phone": null,
    "avatarUrl": null,
    "role": "user"
  }
}
```

**Errors**

| Status | `message` | When |
|---|---|---|
| `400` | `string[]` | validation failed, or an unknown field was sent (e.g. `role`) |
| `409` | `"Email already registered"` | email taken (case-insensitive) |

### `POST /api/auth/login`

**Body**

| Field | Type | Rules |
|---|---|---|
| `email` | string | required, valid email. Trimmed and lowercased |
| `password` | string | required, max 128. No minimum length on login |

```json
{ "email": "anna@example.com", "password": "supersecret1" }
```

**`200 OK`** → `AuthResponse` (same as register)

**Errors**

| Status | `message` | When |
|---|---|---|
| `400` | `string[]` | validation failed |
| `401` | `"Invalid email or password"` | no such email **or** wrong password — intentionally the same, show one generic message |
| `403` | `"User is blocked"` | account blocked by an admin |

### 🔒 `GET /api/users/me`

Returns the current user. Use it on app start to restore the session and to refresh profile data.

**Headers:** `Authorization: Bearer <accessToken>`

**`200 OK`** → `PublicUser`

```json
{
  "id": "8e5ca49a-9e1c-4103-b5f3-5efc125ed78a",
  "email": "admin@gmail.com",
  "name": null,
  "phone": null,
  "avatarUrl": null,
  "role": "superadmin"
}
```

**Errors**

| Status | `message` | When |
|---|---|---|
| `401` | see [Authentication](#authentication) | missing / invalid / expired token |
| `401` | `"User no longer exists"` | token is valid but the user was deleted |

### `POST /api/auth/refresh`

Exchanges the refresh cookie for a new access token. The cookie is rotated: the old one stops working immediately.

**Body:** none. **Cookie:** `refresh_token` (sent by the browser automatically with `credentials: 'include'`).

**`200 OK`** → `AuthResponse` + new `refresh_token` cookie

**Errors** (the cookie is cleared on every error)

| Status | `message` | When |
|---|---|---|
| `401` | `"Missing refresh token"` | no cookie (never logged in, logged out, or `credentials` not set) |
| `401` | `"Invalid or expired refresh token"` | expired, already used, or the session was revoked (logout / logout-all) |
| `403` | `"User is blocked"` | account blocked — all its sessions are revoked |

### `POST /api/auth/logout`

Ends the current session (this browser). Works without an access token, so an expired user can still log out.

**Body:** none. **Cookie:** `refresh_token`.

**`204 No Content`** — always, even if there was no cookie. The cookie is cleared.

### 🔒 `POST /api/auth/logout-all`

Ends **all** sessions of the user on every device (e.g. "sign out everywhere" after a password leak). Already issued access tokens keep working until they expire (≤ 15 min).

**Headers:** `Authorization: Bearer <accessToken>`

**`204 No Content`** — the cookie is cleared.

**Errors:** `401` — see [Authentication](#authentication).

## Example (fetch)

```ts
async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  if (!res.ok) throw data as ApiError;
  return data as AuthResponse;
}

let refreshing: Promise<AuthResponse> | null = null;

// One shared refresh for every caller that got 401 at the same time
function refresh(): Promise<AuthResponse> {
  refreshing ??= fetch(`${API_URL}/api/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  })
    .then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw data as ApiError;
      return data as AuthResponse;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

async function getMe(accessToken: string): Promise<PublicUser> {
  const res = await fetch(`${API_URL}/api/users/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    credentials: 'include',
  });

  const data = await res.json();
  if (!res.ok) throw data as ApiError;
  return data as PublicUser;
}
```
