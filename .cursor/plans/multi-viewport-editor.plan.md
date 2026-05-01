# Plan: Multi-Viewport Editor

**Feature**: Implement a multi-viewport mode for the React `ThreeViewport` editor.
The root Vite entrypoint must serve this React editor so the feature is reachable;
the existing `/editor/index.html` official three.js editor remains available as a
static route, but the root page no longer redirects to it.

Each viewport renders the same shared Three.js scene with its own camera, controls,
label, close button, and resize behavior. Viewport layout is session-only and resets
to one Perspective viewport on reload.

---

## File Map

| Status | Path |
|--------|------|
| MODIFY | `index.html` |
| MODIFY | `src/App.test.tsx` |
| NEW | `src/types/viewport.ts` |
| NEW | `src/lib/viewport-grid.ts` |
| NEW | `src/lib/viewport-grid.test.ts` |
| NEW | `src/lib/three-scene.ts` |
| NEW | `src/lib/three-scene.test.ts` |
| NEW | `src/store/viewport-reducer.ts` |
| NEW | `src/store/viewport-reducer.test.ts` |
| NEW | `src/store/ViewportContext.tsx` |
| MODIFY | `src/components/editor/ThreeViewport.tsx` |
| NEW | `src/components/editor/ThreeViewport.test.tsx` |
| NEW | `src/components/editor/ViewportChrome.tsx` |
| NEW | `src/components/editor/ViewportChrome.test.tsx` |
| NEW | `src/components/editor/ViewportResizeHandle.tsx` |
| NEW | `src/components/editor/ViewportResizeHandle.test.tsx` |
| NEW | `src/components/editor/SceneViewportManager.tsx` |
| NEW | `src/components/editor/SceneViewportManager.test.tsx` |
| MODIFY | `src/App.tsx` |

---

## Micro-Steps

---

### Step 1 - Restore the React app as the root served surface

**Action**: Update the root entrypoint so the Vite React app mounts at `/`.
This is required because `index.html` currently redirects to `/editor/index.html`,
which would make changes to `src/App.tsx` and `ThreeViewport` unreachable in the
served app.

**Files**:
- `index.html` (modify)
- `src/App.test.tsx` (modify)

Change `index.html` to:
- Remove the `<meta http-equiv="refresh">`.
- Remove the `window.location.replace('/editor/index.html'...)` script.
- Add `<div id="root"></div>`.
- Add `<script type="module" src="/src/main.tsx"></script>`.
- Keep title text aligned with the React app, e.g. `three-editor-collab`.

Change `src/App.test.tsx` so it no longer asserts that the root page redirects to
the official editor. Instead, assert that:
- root `index.html` mounts `/src/main.tsx`;
- `public/editor/index.html` still exists and remains the official three.js editor
route.

**Behavioral acceptance criteria**:
1. Loading `/` renders the React editor shell containing `three-editor-collab`.
2. Loading `/editor/index.html` still serves the official three.js editor page.
3. The updated app entrypoint test fails if root `index.html` redirects away from
   the React app.

---

### Step 2 - Define shared viewport types

**Action**: Create a small type module for viewport domain data. Keeping these types
separate from React and Three.js prevents circular imports and makes pure layout and
state utilities reusable.

**Files**: `src/types/viewport.ts` (new)

Define:

```ts
export type ViewportType = 'perspective' | 'top' | 'left' | 'right'

export interface ViewportConfig {
  id: string
  type: ViewportType
  typeIndex: number
}

export interface ViewportRect {
  id: string
  x: number
  y: number
  width: number
  height: number
}

export interface ViewportResizeHandleRect {
  id: string
  direction: 'vertical' | 'horizontal'
  dividerIndex: number
  x: number
  y: number
  width: number
  height: number
}
```

`ViewportRect.y` and `ViewportResizeHandleRect.y` use CSS coordinates measured from
the top of the viewport container. WebGL callers must convert to bottom-origin.

**Behavioral acceptance criteria**:
1. All exported types are importable from `@/types/viewport`.
2. A `ViewportType` value accepts only `perspective`, `top`, `left`, or `right`.
3. Resize handle rectangles can represent segmented handles; they are not limited
   to full container width or height.

---

### Step 3 - Implement `makeEqualFractions`

**Action**: Add a pure helper that produces equal fractions summing to 1. Add/remove
viewport actions use this to reset manual resize ratios.

**Files**: `src/lib/viewport-grid.ts` (new)

```ts
export function makeEqualFractions(count: number): number[]
```

Rules:
- `count <= 0` returns `[]`.
- `count > 0` returns `count` values.
- The values sum to `1` within floating-point tolerance.

