# FoodMind implementation handoff

**Snapshot:** 15 November 2026, commit `e818303` (`Merged`). The working tree was clean when this handoff was started.

## 1. Current state and scope

FoodMind is an Expo/React Native application with customer, restaurant-partner, and rider areas, backed by an Express/MySQL API. Core ordering is API-backed; several surrounding features retain their local demo implementations.

The current version is the **simplified implementation with backend Mapbox integration**. The later interactive-map/multi-restaurant expansion was explicitly discarded and reverted at the user's request.

### Retained

- API authentication, role guards, JWT refresh, and mobile session restoration.
- Customer addresses, order creation/history/tracking/cancellation, and best-effort review submission.
- Partner order acceptance/rejection/preparation/ready/delay and restaurant availability.
- Rider availability/location pings, direct delivery offers, pickup-code verification, and delivery completion.
- Shared Gemini transport/parsing, separate conversational chat and preferences recommendations.
- Backend Mapbox geocoding, road routes, distance, and ETA calculation.
- Cleanup of duplicate AI HTTP infrastructure, unused code/exports, obsolete mobile Context files, and repeated reads/SQL.
- Fixes for stored-procedure offer results, partial address PATCH, and pooled database actor cleanup.

### Rolled back / absent

- Interactive Mapbox tiles, address pin picker, and `react-native-webview` dependency.
- Nearby-restaurant discovery/filtering and API-driven multi-restaurant menus/carts.
- New delivery-distance limits, three-second polling, adjustable rider pins, and simulated rider movement.
- Extra customer fixtures, demo-pin addresses, `riders.is_demo`, and the `api:seed-demo` command.
- `/api/v1/maps/config` and `/rider/orders/:id/demo-trip` endpoints.

These are not unfinished pieces still present in the code. Reintroducing them requires a new request.

## 2. Repository and entry points

```text
apps/mobile/
  src/App.js                  Redux, safe areas, storage hydration, navigation
  src/navigation/             Role-specific tabs and detail stacks
  src/screens/                Customer, restaurant, rider, authentication screens
  src/redux/                  Slices, session handling, API/order thunks
  src/services/               HTTP client and AI client
  src/storage/                AsyncStorage hydration and batched persistence
  src/data/                   Local catalog and demo data
  android/, ios/              Generated native projects
  tests/                      Jest tests
apps/api/
  index.js                    HTTP startup, WebSocket attachment, offer worker
  src/app.js                  Express middleware and route mounting
  src/routes/                 Endpoint schemas and handlers
  src/services/               Business rules, providers, dispatch
  src/middleware/             JWT/roles, validation, errors
  src/db.js                   MySQL pool and actor-aware transactions
  test/                       Node tests and real-database smoke flow
database/
  schema.sql                  Tables, constraints, triggers, procedures, views
  seed.sql                    Original demo fixtures
  reset_test_db.ps1           Recreates only foodmind_test
  test_schema.py              Database invariant tests
```

Stack: Expo SDK 58, React Native 0.88, React 19.3, Redux Toolkit, React Navigation, Express 5, mysql2, Zod, bcryptjs, jsonwebtoken, and ws 7. Local environment inspected: Windows, Node `24.14.0`, npm `11.9.0`.

## 3. Run locally — Windows Command Prompt

Repository path on the current machine:

```cmd
cd /d "C:\Users\rafey\OneDrive\Desktop\project\FoodMind"
```

Dependencies are already installed locally. For a fresh checkout, run `npm ci` from the root.

**CMD window 1 — API:** MySQL must already be running with the application schema/data available.

```cmd
npm run api
```

**CMD window 2 — health and Android app:** start an emulator through Android Studio's Device Manager first.

```cmd
curl http://localhost:3001/api/v1/health
set "EXPO_PUBLIC_API_URL=http://10.0.2.2:3001"
set "EXPO_PUBLIC_API_ENABLED=true"
npm run android
```

Health should report `status: "ok"` and `database: "connected"`. `10.0.2.2` points from the Android emulator to the host computer.

For an already installed build, `npm start` starts Metro; press `a` to connect Android. `npm run web` provides a browser preview. `npm run android:setup` prepares the project-local Windows Ninja tool when needed.

### Configuration

- Server configuration: `apps/api/.env`, template `apps/api/.env.example`.
- Mobile configuration: optional `apps/mobile/.env`, template `apps/mobile/.env.example`; CMD environment variables also work.
- Keep existing `.env` values when updating the project; credentials/tokens are not reproduced here.

