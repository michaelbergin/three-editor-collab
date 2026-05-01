# Plan: Port Multi-View UI to Legacy Three.js Editor

## Overview

The React app ships a fully-functional multi-viewport system consisting of:

| React source | Concern |
|---|---|
| `src/types/viewport.ts` | Type definitions |
| `src/lib/viewport-grid.ts` | Pure layout computation |
| `src/store/viewport-reducer.ts` | State management (reducer + initial state) |
| `src/components/editor/ThreeViewport.tsx` | Scissored multi-camera render loop |
| `src/components/editor/ViewportChrome.tsx` | Per-viewport label + close button overlay |
| `src/components/editor/ViewportResizeHandle.tsx` | Drag-to-resize divider handles |
| `src/components/editor/SceneViewportManager.tsx` | Add/remove viewport panel |

The port translates each concern into a standalone plain-JS ES module that follows the legacy editor's UIPanel + `editor.signals` conventions. No React, no new npm dependencies, no build step added to `public/editor/`.

**Shared store attachment:** `Viewport.js` creates the viewport store and attaches it to `editor.viewportStore` so that `Menubar.View.js` and `MultiViewportManager.js` read from the same instance without circular imports.

---

## Step 1 — Create `public/editor/js/ViewportGrid.js`

**Action:** Port the five pure layout functions from `src/lib/viewport-grid.ts` to a plain-JS ES module with no imports. Remove TypeScript type annotations and the `@/types/viewport` import; keep all logic identical.

Export: `makeEqualFractions`, `getViewportGridDimensions`, `computeViewportGrid`, `computeViewportResizeHandles`, `deriveViewportLabel`.

`HANDLE_HALF` (value `3`) remains a module-level constant.

**Files:**
- `public/editor/js/ViewportGrid.js` — create

**Behavioral acceptance criteria:**
1. `makeEqualFractions(2)` returns `[0.5, 0.5]`; `makeEqualFractions(0)` returns `[]`.
2. `computeViewportGrid(['a','b'], 800, 600, [0.5,0.5], [1])` returns two rects that together tile the full 800×600 area (no gap, no overlap, each `width` is 400, each `height` is 600).
3. `computeViewportGrid` called with malformed fractions (`[NaN, Infinity]`) returns rects whose `width` and `height` are both `≥ 0`.

---

## Step 2 — Create `public/editor/js/ViewportState.js`

**Action:** Port `src/store/viewport-reducer.ts` to plain JS. Export:
- `MIN_VIEWPORT_FRACTION` (value `0.02`)
- `viewportInitialState` — object matching the TypeScript original
- `viewportReducer(state, action)` — pure function, identical logic
- `createViewportStore()` — factory that wraps the reducer in a minimal observable store:
  - `getState()` → current state snapshot (reference, not clone)
  - `dispatch(action)` → calls reducer, replaces state, synchronously notifies all subscribers
  - `subscribe(fn)` → registers `fn`; returns an `unsubscribe` function that removes `fn`

Internal helper functions `applyColDivider`, `applyRowDivider`, `sum`, and `makeEqualFractions` (re-imported from `./ViewportGrid.js`) remain private.

**Files:**
- `public/editor/js/ViewportState.js` — create

**Behavioral acceptance criteria:**
1. After `dispatch({ type: 'ADD_VIEWPORT', viewportType: 'top' })` on initial state, `getState().viewports` has length 2 and `getState().activeViewportId` ends with `'top'`.
2. A subscriber callback is called **exactly once** per `dispatch` call; calling the returned unsubscribe function stops further invocations.
3. `dispatch({ type: 'REMOVE_VIEWPORT', id: 'vp-1-perspective' })` when only 1 viewport exists leaves `getState()` strictly equal to the object that was there before the dispatch.

---

## Step 3 — Extend `jest.config.cjs` to transform `public/editor/js/*.js`

**Action:** Add a second transform rule so that `ts-jest` (with `allowJs: true`) also processes files whose path contains `public/editor/js/` and ends with `.js`. This enables TypeScript test files in `src/` to import the new plain-JS modules without a `SyntaxError`. Do not change `testMatch` (tests remain under `src/`). Do not add any new npm package.

