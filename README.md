# FoodMind

React Native app using Expo, React Navigation, Redux Toolkit, and AsyncStorage, with an Express/MySQL API for authentication, orders, rider dispatch, Mapbox routing, and AI. The customer frontend follows the supplied 27-screen customer PDF. The partner frontend covers all 12 designs in `owner screens - Google Slides.pdf`, extending the original dashboard, manage-menu screen, and menu-item editor. The original catalog, assets, customer layouts, and cart calculations are retained.

## Repository layout

```text
FoodMind/
  apps/
    mobile/   Expo app (source, native projects, tests, build scripts)
    api/      Express API (auth, orders, dispatch, Mapbox, AI)
  database/   MySQL schema, seed data, ERDs, and schema tests
  package.json
```

All commands in this README run from the repository root unless stated otherwise. Mobile source paths such as `src/`, `android/`, and `tmp/` are relative to `apps/mobile/`.

## Changes in this version

- **State and storage.** One persistence layer (`src/storage/persistence.js`) replaces the four storage wrappers. Each saved key loads independently; unreadable data is copied to a `.corrupt-<time>` backup instead of being overwritten. Writes are batched and only changed slices are saved. The session (`foodmind_session_v1`) and registered accounts (`foodmind_accounts_v1`) are now saved too.
- **Account isolation.** Carts are kept per account (`foodmind_cart_v2`) and swapped on sign-in and sign-out. Orders record the customer's email; customers see only their own orders while the partner sees all of them.
- **Redux.** Memoized selectors (`createSelector`) for the menu, cart bill and partner orders; one `userKey` helper; `updateUser` for profile edits; order creation, demo progress and cancellation live in `redux/orderThunks.js`; rider accounts are prepared at sign-in (`redux/session.js`), not while rendering.
- **One order lifecycle.** The customer's demo control moves orders through the same stages as the partner (accept → ready → picked up → delivered), so both portals always agree. Points are awarded when an order is delivered.
- **Checkout.** Cart prices follow the current menu; hidden or deleted dishes are flagged and removed before ordering; ordering is blocked while the restaurant's online switch is off.
- **UI consistency.** One colour palette (`theme/colors.js`), one type scale (`theme/typography.js`), FontAwesome icons instead of Unicode symbols, one back button, one screen frame for all roles, prices always formatted as "Rs. 1,250", and form errors shown directly above the button that triggers them.
- **Build.** `metro.transformer.js` resolves Expo's Babel transformer for SVG support; without it Metro could not bundle the app after a clean `npm ci`.

## Run on the Android Studio emulator

Dependencies are installed, and `android/` contains the generated native project.

1. Open Android Studio's Device Manager and start a phone emulator.
2. Open a PowerShell terminal in this project folder.
3. Run `npm run android` for the first native build and launch. The first build downloads Android/Gradle dependencies and can take several minutes.
4. For subsequent development sessions, start the installed FoodMind app in the emulator and run `npm start`. Press `a` in the Expo terminal to connect Android.

You can also open the `apps/mobile/android/` folder in Android Studio and run its `app` configuration while `npm start` is running.

