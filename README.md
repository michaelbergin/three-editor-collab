# Three Editor Collab

Collaborative Three.js editor playground built from the official Three.js editor UI, served by Vite with TypeScript, Tailwind CSS, shadcn-style component infrastructure, ESLint, and Jest available for local iteration.

## Stack

- Yarn 1.22 for dependency management
- Vite 8 + React 19 + TypeScript 6
- Three.js 0.184.0 with the matching official `r184` editor UI
- Local vendored editor runtime assets, including matching path tracer modules
- Tailwind CSS 4 through `@tailwindcss/vite`
- shadcn-compatible `components.json`, `cn`, and UI primitives
- ESLint, `tsc -b` typechecking, Jest + Testing Library

## Getting Started

Install dependencies:

```sh
yarn
```

The install step runs `yarn sync:three-assets` through `postinstall` to refresh generated Three.js runtime assets from `node_modules`.

Run the local dev server:

```sh
yarn dev
```

Vite serves the app at [http://127.0.0.1:3030/](http://127.0.0.1:3030/), which redirects to `/editor/index.html`.

Build for production:

```sh
yarn build
```

## Quality Checks

```sh
yarn typecheck
yarn lint
yarn test
```

## Project Layout

```txt
src/
  components/ui/
  lib/utils.ts
  test/
public/
  editor/
  build/      # generated, ignored
  examples/   # generated, ignored
  vendor/     # generated, ignored
```

## shadcn Components

The repo is initialized with `components.json` and path aliases. Add more components with:

```sh
yarn dlx shadcn@latest add <component>
```