```js
// New entry inside the transform map:
'^.+/public/editor/js/.+\\.js$': [
  'ts-jest',
  { tsconfig: '<rootDir>/tsconfig.test.json', allowJs: true },
],
```

**Files:**
- `jest.config.cjs` — modify

**Behavioral acceptance criteria:**
1. Running `yarn test` with a `.ts` test file in `src/` that does `import { makeEqualFractions } from '../../public/editor/js/ViewportGrid.js'` succeeds without a module-parse error.
2. All tests that passed before this config change continue to pass.
3. `package.json` devDependencies and `yarn.lock` are not modified.

---

## Step 4 — Tests for `ViewportGrid.js`

**Action:** Write a focused Jest test file that imports the five exported functions from `ViewportGrid.js` via relative path. Cover normal and edge inputs mirroring the existing `src/lib/viewport-grid.test.ts` cases (which test the TypeScript original).

**Files:**
- `src/public-editor/ViewportGrid.test.ts` — create

**Behavioral acceptance criteria:**
1. `getViewportGridDimensions(3)` returns `{ cols: 2, rows: 2 }`.
2. `computeViewportGrid` with 4 ids and equal fractions over 800×600 produces 4 rects each 400×300.
3. `computeViewportResizeHandles` with a single-viewport layout returns `[]`.

---

## Step 5 — Tests for `ViewportState.js`

**Action:** Write a focused Jest test file that exercises `createViewportStore` and `viewportReducer`. Cover initial state, ADD/REMOVE/SET_ACTIVE actions, subscriber notification, and unsubscribe.

**Files:**
- `src/public-editor/ViewportState.test.ts` — create

**Behavioral acceptance criteria:**
1. After `dispatch({ type: 'ADD_VIEWPORT', viewportType: 'left' })`, `getState().viewports` has length 2.
2. A subscriber `fn` is called exactly once per `dispatch`; calling the returned unsubscribe function and dispatching again does **not** call `fn`.
3. `dispatch({ type: 'REMOVE_VIEWPORT', id })` when `id` is the only viewport id leaves `getState()` identical to pre-dispatch.

---

## Step 6 — Create `public/editor/js/ViewportChrome.js`

**Action:** Plain-JS factory `createViewportChrome(props)` that builds an absolute-positioned, non-blocking overlay `<div>` for one viewport cell. The chrome root may cover the cell for visual borders, but it must not receive pointer events. Only the title bar and close button are interactive, so blank viewport pixels continue to reach the renderer's existing `mousedown`, `touchstart`, `dblclick`, EditorControls, and selection handlers.

Props shape:
```js
{
  id,          // string — viewport id
  label,       // string
  isActive,    // boolean
  canClose,    // boolean
  rect,        // { x, y, width, height }
  onClose,     // () => void
  onActivate,  // () => void
}
```

Returns `{ dom, update(nextProps) }`.

- `dom` has `data-viewport-id` and `data-active` attributes, `position: absolute`, `pointerEvents: 'none'`, and geometry from `rect`.
- `dom` gets CSS class `viewport-chrome` and `viewport-chrome--active` when `isActive` is true.
- A child `.viewport-chrome-bar` div holds:
  - A `.viewport-chrome-label` span with `label` text.
  - A `.viewport-chrome-close` `<button>` (only when `canClose` is true) that calls `onClose` on `click` and stops propagation.
- A `pointerdown` listener on `.viewport-chrome-bar` calls `onActivate` and stops propagation; no listener is attached to the root `dom`.
- `update(nextProps)` mutates the existing DOM node in-place (no re-creation): updates position/size, active class, label text, and shows/hides the close button.

**Files:**
- `public/editor/js/ViewportChrome.js` — create

**Behavioral acceptance criteria:**
1. `dom.dataset.viewportId` equals the `id` passed at construction.
2. When `isActive` is `true`, `dom` has class `viewport-chrome--active`; after `update({ ...props, isActive: false })`, that class is absent.
3. When `canClose` is `false`, no `.viewport-chrome-close` element exists; when `canClose` is `true`, clicking close invokes `onClose` once without invoking `onActivate`, `pointerdown` on the chrome root does not invoke `onActivate`, and `pointerdown` on `.viewport-chrome-bar` invokes `onActivate` once.

