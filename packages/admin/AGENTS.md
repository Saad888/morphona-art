# packages/admin

Internal admin portal for **Morphona Art** (a personal art-portfolio site). Lets the site owner log in, upload/manage artwork entries (image, name, display order), and publish the public data feed consumed by `packages/frontend`.

## Tech stack

- **React 18** (functional components + hooks, no classes), plain **JavaScript** (no TypeScript — `jsconfig.json` is editor-only, no type-checking)
- **Create React App** (`react-scripts` 5) — not Vite
- **react-router-dom v6** for routing
- **semantic-ui-react** for all UI components (imported globally in `index.js`)
- **amazon-cognito-identity-js** for auth (direct SDK, not Amplify)
- **browser-image-compression** for client-side thumbnail compression before upload
- No state management library — local `useState`/`useEffect` per page, props drilling
- Styling is mostly inline `style={{...}}` objects in JSX. `App.css`/`index.css` are vestigial CRA boilerplate, not meaningfully used.

## Structure

```
public/                 CRA template (index.html title: "Morphona Art Dashboard")
src/
  index.js              ReactDOM root; wraps <App/> in Semantic UI <Container>
  App.js                Auth gate + router
  common/navButton.js    Reusable <NavButton> (Semantic <Button> + useNavigate)
  pages/
    login/index.js        LoginPage — username/password form
    dashboard/index.js     Dashboard — list/edit/reorder/delete entries, logout, publish, nav to /create
    create/index.js        CreateEntryPage — image picker + upload flow
  services/
    cognito.js            Cognito auth: login, logout, isUserAuthenticated, getIdToken
    api.js                REST client for the backend Lambda: uploadImage, getImages, updateImage, deleteImage, publishData
```

Each page is a single flat `index.js` with all JSX/logic inline — no `components/`, `hooks/`, `utils/`, or `context/` folders, and no decomposition of page markup into subcomponents (e.g. Dashboard's per-entry row is inlined in a `.map()`). If adding significant new UI, there's no established pattern to extend for shared pieces beyond `common/`.

Named exports throughout (`export const LoginPage`, etc.) except `App.js` (default export, CRA convention).

## How it fits in the repo

This is a plain folder-based repo — **no workspaces/monorepo tooling** (no root package.json, no lerna/turbo/pnpm-workspace). Each `packages/*` is fully independent with its own `package.json`/`node_modules`, no committed lockfiles.

- **`packages/api`** — AWS Lambda handler this app calls (`/entries` GET/PUT/POST/DELETE, `/publish`). Reads/writes DynamoDB + S3.
- **`packages/frontend`** — public art site that consumes the `data.json` this app's "Publish" button generates.

No shared code/imports between packages — coupling is only via the deployed HTTP API contract and the published S3 `data.json` contract. AWS resource IDs (API Gateway URL, Cognito pool/client ID) are **hardcoded in source** (`services/api.js`, `services/cognito.js`), not env vars, despite CRA supporting `REACT_APP_*`.

Deployed via `.github/workflows/deploy-admin.yml`: on push to `main`, builds with Node 14 and syncs `build/` to an S3 bucket.

## Commands (run from `packages/admin/`)

- `npm start` — dev server at localhost:3000
- `npm run build` — production build to `build/`
- `npm test` — CRA/Jest watch mode (**no test files currently exist**)

## Known issues to be aware of

- **`isUserAuthenticated()` race condition** (`services/cognito.js`): it looks synchronous but internally relies on an async Cognito `getSession` callback that resolves after the function returns, so it can incorrectly report `false` on the initial check.
- **Inconsistent auth header**: `getImages` sends `Authorization: ${idToken}` while `uploadImage`, `updateImage`, `deleteImage`, `publishData` send `Authorization: Bearer ${idToken}`.
- The package's own `README.md` is untouched CRA boilerplate; actual project notes (Cognito password reset command, AWS account info, TODOs) live in the **root** `README.md` instead.