**Behavioral acceptance criteria**:
1. `makeEqualFractions(1)` returns `[1]`.
2. `makeEqualFractions(3)` returns three values that sum to `1`.
3. `makeEqualFractions(0)` and negative counts return `[]`.

---

### Step 4 - Implement grid dimension helpers

**Action**: Add pure helpers for deriving grid dimensions from viewport count. These
helpers are shared by grid layout, reducer resets, and overlay handle generation.

**Files**: `src/lib/viewport-grid.ts` (extend)

```ts
export function getViewportGridDimensions(count: number): { cols: number; rows: number }
```

Rules:
- `count <= 0` returns `{ cols: 0, rows: 0 }`.
- Otherwise `cols = Math.ceil(Math.sqrt(count))`.
- `rows = Math.ceil(count / cols)`.

**Behavioral acceptance criteria**:
1. Count `1` returns 1 column and 1 row.
2. Count `2` returns 2 columns and 1 row.
3. Count `3` returns 2 columns and 2 rows.
4. Count `5` returns 3 columns and 2 rows.

---

### Step 5 - Implement `computeViewportGrid`

**Action**: Add the pure layout function that maps viewport IDs and row/column
fractions to pixel rectangles. The renderer and overlay use the same function so
canvas scissor regions and DOM chrome stay aligned.

**Files**: `src/lib/viewport-grid.ts` (extend)

```ts
export function computeViewportGrid(
  viewportIds: string[],
  containerWidth: number,
  containerHeight: number,
  colFractions: number[],
  rowFractions: number[],
): ViewportRect[]
```

Rules:
- If there are no viewport IDs, return `[]`.
- Clamp container width/height to at least `0`.
- Use `getViewportGridDimensions(viewportIds.length)`.
- Complete rows use `colFractions`.
- An incomplete final row splits the full container width evenly across only the
  viewports present in that row.
- Rectangles never have negative width or height.
- Rectangles use integer coordinates.

**Behavioral acceptance criteria**:
1. One viewport in an 800x600 container fills the full container.
2. Four viewports in an 800x600 container fill four 400x300 quadrants.
3. Three viewports in a 600x400 container produce two 300x200 top viewports and one
   600x200 bottom viewport.
4. Empty viewport IDs return no rectangles.
5. Zero or malformed fractions never produce negative rectangle sizes.

---

### Step 6 - Implement `deriveViewportLabel`

**Action**: Add a pure label helper so the manager and viewport chrome use identical
labeling behavior.

**Files**: `src/lib/viewport-grid.ts` (extend)

```ts
export function deriveViewportLabel(
  viewport: ViewportConfig,
  allViewports: ViewportConfig[],
): string
```

Rules:
- Single viewport of a type uses the plain type label, e.g. `Perspective`.
- Duplicate viewports of a type use numbered labels based on `typeIndex`, e.g.
  `Perspective 1`, `Perspective 2`.
- Different viewport types do not affect each other's numbering.

**Behavioral acceptance criteria**:
1. One perspective viewport is labeled `Perspective`.
2. Two perspective viewports are labeled `Perspective 1` and `Perspective 2`.
3. Removing one of two perspective viewports makes the remaining label return to
   `Perspective`.
4. A Top viewport remains labeled `Top` when a Perspective viewport also exists.

---

### Step 7 - Implement scoped segmented resize handle layout

**Action**: Add a pure helper that returns only resize handles that correspond to
actual shared viewport edges. This fixes the 3-viewport case where a full-height
vertical divider would incorrectly cross the bottom viewport.

Use the conservative scoped model: render resize handles only for shared edges backed
by the global `colFractions` or `rowFractions` arrays. Do not add per-row split
fractions in this feature. In incomplete final rows, internal edges produced by the
row's temporary equal split are display-only layout edges and must not get drag
handles because `SET_COL_DIVIDER` cannot resize them without affecting unrelated
complete rows.

**Files**: `src/lib/viewport-grid.ts` (extend)

```ts
export function computeViewportResizeHandles(
  rects: ViewportRect[],
  containerWidth: number,
  containerHeight: number,
  colFractions: number[],
  rowFractions: number[],
): ViewportResizeHandleRect[]
```

Rules:
- A vertical handle exists only where one viewport's right edge touches another
  viewport's left edge with overlapping y-ranges.
- A horizontal handle exists only where one viewport's bottom edge touches another
  viewport's top edge with overlapping x-ranges.
- A vertical handle is rendered only if its x-coordinate equals a cumulative global
  column divider from `colFractions`.
- A horizontal handle is rendered only if its y-coordinate equals a cumulative global
  row divider from `rowFractions`.
- Handles are segmented to the overlap range. They are never automatically full
  height or full width unless the shared edge really spans that dimension.