---

## Step 7 — Tests for `ViewportChrome.js`

**Action:** jsdom test file. Instantiate `createViewportChrome`, assert initial DOM state, call `update` to toggle `isActive` and `canClose`, simulate click events.

**Files:**
- `src/public-editor/ViewportChrome.test.ts` — create

**Behavioral acceptance criteria:** Directly verifies the three criteria from Step 6.

---

## Step 8 — Create `public/editor/js/ViewportResizeHandle.js`

**Action:** Plain-JS factory `createViewportResizeHandle(handle, callbacks, getContainerRect)`.

- `handle`: `{ id, direction, dividerIndex, x, y, width, height }`
- `callbacks`: `{ onDragEnd(direction, dividerIndex, fraction) }`
- `getContainerRect`: `() => DOMRect` — called at drag-end time to convert `clientX/Y` to a container-relative fraction

Returns `{ dom, update(nextHandle), dispose() }`.

- `dom` has `position: absolute`, `touch-action: none`, CSS classes `viewport-resize-handle` and `viewport-resize-handle--vertical` or `viewport-resize-handle--horizontal`.
- Cursor is `col-resize` for `'vertical'` and `row-resize` for `'horizontal'`.
- On `pointerdown`: calls `setPointerCapture`; registers `pointerup` and `pointercancel` listeners on `document`.
- On `pointerup`: computes fraction as `(clientX - containerRect.left) / containerRect.width` for vertical, or `(clientY - containerRect.top) / containerRect.height` for horizontal. Clamped to `[0, 1]`. Calls `onDragEnd(direction, dividerIndex, fraction)`. Removes listeners.
- `update(nextHandle)` mutates geometry and direction in-place.
- `dispose()` removes all active event listeners; subsequent pointer events do not call `onDragEnd`.

**Files:**
- `public/editor/js/ViewportResizeHandle.js` — create

**Behavioral acceptance criteria:**
1. `dom.style.cursor` is `'col-resize'` for `direction: 'vertical'` and `'row-resize'` for `'horizontal'`.
2. Dispatching a synthetic `pointerdown` → `pointerup` on `dom` (with mocked `setPointerCapture`) invokes `onDragEnd` exactly once, passing the correct `dividerIndex`.
3. After `dispose()`, dispatching another `pointerdown` → `pointerup` sequence does **not** invoke `onDragEnd`.

---

## Step 9 — Tests for `ViewportResizeHandle.js`

**Action:** jsdom test file. Create a handle, assert cursor style. Simulate a pointer sequence using `fireEvent`. Assert `onDragEnd` args. Call `dispose()`, repeat pointer sequence, assert no additional call.

**Files:**
- `src/public-editor/ViewportResizeHandle.test.ts` — create

**Behavioral acceptance criteria:** Directly verifies the three criteria from Step 8.

---

## Step 10 — Create `public/editor/js/MultiViewportOverlay.js`

**Action:** Factory `createMultiViewportOverlay(hostElement, store, getContainerRect)`.

- Creates one overlay `<div>` with class `viewport-overlay` appended to `hostElement`. The overlay root uses `pointer-events: none`; only chrome bars, close buttons, and resize handles opt back into pointer events.
- Subscribes to `store`. On each state change (and on initialization), calls `sync()`:
  - Calls `computeViewportGrid` and `computeViewportResizeHandles` using the current state and `getContainerRect()` for `width/height`.
  - Diffs chrome map (keyed by viewport id): creates missing `ViewportChrome` instances, calls `update()` on existing ones, removes stale ones.
  - Diffs handle map (keyed by handle id): same create/update/remove pattern for `ViewportResizeHandle` instances.
  - Chrome `onClose` dispatches `REMOVE_VIEWPORT`; chrome bar `onActivate` dispatches `SET_ACTIVE`.
  - Handle `onDragEnd` dispatches `SET_COL_DIVIDER` or `SET_ROW_DIVIDER`.
