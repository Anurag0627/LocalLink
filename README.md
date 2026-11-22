# LocalLink

LocalLink is a local services marketplace connecting customers with trusted professionals in their area. The project provides a responsive frontend, a versioned API, MongoDB connectivity, core marketplace data models, authentication, account/profile management, discovery, bookings, reviews, ratings, reporting, and administrative moderation.

## Technology stack

- **Frontend:** React, Vite, Tailwind CSS, React Router, Axios, Lucide React
- **Backend:** Node.js, Express, Mongoose, Zod, Pino, express-rate-limit, dotenv, CORS, Helmet
- **Development:** npm workspaces, concurrently, nodemon, ESLint
- **Database:** MongoDB with Mongoose

## Project structure

```text
client/
  public/
  src/
    assets/ components/ context/ hooks/ layouts/
    pages/ routes/ services/ utils/
    App.jsx
    index.css
    main.jsx
  .env.example
  package.json
server/
  src/
    config/
      env.js
      database.js
      logger.js
    controllers/
      auth.controller.js
      account.controller.js
      customerProfile.controller.js
      health.controller.js
      providerProfile.controller.js
    middlewares/
      asyncHandler.middleware.js
      auth.middleware.js
      error.middleware.js
      notFound.middleware.js
      requestLogger.middleware.js
      role.middleware.js
      trustedOrigin.middleware.js
      validate.middleware.js
    models/
      user.model.js
      refreshSession.model.js
      customerProfile.model.js
      providerProfile.model.js
      category.model.js
      service.model.js
      booking.model.js
      review.model.js
      index.js
      schemas/common.schemas.js
    repositories/
      account.repository.js
      auth.repository.js
      customerProfile.repository.js
      providerProfile.repository.js
      refreshSession.repository.js
    routes/
      account.routes.js
      auth.routes.js
      customerProfile.routes.js
      health.routes.js
      index.routes.js
      providerProfile.routes.js
    services/
      account.service.js
      auth.service.js
      customerProfile.service.js
      providerProfile.service.js
      token.service.js
    utils/
      ApiError.js
      ApiResponse.js
      authorization.utils.js
      mongo.utils.js
      object.utils.js
      profileMutation.utils.js
      token.utils.js
    validators/
      account.validator.js
      auth.validator.js
      common.validator.js
      profile.validator.js
    app.js
    server.js
  scripts/
    validate-auth.js
    validate-management.js
    validate-models.js
  .env.example
  package.json
eslint.config.js
package.json
```

## Installation

Install the workspace dependencies from the repository root:

```sh
npm install
```

## Environment configuration

The application does not include real `.env` files. Create local copies from the examples if you need to change the defaults. On Windows, use `Copy-Item` in PowerShell; on macOS/Linux, use `cp`.

`CLIENT_URL` accepts comma-separated origins. Production requires explicit `CLIENT_URL`, `MONGODB_URI`, a strong `ACCESS_TOKEN_SECRET`, and `COOKIE_SECURE=true`. The server also fails startup if MongoDB cannot be reached.

Generate a signing secret with a cryptographically secure random generator, for example:

```sh
node -e "console.log(require('node:crypto').randomBytes(64).toString('base64url'))"
```

Never commit the resulting secret.
When `ACCESS_TOKEN_SECRET` is blank in development, the server generates a per-process secret, so access tokens become invalid after a restart.

`server/.env.example`:

```dotenv
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MONGODB_URI=mongodb://127.0.0.1:27017/locallink
ACCESS_TOKEN_SECRET=
ACCESS_TOKEN_EXPIRES_IN=15m
ACCESS_TOKEN_ISSUER=LocalLink API
ACCESS_TOKEN_AUDIENCE=LocalLink Client
REFRESH_TOKEN_TTL_DAYS=7
COOKIE_NAME=locallink_refresh_token
COOKIE_SECURE=false
COOKIE_SAME_SITE=lax
```

For production, set `COOKIE_SECURE=true`. Cross-site deployments may require `COOKIE_SAME_SITE=none`, which also requires secure cookies and HTTPS. Refresh tokens are stored in HttpOnly cookies; access tokens are returned in API responses and should be handled by the client without persistent browser storage.

`client/.env.example`:

```dotenv
VITE_API_URL=http://localhost:5000/api
```

## Development commands

Run both applications concurrently:

```sh
npm run dev
```

Run only one application:

```sh
npm run dev:client
npm run dev:server
```

Build the frontend or lint both workspaces:

```sh
npm run build
npm run lint
```

The model-validation script uses an isolated MongoDB database whose name ends with `_test`. On Windows PowerShell, for example:

```powershell
$env:MODEL_TEST_MONGODB_URI = "mongodb://127.0.0.1:27017/locallink_model_test"
npm run test:models --workspace @locallink/server
```

Authentication validation also requires a dedicated database ending in `_test` and removes only documents it creates:

```powershell
$env:AUTH_TEST_MONGODB_URI = "mongodb://127.0.0.1:27017/locallink_auth_test"
npm run test:auth --workspace @locallink/server
```

User/profile management validation uses a separate isolated database ending in `_test`:

```powershell
$env:MANAGEMENT_TEST_MONGODB_URI = "mongodb://127.0.0.1:27017/locallink_management_test"
npm run test:management --workspace @locallink/server
```

These scripts do not drop their test databases.

The frontend is served by Vite at `http://localhost:5173`; the API listens on port `5000` by default. The backend connects to MongoDB before it starts accepting HTTP requests. Install and start MongoDB locally, or set `MONGODB_URI` to a reachable MongoDB connection URI before starting the API.

## Review APIs

Phase 8 adds review creation, retrieval, customer management, reporting, provider ratings, and administrative moderation.