- `dividerIndex` is derived from the sorted unique divider coordinate for that axis.
- Edges created only by an incomplete row's local equal split are not resizable and
  are intentionally omitted.

**Behavioral acceptance criteria**:
1. For three viewports laid out as two on top and one full-width bottom viewport,
   the vertical resize handle appears only across the top row and does not cover
   the bottom viewport.
2. The same three-viewport layout includes horizontal handle coverage along the
   shared boundary between the top row and the bottom viewport.
3. Four equal quadrants produce one vertical shared-edge segment per row and one
   horizontal shared-edge segment per column.
4. Five viewports in a 3-column x 2-row layout do not render a handle on the final
   row's local 50% split, because that split is not backed by `colFractions`.
5. Five viewports still render handles for global column and row dividers where the
   shared edge is backed by `colFractions` or `rowFractions`.
6. A single viewport produces no resize handles.

---

### Step 8 - Define reducer state and absolute divider actions

**Action**: Implement a pure reducer for session-only viewport state. Resize actions
must accept absolute cumulative divider positions, not individual column widths, so
3+ column/row layouts resize the intended adjacent pair.

**Files**: `src/store/viewport-reducer.ts` (new)

```ts
export interface ViewportState {
  viewports: ViewportConfig[]
  activeViewportId: string | null
  colFractions: number[]
  rowFractions: number[]
  typeCounters: Record<ViewportType, number>
}

export type ViewportAction =
  | { type: 'ADD_VIEWPORT'; viewportType: ViewportType }
  | { type: 'REMOVE_VIEWPORT'; id: string }
  | { type: 'SET_ACTIVE'; id: string }
  | { type: 'SET_COL_DIVIDER'; dividerIndex: number; dividerFraction: number }
  | { type: 'SET_ROW_DIVIDER'; dividerIndex: number; dividerFraction: number }
```

Initial state:

```ts
{
  viewports: [{ id: 'vp-1-perspective', type: 'perspective', typeIndex: 1 }],
  activeViewportId: 'vp-1-perspective',
  colFractions: [1],
  rowFractions: [1],
  typeCounters: { perspective: 1, top: 0, left: 0, right: 0 },
}
```

Reducer rules:
- Adding appends a new viewport, increments only that type's counter, sets the new
  viewport active, and resets row/column fractions to an equal grid.
- Removing the last remaining viewport is a no-op.
- Removing any other viewport resets row/column fractions to an equal grid and, if
  needed, moves active selection to the first remaining viewport.
- `SET_ACTIVE` ignores unknown viewport IDs.
- `SET_COL_DIVIDER` and `SET_ROW_DIVIDER` treat `dividerFraction` as the absolute
  cumulative divider position from 0 to 1.
- For divider resize, compute pair bounds:
  - `pairStart = cumulative fractions before index`
  - `pairEnd = cumulative fractions through index + 1`
  - `pairSpan = pairEnd - pairStart`
  - requested left/top size = `dividerFraction - pairStart`
  - clamp requested size to `[MIN_FRACTION, pairSpan - MIN_FRACTION]`
  - preserve `pairSpan`; only the two adjacent fractions change.
- Ignore invalid divider indices or pair spans smaller than `2 * MIN_FRACTION`.

**Behavioral acceptance criteria**:
1. Initial state has exactly one active Perspective viewport.
2. Adding Top creates two viewports and resets fractions to `[0.5, 0.5]` columns and
   `[1]` rows.
3. Removing from a one-viewport state leaves one viewport visible.
4. In a three-column state `[0.2, 0.3, 0.5]`, setting divider 1 to absolute `0.7`
   changes only columns 2 and 3 while column 1 remains `0.2`.
5. In a three-row state `[0.25, 0.25, 0.5]`, setting row divider 0 to absolute
   `0.1` clamps the first row to the minimum and preserves the combined height of
   rows 1 and 2.
6. Type counters never decrement after removal.

---

### Step 9 - Create `ViewportContext`

**Action**: Wrap the reducer in React context so `ThreeViewport`, viewport chrome,
resize handles, and the sidebar manager share the same session-only state without
prop drilling.

**Files**: `src/store/ViewportContext.tsx` (new)

```ts
export function ViewportProvider({ children }: { children: React.ReactNode }): JSX.Element
export function useViewportContext(): { state: ViewportState; dispatch: React.Dispatch<ViewportAction> }
```

Rules:
- `ViewportProvider` owns the single `useReducer` call.
- `useViewportContext` throws a clear error if used outside `ViewportProvider`.
- No state is persisted to local storage, URL params, or a server.

**Behavioral acceptance criteria**:
1. Components inside `ViewportProvider` can render the initial active Perspective
   viewport.