- Exposes `sync()` (alias `refresh()` is optional) so viewport/container resize code can recompute geometry without changing viewport state.
- Returns `{ sync, dispose() }` which unsubscribes from `store`, removes all chrome/handle DOM nodes, and removes the overlay div from `hostElement`.

Imports: `./ViewportGrid.js`, `./ViewportChrome.js`, `./ViewportResizeHandle.js`.

**Files:**
- `public/editor/js/MultiViewportOverlay.js` — create

**Behavioral acceptance criteria:**
1. On initialization with the default store state (1 viewport), the overlay container has exactly 1 `.viewport-chrome` element and 0 `.viewport-resize-handle` elements, and the overlay/chrome roots have `pointer-events: none`.
2. After `store.dispatch({ type: 'ADD_VIEWPORT', viewportType: 'top' })`, the overlay synchronously contains 2 `.viewport-chrome` elements and 1 `.viewport-resize-handle` element.
3. If `getContainerRect()` returns a different width/height and `sync()` is called without any store dispatch, existing chrome/handle DOM styles update to the new geometry.
4. After `dispose()`, the overlay `<div>` is no longer a child of `hostElement`, and a subsequent store dispatch or `sync()` call does not add or remove any DOM nodes.

---

## Step 11 — Tests for `MultiViewportOverlay.js`

**Action:** jsdom test file. Create a host `<div>`, instantiate `createMultiViewportOverlay` with a fresh store and a stub `getContainerRect`. Assert initial chrome count. Dispatch `ADD_VIEWPORT`. Assert updated counts. Call `dispose()`. Dispatch again. Assert no DOM mutation.

**Files:**
- `src/public-editor/MultiViewportOverlay.test.ts` — create

**Behavioral acceptance criteria:** Directly verifies the four criteria from Step 10.

---

## Step 12 — Create `public/editor/js/MultiViewportManager.js`

**Action:** Factory `MultiViewportManager(editor)` using the legacy `UIPanel`/`UIRow`/`UIButton` helpers from `./libs/ui.js`. Reads and writes to `editor.viewportStore`.

Structure:
- A `UIPanel` container (returned as `.dom` or as the panel itself following legacy conventions).
- A header `UIRow` with text "Viewports".
- A dynamic list section: one `UIRow` per viewport, showing `deriveViewportLabel(vp, allViewports)` text and a "×" remove button. The remove button is hidden (`.setDisplay('none')`) when only 1 viewport exists.
- An "Add" section: four `UIRow` buttons labeled "＋ Perspective", "＋ Top", "＋ Left", "＋ Right".

On click:
- Remove button → `store.dispatch({ type: 'REMOVE_VIEWPORT', id: vp.id })`
- Add button → `store.dispatch({ type: 'ADD_VIEWPORT', viewportType: type })`

Subscribes to `store`; on state change, re-renders only the dynamic viewport list rows (add buttons are static). Returns the `UIPanel` container element.

Imports: `./libs/ui.js`, `./ViewportGrid.js`, `./ViewportState.js`.

**Files:**
- `public/editor/js/MultiViewportManager.js` — create

**Behavioral acceptance criteria:**
1. With initial state (1 Perspective viewport), the panel contains 1 viewport row and its remove button is not visible.
2. Clicking the "＋ Top" button causes `store.getState().viewports` to have length 2 and the panel's viewport list to show 2 rows.
3. Clicking the "×" button on any viewport row when 2+ viewports exist dispatches `REMOVE_VIEWPORT` with that viewport's exact id; the list synchronously drops to N−1 rows.

---

## Step 13 — Tests for `MultiViewportManager.js`

**Action:** jsdom test file. The test must stub the `UIPanel`/`UIRow` helpers (since they are DOM-manipulating objects not available in Jest without the full legacy JS environment). Use real DOM creation or lightweight stubs. Alternatively, test at the store-dispatch level: after simulating a button click, assert `store.getState()` changed as expected and the DOM row count changed.

**Files:**
- `src/public-editor/MultiViewportManager.test.ts` — create

**Behavioral acceptance criteria:** Directly verifies the three criteria from Step 12.