- `POST /api/v1/reviews`
- `GET /api/v1/reviews/providers/:providerId`
- `GET /api/v1/reviews/services/:serviceId`
- `GET /api/v1/reviews/:reviewId`
- `GET /api/v1/reviews/my`
- `PATCH /api/v1/reviews/:reviewId`
- `DELETE /api/v1/reviews/:reviewId`
- `POST /api/v1/reviews/:reviewId/report`
- `GET /api/v1/providers/reviews`
- `GET /api/v1/providers/ratings`
- `GET /api/v1/admin/reviews`
- `PATCH /api/v1/admin/reviews/:reviewId/moderation`

Provider and service rating totals are recalculated from published, non-deleted review records after review and moderation changes. Standalone MongoDB deployments do not receive multi-document transactions; process-local serialization and authoritative recalculation provide the best available consistency.

## Frontend authentication setup

Set `VITE_API_BASE_URL` in `client/.env.local` or export it for Vite. It must include the backend API version prefix:

```dotenv
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

The frontend keeps access tokens only in memory and uses the backend HttpOnly refresh-token cookie with credentialed Axios requests. Authentication restoration uses `/auth/refresh` followed by `/auth/me`.

Run frontend tests with:

```sh
npm test
```

## Notification APIs

Phase 9 provides authenticated in-app notifications and notification preferences.

- `GET /api/v1/notifications`
- `GET /api/v1/notifications/unread-count`
- `GET /api/v1/notifications/:notificationId`
- `PATCH /api/v1/notifications/:notificationId/read`
- `PATCH /api/v1/notifications/read-all`
- `DELETE /api/v1/notifications/:notificationId`
- `GET /api/v1/notifications/preferences`
- `PATCH /api/v1/notifications/preferences`

Supported types are `BOOKING_CREATED`, `BOOKING_ACCEPTED`, `BOOKING_REJECTED`, `BOOKING_CANCELLED`, `BOOKING_COMPLETED`, `REVIEW_RECEIVED`, `REVIEW_HIDDEN`, `REVIEW_RESTORED`, and `SYSTEM`.

Notification preferences control in-app creation for booking, review, system, and all-in-app notifications. Preferences default to enabled. Booking and review services create notifications only after successful business operations.

Notification creation is best-effort and failures are logged without changing the result of an already committed booking or moderation operation. Standalone MongoDB deployments do not share notification creation in a transaction. A future transactional outbox can improve delivery consistency. Email, SMS, WebSockets, and push delivery are not implemented.

Run the isolated Phase 9 validation with:

```powershell
$env:PHASE9_TEST_MONGODB_URI="mongodb://127.0.0.1:27017/locallink_phase9_test"
npm run test:phase9 --workspace @locallink/server
```

## Health check

With MongoDB and the API running, request `GET http://localhost:5000/api/v1/health`. A successful response is:

```json
{
  "success": true,
  "message": "LocalLink API is running",
  "data": {
    "status": "healthy",
    "environment": "development",
    "database": {
      "status": "connected"
    }
  }
}
```

`GET /api/health` remains available with the Phase 1 response fields for compatibility. Both health endpoints return HTTP 503 when MongoDB is disconnected.

## Authentication API

All authentication endpoints are under `/api/v1/auth` and require the configured frontend `Origin` for state-changing requests:

- `POST /register` — register a customer or provider; providers receive a pending profile.
- `POST /login` — authenticate with email and password.
- `POST /refresh` — rotate the HttpOnly refresh-token cookie and return a new access token.
- `POST /logout` — revoke the refresh-token session and clear its cookie.
- `POST /logout-all` — revoke all refresh-token sessions for the authenticated user.
- `GET /me` — return the authenticated user and their customer/provider profile.

Access tokens are short-lived JWTs sent as `Authorization: Bearer <token>`. Refresh tokens are opaque, rotated on use, and stored only as SHA-256 hashes. Refresh-token reuse revokes the token family. Registration and login accept strict JSON payloads; provider registration additionally requires `businessName` and non-negative integer `experienceYears`.
Browser clients must send credentialed requests to the refresh and logout endpoints so the HttpOnly cookie is included.

## User and profile management API

All routes below require a valid access token. Customer and provider routes additionally enforce their respective roles. Profile ownership is determined from the authenticated account, never from a request-supplied user ID.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` / `PATCH` | `/api/v1/customers/profile` | Read or update customer personal details and profile image |
| `GET` / `POST` | `/api/v1/customers/addresses` | List or add an address |
| `PATCH` / `DELETE` | `/api/v1/customers/addresses/:addressId` | Update or remove an owned address |
| `PATCH` | `/api/v1/customers/addresses/:addressId/default` | Select the default address |
| `GET` / `PATCH` | `/api/v1/providers/profile` | Read or update provider business details |
| `GET` / `POST` | `/api/v1/providers/service-areas` | List or add service areas |
| `PATCH` / `DELETE` | `/api/v1/providers/service-areas/:areaId` | Update or remove an owned service area |
| `PATCH` | `/api/v1/providers/availability` | Change the provider's enquiry availability |
| `GET` / `PATCH` | `/api/v1/account` | Read or update account name and phone |
| `PATCH` | `/api/v1/account/change-password` | Verify and change the password |

Addresses and provider service areas remain embedded in their profile documents; they do not add collections. The first customer address becomes the default unless explicitly marked otherwise. Selecting a default clears other address flags, and deleting the default selects the first remaining address. Concurrent embedded-profile changes use optimistic concurrency and retry before returning a conflict.

Changing the password revokes refresh sessions and increments an internal token version, immediately invalidating existing access tokens as well. The token version and password hash are excluded from API responses.