2. Dispatching `ADD_VIEWPORT` from a child renders the added viewport on the next
   React update.
3. Using the hook outside `ViewportProvider` throws an error mentioning
   `ViewportProvider`.

---

### Step 10 - Create `createViewportCamera`

**Action**: Move camera creation into a testable Three.js helper. Each viewport owns
its camera and orientation while the scene remains shared.

**Files**: `src/lib/three-scene.ts` (new)

```ts
export function createViewportCamera(
  type: ViewportType,
  aspect: number,
): THREE.PerspectiveCamera | THREE.OrthographicCamera
```

Camera orientations:

| Type | Camera | Position | Target | Notes |
|------|--------|----------|--------|-------|
| `perspective` | Perspective | `(4.2, 3.2, 5.2)` | `(0, 0.65, 0)` | fov 45 |
| `top` | Orthographic | `(0, 10, 0)` | `(0, 0, 0)` | up `(0, 0, -1)` |
| `left` | Orthographic | `(-10, 0, 0)` | `(0, 0, 0)` | side view |
| `right` | Orthographic | `(10, 0, 0)` | `(0, 0, 0)` | side view |

All cameras update their projection matrix before return.

**Behavioral acceptance criteria**:
1. A Perspective viewport starts from an angled perspective camera.
2. A Top viewport starts above the scene and looks down at the origin.
3. Left and Right viewports start from opposite sides of the scene.
4. Different viewport types produce visibly different camera orientations.

---

### Step 11 - Create `createViewportControls`

**Action**: Move OrbitControls construction into a helper and define per-type
defaults. Orthographic views can pan/zoom but cannot orbit away from their fixed
orientation.

**Files**: `src/lib/three-scene.ts` (extend)

```ts
export function createViewportControls(
  camera: THREE.Camera,
  type: ViewportType,
  domElement: HTMLElement,
): OrbitControls
```

Rules:
- All controls use damping.
- Perspective controls target `(0, 0.65, 0)` and allow rotation.
- Top, Left, and Right controls target `(0, 0, 0)` and disable rotation.
- All controls start disabled; interaction routing in `ThreeViewport` enables only
  the viewport being interacted with.

**Behavioral acceptance criteria**:
1. Perspective viewports can orbit when they are the active interaction target.
2. Top, Left, and Right viewports can zoom/pan without rotating away from their
   orthographic orientation.
3. A newly added viewport does not respond to pointer events until the pointer is
   inside that viewport or it becomes active.

---

### Step 12 - Extract `buildEditorScene`

**Action**: Move the existing scene construction out of `ThreeViewport`. The factory
returns one shared scene and a cleanup callback.

**Files**: `src/lib/three-scene.ts` (extend)

```ts
export interface EditorSceneResult {
  scene: THREE.Scene
  objects: {
    cube: THREE.Mesh
    ghost: THREE.Mesh
  }
  dispose(): void
}

export function buildEditorScene(): EditorSceneResult
```

Rules:
- Build the same visual scene currently in `ThreeViewport`: floor, cube, ghost,
  hemisphere light, directional light, grid, and axes.
- Do not create a renderer in this helper.
- `dispose()` disposes geometries and materials created by the helper.

**Behavioral acceptance criteria**:
1. The shared scene contains the editable cube, presence cursor, floor, lights, grid,
   and axes.
2. The cube and presence cursor keep their current names for scene-list continuity.
3. Disposing the scene resources does not require a WebGL context and does not throw.

---

### Step 13 - Add focused tests for Three.js helpers

**Action**: Add Jest tests for every new testable function in `src/lib/three-scene.ts`.
These functions do not require WebGL because they construct cameras, controls, scene
objects, geometry, and materials without rendering.

**Files**: `src/lib/three-scene.test.ts` (new)

Tests:
- `createViewportCamera` returns the correct camera class and starting position for
  all four viewport types.
- `createViewportCamera` handles edge aspects such as `0`, negative, or non-finite
  values by falling back to a safe positive aspect.
- `createViewportControls` can be created against a jsdom `<div>`, uses damping, and
  disables rotation for Top/Left/Right.
- `createViewportControls` starts with `enabled === false`.
- `buildEditorScene` returns the named cube and ghost and can dispose without
  throwing.

**Behavioral acceptance criteria**:
1. `yarn test --testPathPattern three-scene` passes.
2. The tests instantiate no `THREE.WebGLRenderer` and require no WebGL context.
3. All new testable functions in `src/lib/three-scene.ts` are covered; there is no
   untested helper left without an explicit reason.

---

### Step 14 - Refactor `ThreeViewport` to one renderer, one scene, many cameras