On Windows, `npm run android` automatically prepares a checksum-verified, project-local Ninja 1.13.2 copy. This handles the [native library's documented Windows path limitations](https://docs.swmansion.com/react-native-reanimated/docs/guides/building-on-windows/). The global Android SDK tools are unchanged. If `apps/mobile/tmp/` is cleared, run `npm run android:setup` before building directly in Android Studio. The local Expo config plugin preserves the build settings when native projects are regenerated.

The project uses Expo SDK 58, React Native 0.88, and React 19.3. The installed Node 26 is supported by this SDK. Android SDK and Java are supplied by your existing Android Studio setup. See the official [Expo Android emulator guide](https://docs.expo.dev/workflow/android-studio-emulator/) for emulator setup.

For an optional browser preview, use `npm run web`.

## Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Customer | `demo@food.com` | `123456` |
| Restaurant partner | `partner@food.com` | `123456` |
| Rider | `rider@food.com` | `123456` |

Registration and sign-in keep the local account implementation. All three roles use the same Sign In screen; the role on the account opens its matching area after sign-in. New registrations and the signed-in session are saved on the device, so they survive an app restart. Saved profile details are restored after signing back in with the same email.

The demo partner opens the dashboard directly. **Store > Restaurant registration & status** opens its registration flow. A newly registered partner starts with restaurant registration after signing in.

## Customer screen coverage

| PDF # | Screen | Implementation / entry point |
| --- | --- | --- |
| 01 | Splash | Existing onboarding |
| 02 | Login | Existing sign-in |
| 03 | Sign Up | Existing registration |
| 04 | Home | Existing Home tab |
| 05 | Search Results | Existing Search tab; natural-language budget filters added |
| 06 | No Match | New empty-result design in Search; also a registered screen |
| 07 | AI Assistant | Chat screen: starter prompts, follow-up chips, new chat |
| 08 | AI Recommendations | Shown inside the chat as a titled dish grid with Show more and feedback |
| 09 | Compare Dishes | Compare on any chat result with two or more dishes |
| 10 | Restaurant | Existing restaurant page |
| 11 | Dish Details | Existing dish page |
| 12 | Cart | Cart bottom tab; existing cart and pricing |
| 13 | Checkout | Existing checkout; routes to confirmation after placing an order |
| 14 | Order Placed | New; successful checkout |
| 15 | Track Order | New; confirmation or My Orders |
| 16 | My Orders | Profile > My Orders; tracking, details, and help links |
| 17 | Order Details | New; View Details or past-order restaurant title |
| 18 | Rate Your Order | New; delivered order details or tracking |
| 19 | Points & Rewards | New; Profile > Points & Rewards |
| 20 | Community Delivery | New; Profile > Community Delivery |
| 21 | Rider Offers | New; submit a community pickup request |
| 22 | Delivery in Progress | New; select a rider offer |
| 23 | Profile | Profile bottom tab; account and activity destinations |
| 24 | Edit Profile | New; pencil on profile avatar |
| 25 | Saved Addresses | Existing address book with add, edit, select, and remove |
| 26 | My Reviews | New; Profile > My Reviews & Ratings |
| 27 | Help & Support | New; Profile > Help & Customer Care or order support |

## Partner screen coverage

| PDF # | Screen | Implementation / entry point |
| --- | --- | --- |
| 01 | Register your restaurant | New partner sign-in, or Store > Restaurant registration & status |
| 02 | Documents & photos | Continue from registration; select license, CNIC, logo, and optional gallery photos |
| 03 | Under Review | Submit documents; edit the application or explicitly preview demo approval |
| 04 | Dashboard | Existing layout connected to saved store details, online toggle, menu, and orders |
| 05 | Manage Menu | Existing layout with search, categories, availability, bestseller labels, and item editing |
| 06 | Edit Item | Existing editor extended with local photo selection, availability, bestseller flag, customization notes, and deletion confirmation |
| 07 | New Order | Open a new order from Overview or Orders; select preparation time, accept, or reject |
| 08 | Preparing Order | Accept an order; view its timer and mark it ready |
| 09 | Update Status | Ready for pickup; delay pickup, preview rider contact details, or mark picked up |
| 10 | Reviews & Ratings | Reviews tab; rating distribution and star filters |
| 11 | Store profile | Store tab; profile, hours, documents, registration status, customer preview, and logout |
| 12 | Edit Restaurant profile | Edit from Store; save contact details, hours, cuisines, cover, and logo |

The five main partner tabs are **Overview, Menu, Orders, Reviews, Store**. The additional Orders list connects the order screens and filters New, Preparing, Ready, and Completed orders. All new screens have back navigation and handle missing order data.

## Rider screen coverage

| PDF # | Screen | Implementation / entry point |
| --- | --- | --- |
| 01 | Welcome | Splash > Become a Rider |
| 02 | Login | Shared Sign In screen for all account roles |
| 03 | Rider registration | Register with the Rider role |
| 04 | Upload documents | Continue from rider registration; files stay on-device |
| 05 | Under review | Submit the rider application; use the explicit demo approval to preview |
| 06 | Nearby requests | Jobs tab; availability toggle and request filters |
| 07–09 | Request details, submit bid, bid submitted | Select a request and set the delivery amount and ETA |
| 10–11 | My bids, accept/reject selection | Bids tab; use the clearly marked selection preview to explore |
| 12–18 | Active delivery, pickup, OTP, customer route, status, proof, completed | Accept a selected bid and advance through the local delivery flow; pickup demo code is `8421` |
| 19 | Earnings | Earnings tab; demo account figures are marked as examples |
| 20–21 | Delivery history, rate delivery | Earnings > Delivery History; completed deliveries open the rating view |
| 22–24 | Rider profile, edit profile, documents & vehicle | Profile tab and its account options |

Rider tabs are **Jobs, Bids, Earnings, Profile**. Detailed job, onboarding, and edit screens use native stack navigation. The rider demo account opens directly to the approved preview.

## Navigation

All roles use [`@react-navigation/bottom-tabs`](https://reactnavigation.org/docs/bottom-tab-navigator/) with native stacks for detail screens. Customer tabs are **Home, Search, Cart, Profile**; **Profile > My Orders** opens order history. Each customer tab retains its own detail history, and add-to-cart/reorder actions return to the Cart tab's contents. Checkout resets only the Cart stack after placing an order.

Partner tabs own the main portal screens and the preparation workflow. Registration, document forms, order review/status, editors, and customer preview open in the parent stack, preserving their existing tab-bar visibility. Tab switching uses the navigator's built-in press, focus, accessibility, safe-area, and Android back behavior.

## Try the complete flows

- **Ordering:** sign in as customer, add a saved address, browse a dish, add it to cart, check out, and place an order. Use Track My Order to view its status.
- **Tracking and reviews:** the explicit `Demo:` button advances a saved order through preparation, dispatch, and delivery. After delivery, rate the order. One completion earns 20 points; its first review earns another 20. Editing a review cannot earn the reward twice.
- **AI chat:** Home > FoodMind AI, tap a starter or type a request. Results appear in the conversation; keep asking ("cheaper options", "something spicy instead") and each answer builds on the earlier ones. Tap a dish to open it and come back to the same chat, or use the pencil icon for a new chat.
- **Comparison:** in the AI chat, tap Compare above a result grid. Change either dish if desired, and add the preferred dish to the existing cart.
- **No match:** search for `Vegan sushi under Rs. 300`. Reset Filters or continue into AI Assistant.
- **Community delivery:** enter any shop name, pickup address, item names, quantities, estimated unit prices, and delivery address. Compare sample rider offers, choose one, and step through the demo delivery. Saved requests can be resumed from Community Delivery.
- **Profile/support:** edit your name, phone, location, and photo; inspect reviews and points; search/expand help articles; save a support report locally.
- **Partner registration:** sign in as partner, open Store > Restaurant registration & status, complete the business details, select the three required files from your device, and submit. Under Review has an explicit **Preview approved dashboard (demo)** action for exploring the remaining screens.
- **Partner orders:** use the sample-order button on Overview or Orders, then open a new order, choose preparation time, accept it, mark it ready, and mark it picked up. Sample orders stay separate from customer orders. Orders placed by a customer on this device also appear in the partner portal; partner actions update their existing customer tracking statuses. Rider assignment for actual customer orders awaits the backend.
- **Partner menu:** add or edit a dish, choose a photo, toggle availability, or confirm deletion. Name, price, availability, deletion, and photos feed the shared customer menu. The original bundled catalog files stay intact.
- **Partner profile/reviews:** edit the store cover, logo, business contacts, hours, and cuisines. Reviews shows actual locally submitted customer feedback when available, or clearly labeled examples. **Customer Experience** previews the customer screens with a return link to the partner portal and keeps the signed-in role.
- **Rider onboarding:** sign in with the rider demo account, or register with the Rider role and use the same Sign In screen. For a new account, complete local document selection and choose **Preview approval · demo** to open the rider tabs.
- **Rider delivery:** choose a nearby request, submit a bid, open **Preview customer selection · demo** in My Bids, and accept. Follow the pickup and customer steps, enter the sample pickup code `8421`, optionally choose a proof photo, and confirm delivery. The delivery then appears in Earnings history.

## AI recommendation service

FoodMind AI is a chat. Each message goes to `POST /api/ai/chat` on the local Node service in `apps/api/` with the current menu and the earlier turns, so follow-ups keep their context. The service calls Gemini and returns a reply, a results title, up to 8 dish IDs with reasons, and up to 3 follow-up suggestions. The mobile app never receives the Gemini key. To run it locally:

```powershell
Copy-Item apps/api/.env.example apps/api/.env
# Add your GEMINI_API_KEY to apps/api/.env
npm run api
```

For the Android emulator, the app defaults to `http://10.0.2.2:3001`, which reaches the development computer. For a physical device or web preview, set `EXPO_PUBLIC_API_URL` to the reachable URL of this service before starting Expo. If the service cannot be reached, the chat says so and falls back to the local menu matcher, which still carries the dish from earlier turns ("under 1000" after "pasta" searches pasta under 1,000). `npm run test:api` runs the service's tests with a stand-in for Gemini. The service validates every AI-selected dish ID against the provided current menu, so the model cannot invent menu items.

## Mapbox routing and geocoding

The API uses Mapbox Geocoding v6 for addresses and Directions v5 (`mapbox/driving-traffic`) for routes, distances, and ETAs. Set `MAPBOX_ACCESS_TOKEN` in `apps/api/.env` and restart `npm run api`; see `.env.example` for language/country settings. Google Maps keys are no longer used. The token stays on the API server.

Address results are stored in MySQL, so requests use `permanent=true`; the Mapbox account must support permanent geocoding (a card on file or an enterprise contract). Mapbox has no motorcycle-specific profile, so riders use automotive routing. Without a token, local demo addresses use the configured default coordinates and tracking retains the straight-line fallback. Routing failures also use that fallback. The mobile tracking screen consumes the same `{ lat, lng }` route points as before and renders them on its existing SVG illustration.

## Current integration boundaries

Authentication, saved addresses, checkout, order tracking, and the customer/partner/rider order lifecycle use the Express/MySQL API. The mobile app polls every 10 seconds; the API also exposes WebSocket events. AI calls Gemini when configured and falls back to local menu matching when unavailable. Menu browsing, onboarding/documents, profile edits, community delivery, support, and rider bids/earnings remain local previews. Rider location uses fixed demo coordinates until device GPS is integrated; tracking renders route points on an SVG illustration. Payment is cash on delivery.

Orders, addresses, cart, and partner menu edits retain their original storage keys. Profiles, photos, reviews, point events, demo vouchers, support drafts, and community deliveries use a separate customer storage key and are separated by sign-in email. The sign-in email stays read-only in Edit Profile so saved account data and existing authentication stay consistent. Vouchers are recorded as demo rewards; they do not reduce checkout totals. Password changes and rider calls show frontend availability messages.

Partner profiles, document references, gallery photos, application status, online status, and sample orders use `foodmind_partner_features_v1`, separated by sign-in email. Selected files are copied into local app storage; nothing is uploaded. Approval, rider contact, customer notifications, and sample rider assignment are frontend previews. Existing cart, orders, menu, address, and customer storage keys are preserved.

Rider profiles, documents, application status, online status, bids, delivery progress, ratings, proof photos, and history use `foodmind_rider_features_v1`, separated by sign-in email. Selected files and photos stay on the device. The customer, partner, and rider data use separate storage keys.

Store contact details are separate from the sign-in account. Store edits stay in the partner preview; publishing those edits to the server is deferred. Advanced item customization notes are saved as partner metadata; the existing customer customization controls are unchanged. For API sessions, the online toggle updates backend restaurant availability, which is enforced at checkout.

## Verification

```powershell
npm run check
npm test
Push-Location apps/mobile
npx expo export --platform android --output-dir tmp/android-export
Pop-Location
```

The source check parses every JavaScript source and verifies local imports/assets. Tests cover customer screen rendering, missing route data, multi-turn AI chat (context, offline fallback, dish and compare navigation), checkout validation/confirmation, review submission, rider selection, billing consistency, points deduplication, account separation, and sorting/filtering. Partner tests also cover all screen renders, document selection and validation, application submission, demo approval, order transitions, canceled-order protection, sample-order isolation, menu editing/deletion, local profile/media saving, reviews, and persistence.

The current version is checked with **165 app tests and 22 API tests**, the source check (137 JavaScript files), and **23 isolated-database smoke checks** (`npm run api:smoke`, using `foodmind_test`). API tests cover the production Express AI routes, Mapbox request/response mapping and fallbacks, partial address updates, dispatch result handling, and transaction actor cleanup. The database smoke flow includes a real WebSocket offer, order lifecycle, proof persistence, and actor attribution.

The dependency audit currently reports inherited Expo CLI advisories involving `node-forge` and Zod. Its suggested forced Expo downgrade is incompatible with this SDK and was not applied. This is a local frontend prototype; dependency review is still needed before production deployment.

`tmp/baseline/src` and `tmp/baseline/hashes.json` preserve the original source before the customer work. `tmp/partner-baseline/src` and its `hashes.json` preserve the completed customer frontend before the partner work. `tmp/navigation-baseline/src` preserves the source before the bottom-tab update. These local verification files are ignored by Git.