| Setting | Purpose / default |
| --- | --- |
| `PORT` | API port, `3001` |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | MySQL connection; application database defaults to `foodmind` |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Separate JWT secrets; local-development fallbacks exist in config |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | AI provider; model defaults to `gemini-3.5-flash` |
| `MAPBOX_ACCESS_TOKEN` | Server-side Geocoding v6 and Directions v5 |
| `MAPBOX_LANGUAGE`, `MAPBOX_COUNTRY` | `en`, `pk` |
| `DEFAULT_GEO_LAT`, `DEFAULT_GEO_LNG` | Demo address fallback: `31.5204`, `74.3587` |
| `PLATFORM_FEE` | `50` |
| `OFFER_RADIUS_M`, `OFFER_TIMEOUT_S` | Rider pickup search radius `5000` metres; offer expires after `30` seconds |
| `EXPO_PUBLIC_API_URL` | Host origin; Android default `http://10.0.2.2:3001` |
| `EXPO_PUBLIC_API_ENABLED` | Set `false` for local demo mode; API is also disabled by default under Jest |

## 4. Accounts and database state

The primary mobile E2E accounts all use password **`123456`**:

| Role | Email | Context |
| --- | --- | --- |
| Customer | `demo@food.com` | Primary customer |
| Partner | `partner@food.com` | Urban Bites |
| Rider | `rider@food.com` | Tariq Mehmood |

The original SQL seed also contains `ayesha@food.com` (customer), `bella@food.com` / `burgerlab@food.com` (partners), and `ahmed.rider@food.com` / `bilal.rider@food.com` (riders). They have backend credentials, but mobile listing/onboarding and local role behavior are primarily wired around the three primary accounts. Their existence does not mean a complete multi-restaurant mobile flow is implemented.

Original fixtures: **2 customers, 3 partners, 3 riders, 3 restaurants, and 18 menu items**. The mobile bundled catalog is Urban Bites-focused. Only the three primary accounts are bundled for offline sign-in.

The rollback removed the added Omar/Mariam accounts, four unused demo-pin addresses, and the `is_demo` column from the development database. Original address defaults and Ahmed's original seed position were restored. Existing development orders were preserved. No development-database reset was performed.

Database setup details are in `database/README.md`. Select/create the intended database before importing `schema.sql` and `seed.sql`; these are not incremental migration scripts.

## 5. Core behavior

### Authentication and persistence

- `apps/mobile/src/redux/session.js` attempts API login/registration first. Network failures (`ApiError.status === 0`) can fall back to local accounts; rejected credentials do not.
- `startSession()` installs the token listener, updates Redux, and dispatches customer/partner/rider synchronization.
- Access JWTs last **15 minutes**; refresh JWTs last **30 days**. Password hashing uses bcrypt cost 10.
- `services/api.js` attaches Bearer tokens, coordinates a shared refresh request, and retries an authenticated 401 once. Failed refresh clears the session.
- `storage/persistence.js` persists per-account slices and the user/session object through AsyncStorage. Tokens are also held in the HTTP client's in-memory session; this is not a SecureStore-based implementation.
- Root navigation chooses the appropriate stack from the signed-in role.

### Customer checkout

1. Browsing/cart data comes from the local catalog plus local menu edits.
2. `orderThunks.checkout()` validates cart availability/prices, the local restaurant switch, and a delivery address.
3. `apiThunks.loadRestaurantContext()` fetches API restaurants/menu, matches Urban Bites by normalized name, and caches that context in memory.
4. Cart dishes are matched to API menu IDs by normalized name; Extra Chicken is mapped to API options.
5. A local address without an `apiId` is created on the backend before order placement.
6. `POST /orders` recomputes authoritative prices and transactionally stores the order and item/option snapshots.
7. `apiOrderToLocal()` adapts the result into Redux; the cart is cleared.

Network-only failures can create a local demo order. API validation errors are returned to the screen. API-backed orders are marked `source: 'api'`; local orders typically have `FM...` identifiers. Check this distinction during manual testing so offline fallback is not mistaken for a successful backend flow.

Order idempotency is a process-local map keyed by customer and request key. It is not persisted across API restarts.

### Order lifecycle and dispatch

```text
placed -> preparing -> ready -> picked_up -> delivered
   |          partner actions       rider actions
   +-> rejected
   +-> cancelled
```

- Customer cancellation and partner rejection require `placed`.
- Acceptance records preparation minutes; a database trigger calculates `estimated_ready_at`. Delay pushes that timestamp back.
- Partner acceptance initiates nearest-rider dispatch; marking ready retries when no rider is assigned.
- Dispatch uses `offer_order_to_nearest_rider`: active/online rider, location newer than two minutes, configured pickup radius, no active delivery or pending offer, and no previous offer of that order to that rider.
- One pending offer per rider/order and one active order per rider are database-enforced. Accepting an offer assigns the rider and generates a four-digit pickup code.
- Decline dispatches to the next eligible rider. A worker checks expired offers every **5 seconds**. It does not generally retry orders that never received an initial offer.
- Pickup requires the assigned rider, `ready`, and the correct code. API pickup is a rider action, not a partner action.
- Delivery requires `picked_up`; the database marks cash collected, writes history, and awards delivery points. Reviews require delivery, are unique per order, and award review points.

