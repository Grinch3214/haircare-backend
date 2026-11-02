# Haircare API

Reference for frontend developers: what each endpoint accepts and returns.

Status: **register, login, `/users/me`.** Token refresh, catalog and Google sign-in are not implemented yet.

## Basics

| | |
|---|---|
| Base URL (local) | `http://localhost:3000` |
| Format | JSON in, JSON out. Send `Content-Type: application/json` |
| Allowed origin | the value of `CLIENT_URL` on the server (local: `http://localhost:5173`) |
| Credentials | send `credentials: 'include'` (fetch) / `withCredentials: true` (axios). Not used yet, required once the refresh cookie lands |

### Authentication

Login and register return an `accessToken` (JWT, valid **15 minutes**).

- Keep it **in memory** (a Pinia store, a variable). Not in `localStorage`.
- Send it on protected requests: `Authorization: Bearer <accessToken>`.
- Its payload is readable on the frontend (base64), e.g. to check expiry:
  ```json
  { "sub": "<user id>", "role": "user", "iat": 1793555549, "exp": 1793556449 }
  ```
  `iat` / `exp` are Unix seconds. Never trust it for security decisions — the backend checks everything again.

> Until refresh is implemented, after 15 minutes protected requests return `401` and the user has to log in again.

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

### `POST /auth/register`

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

### `POST /auth/login`

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

### 🔒 `GET /users/me`

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

## Example (fetch)

```ts
async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  if (!res.ok) throw data as ApiError;
  return data as AuthResponse;
}

async function getMe(accessToken: string): Promise<PublicUser> {
  const res = await fetch(`${API_URL}/users/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    credentials: 'include',
  });

  const data = await res.json();
  if (!res.ok) throw data as ApiError;
  return data as PublicUser;
}
```