**Action**: Refactor `ThreeViewport` so the renderer and shared scene are created
once, while viewports can be added or removed dynamically. Each viewport has its own
camera and controls, keyed by viewport ID.

**Files**: `src/components/editor/ThreeViewport.tsx` (modify)

Implementation requirements:
- Create one `THREE.WebGLRenderer` and append its canvas once.
- Create one shared scene via `buildEditorScene()`.
- For each viewport in context state, create one camera and one controls instance.
- Dispose controls for removed viewports.
- Do not recreate the shared scene when viewports are added or removed.
- Use context state through stable refs only where needed to keep animation callbacks
  current; tests should assert behavior, not private refs.

**Behavioral acceptance criteria**:
1. Adding a second viewport shows two viewport labels over the canvas without
   resetting the cube/presence scene animation.
2. Removing one of two viewports leaves the remaining viewport rendering the same
   scene contents.
3. Repeated add/remove cycles do not leave duplicate labels or stale close buttons
   in the DOM.

---

### Step 15 - Implement control event routing for shared canvas controls

**Action**: Because all OrbitControls listen to the same canvas element, route pointer
and wheel events so only one viewport's controls are enabled for a user interaction.
This prevents dragging or zooming in viewport B from mutating viewport A's camera.

**Files**: `src/components/editor/ThreeViewport.tsx` (extend)

Routing rules:
- On `pointerdown`, `wheel`, and `touchstart`, compute the viewport under the event
  using `computeViewportGrid`.
- Dispatch `SET_ACTIVE` for that viewport.
- Enable controls only for that viewport ID; disable all other controls before the
  underlying OrbitControls event handlers run. Use capture-phase listeners if needed.
- On `pointerup`, `pointercancel`, `lostpointercapture`, or `pointerleave`, disable
  all controls unless a drag is still in progress.
- The current React `ThreeViewport` surface has no transform/gumball controls. Adding
  new transform/gumball controls is out of scope for this feature; this step only
  routes camera controls.

**Behavioral acceptance criteria**:
1. Dragging inside viewport B changes only viewport B's camera orientation/target;
   viewport A's camera orientation/target remains unchanged.
2. Zooming with the wheel inside viewport B changes only viewport B's camera zoom or
   distance; viewport A remains unchanged.
3. After a pointer interaction ends, moving the pointer outside all viewport regions
   does not continue changing any camera.
4. The absence of transform/gumball controls is unchanged by this feature; no new
   transform UI appears when adding or removing viewports.

---

### Step 16 - Implement scissor-based multi-viewport rendering

**Action**: Replace the single render call with a scissor loop. The loop renders the
same scene once per viewport using that viewport's camera and rectangle.

**Files**: `src/components/editor/ThreeViewport.tsx` (extend)

Requirements:
- Use `computeViewportGrid` to derive render rectangles.
- Convert CSS top-origin `y` to WebGL bottom-origin before `setViewport` and
  `setScissor`.
- Set `renderer.setScissorTest(true)` during the loop.
- Clear and render each viewport region independently.
- Update only the controls currently enabled by event routing; do not update every
  controls instance as an interaction target.

**Behavioral acceptance criteria**:
1. With two viewports visible, both show the same cube and presence cursor at the
   same scene positions.
2. Mutating a shared scene object position directly before a render is visible in
   every viewport on the next rendered frame.
3. Removing a viewport stops rendering that viewport's labeled region while the
   remaining viewport continues rendering.

---

### Step 17 - Add canvas click and focus activation

**Action**: Clicking or focusing a viewport region makes it active. Active state is
used by the chrome, manager, and control routing. It is not wired to transform or
gumball controls because none exist on the current React viewport surface.

**Files**: `src/components/editor/ThreeViewport.tsx` (extend)

Rules:
- Canvas click computes the viewport under the pointer and dispatches `SET_ACTIVE`.
- Keyboard focus on a viewport chrome region also dispatches `SET_ACTIVE`.
- Unknown or gap clicks do nothing and do not throw.

**Behavioral acceptance criteria**:
1. Clicking viewport B changes the visible active outline/label state to viewport B.
2. Clicking a rounding gap or outside all viewport rectangles leaves the current
   active viewport unchanged.
3. Focusing viewport chrome with keyboard navigation makes that viewport active.

---

### Step 18 - Update camera projection on resize and layout change

**Action**: Recompute each viewport camera projection from its current rectangle
whenever the container size, viewport count, or manual fractions change.

**Files**: `src/components/editor/ThreeViewport.tsx` (extend)

Requirements:
- Perspective cameras use the rectangle's width/height aspect.
- Orthographic cameras update left/right/top/bottom to preserve their view direction
  without stretching.
