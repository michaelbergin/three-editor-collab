# Three Editor Collab

Collaborative Three.js editor playground built with Vite, React, TypeScript, Tailwind CSS, shadcn-style components, ESLint, and Jest.

## Stack

- Yarn 1.22 for dependency management
- Vite 8 + React 19 + TypeScript 6
- Three.js 0.184.0
- Tailwind CSS 4 through `@tailwindcss/vite`
- shadcn-compatible `components.json`, `cn`, and UI primitives
- ESLint, `tsc -b` typechecking, Jest + Testing Library

## Getting Started

Install dependencies:

```sh
yarn
```

Run the local dev server:

```sh
yarn dev
```

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
  components/
    editor/ThreeViewport.tsx
    ui/
  lib/utils.ts
  test/
```

## shadcn Components

The repo is initialized with `components.json` and path aliases. Add more components with:

```sh
yarn dlx shadcn@latest add <component>
```