---

## Step 14 — Modify `public/editor/js/Viewport.js` — multi-viewport scissor rendering

**Action:** Inside the `Viewport(editor)` function, make the following changes:

**14a — Store creation (add near top of function):**
```js
import { createViewportStore } from './ViewportState.js';
import { computeViewportGrid } from './ViewportGrid.js';
import { createMultiViewportOverlay } from './MultiViewportOverlay.js';

// …inside Viewport(editor):
const vpStore = createViewportStore();
editor.viewportStore = vpStore; // shared reference for Menubar + Manager
```

**14b — Render-only camera registry (add after store creation):**
Maintain a `Map<string, THREE.Camera>` (`vpCameras`). Do **not** add a per-viewport controls map in this port. Secondary top/left/right viewports are render-only previews; existing `EditorControls`, `TransformControls`, selection, and object-focus logic remain tied to `editor.viewportCamera` and are only allowed to run for the perspective viewport.

Camera rules:
- Keep `'vp-1-perspective'` dynamically tied to `editor.viewportCamera`; do not treat the initial camera reference as permanent.
- Seed `vpCameras` with `editor.viewportCamera` for `'vp-1-perspective'`, and update that map entry whenever `signals.viewportCameraChanged` fires or before each render if the current entry differs from `editor.viewportCamera`.
- For additional `'perspective'` viewports, create `THREE.PerspectiveCamera` instances that copy the current `editor.viewportCamera` transform at creation time.
- For `'top'`, `'left'`, and `'right'`, create `THREE.OrthographicCamera` instances with stable preset directions and `lookAt(0, 0, 0)`.
- On store state change, call `_syncCameras()` to create missing cameras and delete removed cameras.
- No camera is disposed unless it is neither the current `editor.viewportCamera` nor `editor.camera` and has a `dispose` method.

Add reusable helpers:
- `syncViewportCameraProjection(camera, rect)` — updates each camera from the current viewport rect:
  - `PerspectiveCamera`: set `aspect = rect.width / rect.height`, then `updateProjectionMatrix()`.
  - `OrthographicCamera`: compute left/right/top/bottom from rect aspect and a fixed frustum size, then `updateProjectionMatrix()`.
  - Hostile dimensions (`0`, negative, `NaN`, `Infinity`) are clamped to a minimum safe positive value before division.
- `findViewportRectAt(clientX, clientY)` — returns the current rect under a pointer, or `null` if outside the viewport container.
- `getViewportConfigById(id)` — returns the current viewport config for `id`, or `null`.

**14c — Replace `render()` single draw with scissored loop:**
The existing `render()` function draws `renderer.render(scene, editor.viewportCamera)` once. Replace the body with a loop that scissor-renders every viewport rect, updates each camera projection from that rect before rendering, and preserves the original grid/helper/ViewHelper behavior for the perspective viewport.

The loop must restore viewport/scissor to the perspective cell before drawing `viewHelper.render(renderer)`. This avoids the regression where the helper renders at full-canvas coordinates or disappears.

Preserve the original helper rule exactly: grid, scene helpers, and `viewHelper.render(renderer)` render only when the cell camera is `editor.camera`. If `Viewport.Controls` has switched `editor.viewportCamera` to a user camera, that camera is still used for the main scene draw in `'vp-1-perspective'`, but grid/helpers/ViewHelper remain hidden as before because `editor.camera !== editor.viewportCamera`.

