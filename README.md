# FoodMind

A React Native food-delivery app with item-level food discovery. This repository holds **Part 1**: the complete mobile experience in plain JavaScript, with mock restaurant data, Redux Toolkit for shared state, and a local login stored in AsyncStorage.

**Team:** Syed Hashim Abbas, Janasheen Haider, Muhammad Rafey Tanweer

---

## Getting Started

> Complete the [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment) guide first.

### 1. Install dependencies

```sh
npm install
```

If you are setting up a fresh project, these are the packages the app uses:

```sh
npm i @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs
npm i react-native-screens react-native-safe-area-context
npm i @reduxjs/toolkit react-redux @react-native-async-storage/async-storage
```

### 2. Start Metro

From the project root:

```sh
npx react-native start
```

### 3. Run the app

In a second terminal, from the project root:

```sh
# Android
npm run android

# iOS (first time, or after changing native dependencies)
bundle install
bundle exec pod install
npm run ios
```

Saving a file reloads the app automatically (Fast Refresh). To force a full reload, press **R** twice on Android, or **R** in the iOS Simulator.

Having trouble? See the [React Native troubleshooting page](https://reactnative.dev/docs/troubleshooting).

### Demo accounts

| Role | Email | Password |
|---|---|---|
| Customer | `demo@foodmind.app` | `demo123` |
| Restaurant owner | `owner@foodmind.app` | `owner123` |

These are created on first launch. Registering a new account always creates a customer.

---

## Project Structure

Everything we write lives in `src/`. `App.js` stays at the project root.

```
src/
├── components/    Shared UI pieces (Button, Card, RatingBadge)
├── screens/       Screens, grouped by role
│   ├── auth/        Splash, Login, Register
│   ├── customer/    Home, Search, Orders, Profile, Restaurant, Dish, Cart, Checkout
│   └── restaurant/  Dashboard, Manage Menu
├── navigation/    Navigators and route names
├── theme/         Colors, spacing, font sizes
├── data/          Mock restaurants, menu items, orders
├── state/         Redux Toolkit store, slices, and hooks
├── auth/          Register, login, logout, restore session (logic only)
└── utils/         Helpers: price formatting, validation, search matching
```

| Folder | What belongs there |
|---|---|
| `components` | Any UI piece used by more than one screen. Props in, UI out |
| `screens/<role>` | One flat file per screen, named `<Name>Screen.js`, plus that role's `index.js` |
| `navigation` | The only place that knows the app flow. Route names live here |
| `theme` | The only place for colors, spacing and font sizes |
| `data` | What the app *knows* (menu, restaurants, orders) |
| `state` | What the user is *doing* (cart, who is logged in) |
| `auth` | The logic for registering and logging in. No UI |
| `utils` | Small pure functions with no UI |

### App flow

The session decides which group of screens is shown:

- **Logged out:** Splash, Login, Register
- **Customer:** four tabs (Home, Search, Orders, Profile), plus Restaurant Detail, Dish Detail, Cart, Checkout
- **Restaurant owner:** Dashboard, Manage Menu

### Who may import whom

| Layer | May use | Must not use |
|---|---|---|
| `screens` | components, theme, utils, data, route names, and the hooks in `state/hooks.js` | `auth` or Redux directly, or another role's screens |
| `navigation` | `state/hooks.js` (to read the role), screens | `auth` directly |
| `state` | `auth`, data, utils | screens |
| `auth` | utils, AsyncStorage | screens, `state` |
| `components` | theme, utils | `state`, data, screens |
| `data`, `theme`, `utils` | nothing from the app | everything else |

### State and login

Redux Toolkit holds state that several screens share:

- **Session slice:** the current user, role, and loading status
- **Cart slice:** the items in the cart (in memory only)

Screens never import Redux. They use two hooks from `state/hooks.js`: `useSession()` and `useCart()`. Form text, search text and selected chips stay in `useState` inside their screens.

**Users live in AsyncStorage, not Redux.** `auth/` saves the user list and the current session there, so a login survives an app restart. Redux holds only a copy of the current user for screens to read.

How a login travels:

1. The Login screen validates the input and calls `login` from `useSession()`.
2. The session slice runs an async action that calls `auth.login`.
3. `auth` checks the saved users and saves the session in AsyncStorage.
4. The slice stores the user and role.
5. The root navigator sees the new role and switches to the right group.

On app start, the session asks `auth` to restore the saved session, and a Splash screen shows until it answers.

> Passwords are stored as plain text because this is a Part 1 demo. Part 2's backend must hash them.

---

## Conventions

- **One flat file per screen,** named `<Name>Screen.js`, inside its role folder.
- **Role folders do not import each other.** If two roles need the same piece, move it to `components`.
- **Reusable means `components`.** A piece used by two or more screens goes there.
- **One source for style.** Take colors and spacing from `theme`. No hard-coded values in screens.
- **One source for routes.** Take route names from `navigation/routes.js`. Never type them by hand.
- **Data comes from `data` only.** Do not copy mock values into screens.
- **Money:** prices are whole numbers in Rs., formatted only when displayed.
- **IDs** are strings.
- **Keep it simple.** If a feature is not in the proposal, leave it out.

## Adding a Screen

1. Create `screens/<role>/<Name>Screen.js` (role is `auth`, `customer` or `restaurant`).
2. In that role folder's `index.js`, replace the placeholder line with your real export.
3. Make sure the route name exists in `navigation/routes.js` and is registered in the matching navigator.
4. Run the app and walk to your screen.

Screens that are not built yet show a placeholder reading "<Name> Screen", so the full flow can be tapped through at any time.

## Git Workflow

- Work on your own branch, named `feature/<name>-<task>`.
- Edit only your own screen files. Before changing shared files (`theme`, `navigation`, `components`, `state`, `auth`), tell the team.
- Pull `main` before you start and before you open a merge request.
- Do not commit secrets or keys.

---

## Scope

**Part 1 (this repo):** browsing, search and filters, restaurant and dish details, cart, checkout (simulated), orders (local), login and session, restaurant dashboard and menu management (local).

**Part 2 (later):** a real backend, persistent data, reviews, and AI-assisted food search.

## Learn More

- [React Native documentation](https://reactnative.dev/docs/getting-started)
- [React Navigation](https://reactnavigation.org)
- [Redux Toolkit](https://redux-toolkit.js.org)