# Seamer Studio — source setup

This project archive is **not self-contained**. The application uses a sibling
`atelier` repository through local `link:` dependencies and a Git submodule at
`vendor/body-model`. The uploaded ZIP contains neither dependency's contents.
Do not expect `pnpm install` or `pnpm build` to work from this ZIP alone.

## Recommended reproducible checkout

Use Node.js 22 and pnpm 10.18.1 (the versions used by the repository CI).

```bash
# Create a parent folder; the two repositories must be siblings.
mkdir seamer-work
cd seamer-work

git clone https://github.com/ahzs645/seamer-studio.git
git clone https://github.com/ahzs645/atelier.git

cd seamer-studio
git submodule update --init --recursive

# Install Atelier's dependencies first, then Seamer's.
cd ../atelier
pnpm install --frozen-lockfile

cd ../seamer-studio
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm lint
pnpm build
```

The exact repository branch/commit should be pinned before a production release.
The `atelier` path is significant: Seamer's dependencies point to
`../atelier/packages/...`.

## Run locally

```bash
pnpm dev
```

Open the local URL printed by Vite. WebGPU simulation requires a compatible
browser, GPU and driver. A browser may open the editor while the simulation
engine remains unavailable or falls back; verify the simulation status in the
actual target browser.

## Build for self-hosted online deployment

The default `pnpm build` produces the static application. The project documents
persistent accounts, collaboration and server routes under its Node profile:

```bash
pnpm build:server
mkdir -p /absolute/private/seamer-data
chmod 700 /absolute/private/seamer-data
SEAMER_DATA_DIR=/absolute/private/seamer-data \
ORIGIN=https://your-domain.example \
BODY_SIZE_LIMIT=13M \
node server-build
```

Use HTTPS behind a reverse proxy. Keep the data directory outside the public
web root, back it up, and run only one app process against it. The current
collaboration persistence is file-backed; it is not a horizontally scalable
database deployment. See `self-hosting-collaboration.md`.

## Before ShopDrop integration

1. Verify SVG import using actual ShopDrop production SVGs, including units,
   curves, holes, notches and seam allowances.
2. Verify that multiple pattern pieces can be paired and sewn, not merely
   displayed as independent 2D outlines.
3. Verify a complete garment reaches a stable drape on target avatars.
4. Test WebGPU availability and a documented fallback on supported browsers.
5. Add ShopDrop authentication, tenant isolation, storage and job tracking
   through explicit integration contracts; do not expose Seamer's local
   development stores as a public customer API.