Representative shape:
```js
function render() {
  if (renderer === null) return;
  startTime = performance.now();

  const W = container.dom.offsetWidth;
  const H = container.dom.offsetHeight;
  const s = vpStore.getState();
  const rects = computeViewportGrid(
    s.viewports.map(v => v.id), W, H, s.colFractions, s.rowFractions
  );

  renderer.setScissorTest(true);
  vpCameras.set('vp-1-perspective', editor.viewportCamera);
  for (const rect of rects) {
    const cam = vpCameras.get(rect.id) ?? editor.viewportCamera;
    const yGl = H - rect.y - rect.height;
    syncViewportCameraProjection(cam, rect);

    renderer.setViewport(rect.x, yGl, rect.width, rect.height);
    renderer.setScissor(rect.x, yGl, rect.width, rect.height);
    renderer.clear(true, true, true);
    renderer.render(scene, cam);

    // Preserve original perspective-only overlays inside this viewport cell.
    if (cam === editor.camera) {
      renderer.setViewport(rect.x, yGl, rect.width, rect.height);
      renderer.setScissor(rect.x, yGl, rect.width, rect.height);
      renderer.autoClear = false;
      if (grid.visible) renderer.render(grid, cam);
      if (sceneHelpers.visible) renderer.render(sceneHelpers, cam);
      if (renderer.xr.isPresenting !== true) viewHelper.render(renderer);
      renderer.autoClear = true;
    }
  }
  renderer.setScissorTest(false);
  renderer.setViewport(0, 0, W, H);

  endTime = performance.now();
  editor.signals.sceneRendered.dispatch(endTime - startTime);
}
```

**14d — Mount overlay:**
After `renderer.domElement` is appended to `container.dom`, instantiate:
```js
const overlay = createMultiViewportOverlay(
  container.dom,
  vpStore,
  () => container.dom.getBoundingClientRect()
);
```
Store `overlay` in a function-scope variable (for example `multiViewportOverlay`). Keep it alive across `editorCleared`; scene clearing is normal editor behavior and must not remove the viewport UI.

If renderer/container creation can happen more than once, guard overlay creation:
- Before creating a new overlay, dispose an existing `multiViewportOverlay` only when replacing the renderer/container lifecycle.
- Never create a duplicate `.viewport-overlay` for the same `container.dom`.
- Do not register `editorCleared` as an overlay cleanup hook.
- In `signals.windowResize`, call `multiViewportOverlay.sync()` after `renderer.setSize(...)` and before/after `render()` (either ordering is acceptable if chrome/handles are recomputed from the post-resize container dimensions).

**14e — Pointer hit-test for SET_ACTIVE:**
On `pointerdown` on `renderer.domElement`, compute which viewport rect the pointer fell in (using `computeViewportGrid` against `getBoundingClientRect`) and dispatch `SET_ACTIVE`.

Because secondary cameras are render-only in this plan, protect existing interaction paths from using the wrong camera:
- Existing click selection (`handleClick`) and double-click object focus continue only when the pointer is in the viewport whose camera is `editor.viewportCamera`.
- Pointer events inside top/left/right render-only cells can activate the cell visually, but must not run `selector.getPointerIntersects` with `editor.viewportCamera`.
- Existing `EditorControls` remain bound to `editor.viewportCamera`; this plan does not attempt to orbit/pan orthographic secondary views.

**Files:**
- `public/editor/js/Viewport.js` — modify

**Behavioral acceptance criteria:**
1. With 2 viewports in the store, `renderer.setScissor` is called once per viewport rect, `syncViewportCameraProjection` is called once per rendered rect with that rect's dimensions, and the top viewport camera has a finite orthographic projection matrix after render.
2. After `editor.setViewportCamera(userCamera)` dispatches `signals.viewportCameraChanged`, the next render uses `userCamera` for the `'vp-1-perspective'` main scene draw; if `userCamera !== editor.camera`, grid/helpers/ViewHelper are not rendered, matching existing single-viewport behavior.
3. With exactly 1 viewport in the store and `editor.viewportCamera === editor.camera`, the perspective cell renders the scene, grid, helpers, and `viewHelper.render(renderer)` with viewport/scissor set to that cell before the helper draw.
4. Dispatching `signals.windowResize` after changing container dimensions causes renderer size and overlay chrome/handle geometry to update without any viewport store dispatch.
5. Clicking a render-only top/left/right cell dispatches `SET_ACTIVE` but does not call `selector.getPointerIntersects`; clicking the perspective cell still uses the existing selection path; calling `editor.signals.editorCleared.dispatch()` does not remove `.viewport-overlay` or create a duplicate overlay.

---

## Step 15 — Modify `public/editor/js/Menubar.View.js` — expose MultiViewportManager