Customer display status is mapped in `apps/api/src/utils/format.js`: `placed` becomes `Confirmed`, `ready` remains `Preparing`, and `picked_up` becomes `On the way`. Keep `dbStatus` and `partnerStage` when changing client code.

### Tracking, Mapbox, and realtime

- **Track Order still renders an SVG illustration, not Mapbox tiles.** There is no interactive location picker or native map SDK in this version.
- The backend uses Mapbox **Geocoding v6** and **Directions v5**, profile `mapbox/driving-traffic`. It returns `{ lat, lng }` route points, distance, and duration. Mapbox request coordinates are longitude-first.
- Geocoding uses `permanent=true` because address results are stored. The Mapbox account needs permanent-geocoding support.
- Routes are cached for 60 seconds by rounded origin/destination and requests time out after 10 seconds. Missing token, failed routing, or no route produces `provider: 'straight-line'` with estimated distance/time.
- Address creation can use supplied coordinates or geocoding. With no token, creation uses configured default coordinates. Updates preserve existing coordinates on no geocoding match. Provider exceptions still propagate; they are not the same as a no-match result.
- Tracking routes from the restaurant before pickup and from the stored rider point after pickup. ETA includes remaining preparation time. Closed orders return no route/ETA.
- Customer history/tracking, partner orders, and rider jobs use **10-second polling**. The mobile app has no WebSocket subscriber.
- The API exposes `ws://<host>:3001/api/v1/realtime?token=<accessToken>` and emits order/offer events. The smoke flow verifies a real delivery-offer event.
- Rider availability and stale-location refresh send the same fixed fallback point, **31.4697, 74.2728**. There is no GPS integration or movement simulator.

Historical provider check: a live Mapbox directions request succeeded; a live geocoding request returned HTTP 429. Provider/account status was not rechecked for this handoff. The special rate-limit UI/handling added during the discarded expansion is not retained.

### AI

- `POST /api/ai/chat` and `/api/v1/ai/chat`: prompt/history-based conversation; reply, title, up to eight recommendations, and follow-up suggestions.
- `POST /api/ai/recommendations` and `/api/v1/ai/recommendations`: preferences-based ranking; up to five recommendations. The standalone preferences handler does not consume the supplied `prompt` field.
- Both use `services/gemini.js` for HTTP transport, structured JSON parsing, and valid/deduplicated menu-ID filtering. Their request builders and output policies remain distinct.
- Mobile chat falls back to its deterministic local menu matcher when unavailable.
- Production Express routes are now exercised by API HTTP tests; the duplicate legacy chat HTTP server was removed.

## 6. API surface

Domain paths below are relative to `/api/v1`, except the additional unversioned AI aliases. Operations paths are absolute. Braces in a route denote the listed alternative suffixes. Errors use `{ error, details? }`; successful resource responses generally use the wrapper shown.

| Group | Routes | Response / behavior |
| --- | --- | --- |
| Auth | `POST /auth/register`, `/auth/login`, `/auth/refresh`; `GET /auth/me` | Token pair + user; `/me` returns `{ user }` |
| Catalog | `GET /restaurants`, `/restaurants/:id`, `/restaurants/:id/menu`, `/menu-items/:id`, `/cuisines`, `/tags` | Restaurants, restaurant/menu/items, or reference arrays; no customer-radius filtering |
| Addresses (customer) | `GET/POST /addresses`; `PATCH/DELETE /addresses/:id`; `POST /addresses/:id/default`, `/addresses/geocode`, `/addresses/reverse-geocode` | Lists, address result/ID, or `{ location }` |
| Orders (customer) | `POST /orders/quote`; `POST/GET /orders`; `GET /orders/:id`, `/orders/:id/tracking`; `POST /orders/:id/cancel`, `/orders/:id/review` | Quote/order/list; tracking returns `{ order, route, eta, estimatedDeliveryAt }` |
| Partner | `GET /partner/dashboard`, `/partner/orders`, `/partner/orders/:id`; `POST /partner/orders/:id/{accept,reject,ready,delay}`; `PATCH /partner/restaurant/availability` | Dashboard/stats, orders, updated order, or availability |
| Rider | `GET /rider/status`; `PATCH /rider/online`; `POST /rider/location`; `GET /rider/offers/current`; `POST /rider/offers/:id/respond`; `GET /rider/orders`, `/rider/orders/active`, `/rider/orders/:id`; `POST /rider/orders/:id/{pickup,delivered}`; `GET /rider/earnings` | Profile, offer, assigned/active orders, completion, or earnings |
| AI | `POST /ai/chat`, `/ai/recommendations` | Chat object or `{ recommendations }`; also mounted at `/api/ai/*` |
| Operations | `GET /`, `/health`, `/api/v1/health` | Root metadata or database health |