- Handle zero-size intermediate rectangles without throwing.

**Behavioral acceptance criteria**:
1. Resizing the browser keeps the Perspective viewport's cube from appearing
   horizontally stretched.
2. Resizing the browser keeps Top/Left/Right viewports from appearing skewed.
3. Dragging a resize handle updates only the adjacent viewport pair and both
   affected cameras keep correct proportions.

---

### Step 19 - Create `ViewportChrome`

**Action**: Render viewport label, active state, and close button as DOM chrome over
each scissored region.

**Files**: `src/components/editor/ViewportChrome.tsx` (new)

Props:

```ts
interface ViewportChromeProps {
  viewportId: string
  label: string
  isActive: boolean
  canClose: boolean
  rect: ViewportRect
  onClose(): void
  onActivate(): void
}
```

Rules:
- The root is absolutely positioned to match `rect`.
- The root has `data-viewport-id` and `data-active`.
- The close button is absent or hidden when `canClose` is false.
- The close button stops propagation and calls only `onClose`.

**Behavioral acceptance criteria**:
1. The viewport label is visible at the top-left of its viewport region.
2. The active viewport is visually distinguishable from inactive viewports.
3. The final remaining viewport cannot be closed from viewport chrome.
4. Clicking the close button closes that viewport and does not activate a different
   viewport first.

---

### Step 20 - Create `ViewportResizeHandle`

**Action**: Render a segmented resize handle and report absolute cumulative divider
fractions on drag end. The component receives actual handle rectangles from
`computeViewportResizeHandles`; it does not decide whether a handle should be full
height or segmented.

**Files**: `src/components/editor/ViewportResizeHandle.tsx` (new)

Props:

```ts
interface ViewportResizeHandleProps {
  handle: ViewportResizeHandleRect
  containerWidth: number
  containerHeight: number
  onDragEnd(
    direction: 'vertical' | 'horizontal',
    dividerIndex: number,
    dividerFraction: number,
  ): void
}
```

Rules:
- A vertical handle uses `cursor: col-resize`; a horizontal handle uses
  `cursor: row-resize`.
- Dragging computes an absolute cumulative divider fraction:
  - vertical: `eventXRelativeToContainer / containerWidth`
  - horizontal: `eventYRelativeToContainer / containerHeight`
- Dispatch only once on mouseup/pointerup.
- Remove document-level listeners when dragging ends or component unmounts.

**Behavioral acceptance criteria**:
1. Dragging a vertical handle in a three-column layout changes only the two columns
   adjacent to that divider.
2. Dragging a horizontal handle in a three-row layout changes only the two rows
   adjacent to that divider.
3. For the three-viewport two-on-top/one-bottom layout, the vertical handle is
   visible only over the top row.
4. `onDragEnd` fires once per completed drag and never fires repeatedly during move.

---

### Step 21 - Wire chrome and resize handles into `ThreeViewport`

**Action**: Add a DOM overlay above the canvas with one `ViewportChrome` per viewport
and one `ViewportResizeHandle` per actual shared edge segment.

**Files**: `src/components/editor/ThreeViewport.tsx` (extend)

Requirements:
- Overlay root is `position: absolute; inset: 0; pointer-events: none`.
- Interactive chrome and handles opt into pointer events.
- Viewport chrome uses `deriveViewportLabel`.
- Handles use `computeViewportResizeHandles(viewportRects, width, height, colFractions, rowFractions)`.
- Handle drag dispatches `SET_COL_DIVIDER` or `SET_ROW_DIVIDER` with absolute
  cumulative divider fraction.
- Add/remove viewport actions reset manual resize ratios.

**Behavioral acceptance criteria**:
1. Adding a second viewport shows two labels and one resize handle between them.
2. Adding a third viewport shows two top labels, one full-width bottom label, a
   vertical handle only across the top row, and horizontal shared-edge coverage
   between the top row and bottom viewport.
3. Adding a fifth viewport in a 3-column x 2-row layout does not show a resize handle
   on the final row's local split between the two bottom viewports.
4. Dragging a handle never shrinks a viewport below the configured minimum size.
5. Closing a viewport from chrome and removing it from the manager produce the same
   reflowed layout.

---

### Step 22 - Create `SceneViewportManager`

**Action**: Add manager controls to the Scene sidebar for adding and removing
Perspective, Top, Left, and Right viewports.

**Files**: `src/components/editor/SceneViewportManager.tsx` (new)

Rendering:
- Heading `Viewports`.
- Current viewport list with labels from `deriveViewportLabel`.
- Remove button for each row only when more than one viewport exists.
- Add buttons: `+ Perspective`, `+ Top`, `+ Left`, `+ Right`.