**Action:** Import `MultiViewportManager` from `./MultiViewportManager.js`. After the existing `UIHorizontalRule` at the end of the helper toggles, add a second horizontal rule and append `MultiViewportManager(editor).dom` (or the UIPanel directly) into the `options` panel. The manager is created once at menu-build time; state changes update the manager's internal list via its store subscription.

**Files:**
- `public/editor/js/Menubar.View.js` — modify

**Behavioral acceptance criteria:**
1. The View menu's DOM contains a node with the text "Viewports" and four add-buttons.
2. Clicking the "＋ Top" add-button in the View menu causes `editor.viewportStore.getState().viewports` to have length 2, and the Viewport scissor-renders two regions on the next frame.
3. The existing helper-toggle rows (Grid Helper, Camera Helpers, Light Helpers, Skeleton Helpers) remain present and functional.

---

## Step 16 — Add CSS to `public/editor/css/main.css`

**Action:** Append the following rules at the end of `main.css`. Do not modify any existing rules.

```css
/* ── Multi-viewport overlay ───────────────────────── */

.viewport-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.viewport-chrome {
  position: absolute;
  box-sizing: border-box;
  border: 1px solid rgba(255, 255, 255, 0.1);
  pointer-events: none;
}

.viewport-chrome--active {
  border-color: rgba(52, 211, 153, 0.7);
  box-shadow: 0 0 0 1px rgba(52, 211, 153, 0.25);
}

.viewport-chrome-bar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  padding: 4px 6px;
  pointer-events: auto;
}

.viewport-chrome-label {
  font-size: 11px;
  font-weight: 500;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  user-select: none;
}

.viewport-chrome-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  pointer-events: auto;
}

.viewport-chrome-close:hover {
  background: rgba(0, 0, 0, 0.7);
}

.viewport-resize-handle {
  position: absolute;
  z-index: 10;
  touch-action: none;
  pointer-events: auto;
}

.viewport-resize-handle--vertical {
  cursor: col-resize;
}

.viewport-resize-handle--horizontal {
  cursor: row-resize;
}
```

**Files:**
- `public/editor/css/main.css` — modify

**Behavioral acceptance criteria:**
1. With 2+ viewports active, each `.viewport-chrome` element has a `1px` border visible in browser DevTools.
2. The element with class `viewport-chrome--active` has a different computed `border-color` than elements with only `viewport-chrome`.
3. `.viewport-overlay` and `.viewport-chrome` have computed `pointer-events: none`; `.viewport-chrome-bar`, `.viewport-chrome-close`, and `.viewport-resize-handle` have computed `pointer-events: auto`; vertical and horizontal handles expose `col-resize` and `row-resize` cursors respectively.

---

## File Change Summary

| File | Action |
|---|---|
| `public/editor/js/ViewportGrid.js` | Create |
| `public/editor/js/ViewportState.js` | Create |
| `public/editor/js/ViewportChrome.js` | Create |
| `public/editor/js/ViewportResizeHandle.js` | Create |
| `public/editor/js/MultiViewportOverlay.js` | Create |
| `public/editor/js/MultiViewportManager.js` | Create |
| `public/editor/js/Viewport.js` | Modify |
| `public/editor/js/Menubar.View.js` | Modify |
| `public/editor/css/main.css` | Modify |
| `jest.config.cjs` | Modify |
| `src/public-editor/ViewportGrid.test.ts` | Create |
| `src/public-editor/ViewportState.test.ts` | Create |
| `src/public-editor/ViewportChrome.test.ts` | Create |
| `src/public-editor/ViewportResizeHandle.test.ts` | Create |
| `src/public-editor/MultiViewportOverlay.test.ts` | Create |
| `src/public-editor/MultiViewportManager.test.ts` | Create |

## Out of Scope

- Per-viewport `EditorControls` / `TransformControls` (the existing controls remain wired to `editor.viewportCamera`; top/left/right cells are render-only previews)
- PathTracer multi-viewport support
- ViewHelper per-viewport rendering (the existing ViewHelper is preserved for the perspective viewport only)
- `index.html` changes (all new modules are imported transitively from `Viewport.js` and `Menubar.View.js`)