Backend role/ownership guards apply independently of client filtering. A client wrapper being present does not mean its screen integration is complete; rider earnings/history and several detail/reference wrappers are not fully consumed by mobile UI.

## 7. Verification and manual flow

**Last verified after rollback:** source check **137 files**, mobile **165 tests / 8 suites**, API **22 tests**, and real-database smoke **23 checks**, all passing. Tests were not rerun solely to author this document.

```cmd
npm run check
npm test
npm run api:smoke
```

For a clean isolated test fixture:

```cmd
npm run api:test-db
npm run api:smoke
```

`api:test-db` drops/recreates **foodmind_test**, not the development database. The reset script defaults to a MySQL 8.4 executable path and accepts connection parameters/environment overrides (`MYSQL_ROOT_USER`, `MYSQL_ROOT_PASSWORD`). The smoke flow uses `foodmind_test` unless `SMOKE_DB_NAME` overrides it, writes lifecycle test data, starts a temporary API/WebSocket server, and disables Mapbox calls. API provider tests use mocked responses. Database invariant tests in `database/test_schema.py` are also mutating and should use a disposable database.

Manual primary-account E2E:

1. Confirm API/database health, then sign in as customer and place a new API order.
2. Sign in as rider and go online so the API receives a fresh location.
3. Sign in as partner, accept and mark ready.
4. Sign in as rider and accept the offer before its 30-second expiry.
5. Read the generated pickup code from the partner order screen, enter it as rider, and complete delivery.
6. Return to customer tracking/history, verify delivery/cash collection, and review.

One-emulator account switching is timing-sensitive because offers expire and location freshness is enforced. Emulator testing is owned by the user; no emulator session needs to be started by the next agent unless requested.

## 8. Known limitations and continuation notes

- Mobile browsing, cart fees and restaurant context remain single-restaurant/local-first. Backend support for three seeded restaurants is not a complete multi-restaurant mobile feature.
- API order mapping still uses local dish names for presentation. Checkout's restaurant/menu context is cached in memory without expiry.
- `selectPartnerOrders` combines cached Redux orders without restaurant scoping. Backend reads/mutations are ownership-checked, but multi-partner UI isolation needs work before expanding that flow.
- Partner overview callbacks treat async transition results as truthy promises in some navigation paths; dedicated order screens await results. This was not changed by the retained cleanup.
- Customer sync can reselect the default address and keeps local addresses when the API returns an empty list. Broader synchronization/race handling remains basic.
- Reviews are stored locally and submitted to the API best-effort; review history is not loaded from the API. Photos/documents remain device-local; mobile delivery completion does not upload the chosen proof photo.
- Partner/rider onboarding, menu/profile edits, community deliveries, support, bids, rewards UI and rider earnings retain local/demo behavior. API registration creates role rows but is not full restaurant/document onboarding.
- Mobile API enablement does not eliminate offline fallback. Use numeric API orders and `source: 'api'` to distinguish real backend activity.
- Keep database triggers, conditional status updates, ownership checks, historical item snapshots, and the shared pricing calculation intact during future simplification.
- The preferred implementation style is small, explicit helpers and named domain operations. The user's latest decision was to keep the simplified baseline and discard the larger map/marketplace expansion.

### Where to start in code

- Client transport: `apps/mobile/src/services/api.js`
- Sessions/persistence: `apps/mobile/src/redux/session.js`, `apps/mobile/src/storage/persistence.js`
- API integration and order mapping: `apps/mobile/src/redux/apiThunks.js`, `apiOrderMap.js`, `orderThunks.js`
- Partner mutations: `apps/mobile/src/redux/partnerSlice.js`
- Map illustration/polling: `apps/mobile/src/components/customer/DeliveryMap.js`, `screens/customer/TrackOrderScreen.js`
- Server wiring: `apps/api/index.js`, `apps/api/src/app.js`
- Business behavior: `apps/api/src/services/orders.js`, `partners.js`, `riders.js`, `dispatch.js`
- Provider integrations: `apps/api/src/services/maps.js`, `gemini.js`, `chat.js`, `ai.js`
- DB transactions/formatting: `apps/api/src/db.js`, `apps/api/src/utils/format.js`
- Invariants/dispatch procedure: `database/schema.sql`
- Regression coverage: `apps/api/test/{chat,maps,services}.test.js`, `apps/api/test/smoke.js`, `apps/mobile/tests/`