**Behavioral acceptance criteria**:
1. The manager initially shows one Perspective viewport.
2. Clicking `+ Top` adds a Top viewport and reflows the canvas.
3. Clicking `+ Perspective` twice shows numbered Perspective labels while duplicates
   exist.
4. Removing a viewport from the manager uses the same behavior as closing it from
   viewport chrome.
5. The final remaining viewport cannot be removed from the manager.

---

### Step 23 - Wire `ViewportProvider` and manager into `App`

**Action**: Add `ViewportProvider` around the editor shell and place
`SceneViewportManager` in the right-side Scene/Inspector area available in the React
editor surface.

**Files**: `src/App.tsx` (modify)

Requirements:
- Import `ViewportProvider` and `SceneViewportManager`.
- Wrap the editor shell in `ViewportProvider`.
- Add `SceneViewportManager` to the Scene tab/panel UI where viewport controls are
  discoverable.
- Keep layout state session-only; no persistence.

**Behavioral acceptance criteria**:
1. On `/`, the React app shows the viewport manager and one Perspective viewport.
2. Adding a viewport from the manager immediately creates a corresponding labeled
   canvas region.
3. Removing a viewport from the manager removes the corresponding canvas region and
   recomputes a square-ish layout.

---

### Step 24 - Unit tests for pure grid utilities

**Action**: Add focused Jest tests for all pure viewport-grid utilities.

**Files**: `src/lib/viewport-grid.test.ts` (new)

Tests:
- `makeEqualFractions`: 0, 1, 3, and negative input.
- `getViewportGridDimensions`: 1, 2, 3, 5.
- `computeViewportGrid`: empty, one, two, three, four, custom unequal fractions,
  zero container size, malformed fractions.
- `computeViewportResizeHandles`: one viewport, two side-by-side, three
  two-on-top/one-bottom, four quadrants, and five viewports in a 3-column x 2-row
  grid with an incomplete final row.
- `deriveViewportLabel`: single type, duplicates, removing duplicate, mixed types.

**Behavioral acceptance criteria**:
1. `yarn test --testPathPattern viewport-grid` passes.
2. Tests verify the three-viewport layout has no vertical handle crossing the bottom
   viewport.
3. Tests verify every returned handle maps to an actual shared edge between
   viewport rectangles.
4. Tests verify the five-viewport layout omits handles for incomplete-row local
   split edges that are not backed by global `colFractions`.

---

### Step 25 - Unit tests for `viewportReducer`

**Action**: Add focused tests for viewport state transitions, especially the absolute
divider math for 3+ rows and columns.

**Files**: `src/store/viewport-reducer.test.ts` (new)

Tests:
- Initial state shape.
- Add each viewport type.
- Duplicate type labels via reducer state plus `deriveViewportLabel`.
- Remove last viewport is prevented.
- Remove active viewport picks a remaining active viewport.
- Add/remove resets manual resize ratios.
- `SET_ACTIVE` accepts known IDs and ignores unknown IDs.
- `SET_COL_DIVIDER` with two columns clamps min size.
- `SET_COL_DIVIDER` with three columns preserves the untouched column and only
  resizes the adjacent pair.
- `SET_ROW_DIVIDER` with three rows preserves untouched rows and only resizes the
  adjacent pair.
- Invalid divider indices are ignored safely.

**Behavioral acceptance criteria**:
1. `yarn test --testPathPattern viewport-reducer` passes.
2. Three-column resize tests prove divider fractions are absolute cumulative
   positions, not individual column widths.
3. Three-row resize tests prove the same behavior for row dividers.

---

### Step 26 - Component tests for viewport chrome and handles

**Action**: Add focused Testing Library tests for viewport chrome and resize handles.

**Files**:
- `src/components/editor/ViewportChrome.test.tsx` (new)
- `src/components/editor/ViewportResizeHandle.test.tsx` (new)

Tests:
- Chrome renders label text and `data-viewport-id`.
- Chrome exposes active state.
- Close button appears only when `canClose` is true.
- Close click calls `onClose` exactly once and not `onActivate`.
- Resize handle exposes the correct cursor for each direction.
- Resize handle reports an absolute divider fraction on drag end.
- Resize handle removes document listeners after drag end.

**Behavioral acceptance criteria**:
1. `yarn test --testPathPattern ViewportChrome` passes.
2. `yarn test --testPathPattern ViewportResizeHandle` passes.
3. Tests prove resize callbacks are emitted once per drag completion.

---

### Step 27 - Component tests for viewport manager

**Action**: Add Testing Library tests for the manager inside `ViewportProvider`.

**Files**: `src/components/editor/SceneViewportManager.test.tsx` (new)

Tests:
- Initial manager render.
- Add Top.
- Add duplicate Perspective and numbered labels appear.
- Remove from a two-viewport list.
- Remove button absent when only one viewport remains.

**Behavioral acceptance criteria**:
1. `yarn test --testPathPattern SceneViewportManager` passes.
2. Tests do not instantiate `THREE.WebGLRenderer`.
3. Manager tests prove add/remove reuses the shared reducer behavior.

---

### Step 28 - Integration tests for `ThreeViewport` behavior

**Action**: Add focused component tests for behavior at the `ThreeViewport` boundary.
Mock only WebGL renderer and controls enough to observe public effects: labels,
active state, event routing, and add/remove layout changes.

**Files**: `src/components/editor/ThreeViewport.test.tsx` (new)

Tests:
- Initial render shows one Perspective label and no close button.
- Adding a viewport through context/manager shows a second label.
- Clicking viewport B makes B active.
- Closing viewport B removes its label and reflows the remaining layout.
- Dragging or wheeling inside viewport B changes only B camera state in the mocked
  controls; viewport A's mocked camera state remains unchanged.
- Moving the shared cube object in the scene before a render is reflected in every
  viewport render observation.
- No transform/gumball UI is expected or tested because this feature does not create
  one on the React viewport surface.

**Behavioral acceptance criteria**:
1. `yarn test --testPathPattern ThreeViewport` passes.
2. Tests prove control routing isolates camera interactions to the viewport under
   the pointer.
3. Tests prove scene state is shared across all visible viewport renders.

---

### Step 29 - Update app-level tests

**Action**: Update the existing `src/App.test.tsx` baseline so it matches the
approved root-entrypoint change and verifies the feature is reachable.

**Files**: `src/App.test.tsx` (modify)

Tests:
- Root `index.html` contains `/src/main.tsx` and no redirect to `/editor/index.html`.
- `/public/editor/index.html` still contains the official editor title and imports.
- Rendering `<App />` shows the viewport manager and initial Perspective viewport.

**Behavioral acceptance criteria**:
1. `yarn test --testPathPattern App` passes.
2. Tests fail if `/` is changed back to the static official editor redirect.
3. Tests prove the planned multi-viewport UI exists on the served React app surface.

---

## Architecture Summary

```
Root route (/)
  index.html -> /src/main.tsx -> App -> ViewportProvider -> ThreeViewport

Static official editor route
  /editor/index.html remains available under public/editor/

Pure utilities
  viewport-grid.ts:
    makeEqualFractions
    getViewportGridDimensions
    computeViewportGrid
    computeViewportResizeHandles
    deriveViewportLabel

State
  viewport-reducer.ts:
    viewports[]
    activeViewportId
    colFractions / rowFractions
    typeCounters
    absolute divider actions

Three helpers
  three-scene.ts:
    buildEditorScene
    createViewportCamera
    createViewportControls

React components
  ThreeViewport:
    one renderer
    one shared scene
    multiple cameras/controls
    scissor render loop
    routed controls
  ViewportChrome:
    label / close / active state
  ViewportResizeHandle:
    segmented handles
    absolute divider fractions
  SceneViewportManager:
    add/remove controls
```

## Critical Invariants

1. **One scene, many cameras**: All viewports render the same scene object. Direct
   object position/rotation/scale mutations are scene changes, not per-viewport
   copies. This plan does not create a new transform/gumball tool.
2. **One active interaction target**: Although all OrbitControls share one canvas,
   only the viewport under the pointer (or the active viewport for keyboard-driven
   interactions) has controls enabled during interaction.
3. **Absolute divider math**: Resize handles report cumulative divider position.
   Reducer logic converts that absolute divider into adjacent column/row sizes while
   preserving the adjacent pair's previous total.
4. **Handles map to real shared, resizable edges**: Resize handles are generated from
   actual viewport rectangles and only for edges backed by global row/column
   fractions. Incomplete-row local split edges are not draggable in this scoped
   feature.
5. **Session-only state**: Viewport layout state lives only in React reducer state.
   Reloading resets to one Perspective viewport.
6. **Reachable implementation surface**: The root route serves the React editor
   containing `ThreeViewport`; `/editor/index.html` remains the static official
   editor route.

## Validation Commands

Focused validation after implementation:

```bash
yarn test --testPathPattern viewport-grid
yarn test --testPathPattern viewport-reducer
yarn test --testPathPattern three-scene
yarn test --testPathPattern ViewportChrome
yarn test --testPathPattern ViewportResizeHandle
yarn test --testPathPattern SceneViewportManager
yarn test --testPathPattern ThreeViewport
yarn test --testPathPattern App
yarn typecheck
```

Do not add, remove, or upgrade dependencies.
