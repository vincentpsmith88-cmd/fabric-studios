# ShopDrop cleanup review and production recommendations

Review target: the uploaded `seamer-studio-main.zip` archive. This is a
source-level review. No claim is made that the app was installed, built,
deployed or simulated during this review.

## Executive assessment

Seamer Studio is a promising foundation for a browser-based pattern and
garment-simulation product. The source contains a SvelteKit application,
pattern-model and cloth-simulation packages, avatar integration, WebGPU/WGSL
kernels, exports, server routes and a substantial test suite.

It is **not yet a verified production garment simulator for ShopDrop**.
The README explicitly records that 0 of 7 garment examples passed the full
released-drape acceptance test at its documented checkpoint. The completion
record also states that its browser tests used Chromium/emulated touch and
SwiftShader; physical GPU and phone validation remain outstanding.

## Cleanup performed in this delivery

- Replaced the stale `.env.example` entries (`DATABASE_URL`, `BETTER_AUTH_*`,
  `PUBLIC_STRIPE_PUBLISHABLE_KEY`, `PUBLIC_ENABLE_GUEST_PATTERN_STUDIO`) with
  environment settings actually referenced by the checked-in runtime and
  deployment documentation.
- Added `SHOPDROP-QUICKSTART.md` with the missing source prerequisites,
  reproducible sibling-repository setup, local run and Node deployment steps.
- Added this review so the current engineering limitations and ShopDrop
  acceptance gates are visible instead of being mistaken for completed work.

No simulation solver, geometry algorithm, authentication implementation or
pattern data model was rewritten. Those changes require the missing external
source dependencies and a working build/test environment; changing them
without that environment would risk damaging the project.

## Findings

### P0 — source archive cannot build by itself

The root `package.json` and lockfile link six `@atelier/*` packages to
`../atelier/packages/...`. That sibling repository is absent from the ZIP.
The `vendor/body-model` Git submodule is also empty in the ZIP. The checked-in
CI workflow confirms that it separately checks out Atelier and initializes
submodules. A ZIP download does not preserve the Git submodule metadata needed
to populate those sources automatically.

**Action:** use a Git checkout with recursive submodules and the sibling
`atelier` checkout, or create a complete, pinned source bundle that includes
both dependencies and their licences.

### P0 — garment drape is not production-validated

The README states 0/7 garments passed the full released-drape acceptance test
at the recorded garment-pipeline checkpoint. Initial clearance/self-intersection
checks and successful shader compilation are not proof of stable sewn garment
drape, fit accuracy or physical realism.

**Action:** create a ShopDrop garment acceptance suite: T-shirt, shirt with
sleeves, dress, trousers and a difficult garment with curved seams. Test
assembly, body collision, self-collision, seam integrity, settling, repeatability
and export against reference outcomes. Require all agreed acceptance cases to
pass on real target GPUs.

### P0 — SVG sewing workflow needs explicit validation

The editor and pattern model are substantial, but ShopDrop must verify that
its exact SVG files import with correct physical scale, closed outlines,
Bezier curves, holes, notches, grainlines and seam allowances. SVG geometry
alone does not define which edges are sewn together.

**Action:** add an import preview and a sewing-edge assignment/confirmation
step. Preserve original SVGs and record import warnings and unit assumptions.
Do not silently guess seam pairings.

### P1 — online hosting profile must be selected deliberately

`pnpm build` is the static profile. The documented Node profile is
`pnpm build:server`. The collaboration store is file-backed, serializes writes
and is explicitly documented as single-process. That is useful for a
controlled pilot, but not a horizontally scaled multi-instance production
service.

**Action:** for ShopDrop production, use ShopDrop's existing identity and
tenant authorization, durable object storage for pattern/model assets, a
database for job/document metadata, and a queue/worker system for long-running
simulation. Keep the browser as the interactive preview client. Do not expose
private storage paths or trust client-supplied tenant IDs.

### P1 — GPU/browser compatibility and performance

The simulation depends on WebGPU and browser GPU capabilities. CI shader
compilation or SwiftShader execution is not a substitute for testing Chrome,
Edge and Safari on real target hardware. Mobile WebGPU support varies.

**Action:** add a capability check before opening simulation, informative
unsupported-device states, a tested lower-fidelity fallback if feasible, and
server-side simulation for jobs that exceed device limits. Measure time to
first preview, settling time, memory and crash rate.

### P1 — persistence and recovery

Local editing/history and the self-hosted collaboration store are not the
same as ShopDrop's multi-customer storage and permissions.

**Action:** define APIs for create simulation, upload assets, get job status,
cancel job, retrieve preview, retrieve export and delete customer data. Use
signed upload/download URLs, tenant-scoped authorization, quotas, retention
policies and audit events.

### P1 — licence and supply-chain review

The root project declares MIT. The external Atelier and body-model repositories
are separate codebases/submodules and must be reviewed at their pinned commits.
Review all bundled fonts, HDRI files, textures, sample garments and imported
third-party code for redistribution rights. Keep attribution and notices.

**Action:** generate an SBOM and licence inventory from the complete checkout;
pin Git dependencies to commits; run dependency vulnerability scanning before
release.

### P2 — remove misleading setup and deployment assumptions

The old `.env.example` listed variables not referenced anywhere in the
application source found in this archive. It has been replaced with the
documented runtime/build variables. Re-check this file whenever configuration
is added.

**Action:** add a CI check that verifies environment documentation and run
`pnpm check`, `pnpm test`, `pnpm lint`, `pnpm build` and `pnpm build:server`
from a clean checkout.

## Recommended ShopDrop architecture

- **Frontend:** embed the Seamer editor/simulation experience in ShopDrop.
- **Browser simulation:** WebGPU for responsive interactive preview where
  supported.
- **Simulation worker:** isolated worker/service for high-quality or long jobs;
  use a queue, resource limits and cancellation.
- **Assets:** private object storage for SVG, avatar, textures, preview PNG and
  GLB exports.
- **Metadata:** ShopDrop-owned database records for tenant, user, garment,
  pattern revision, material settings, simulation status and export references.
- **Security:** authenticate through ShopDrop; authorize every asset and job
  server-side; validate file type, size and SVG content; never trust filenames
  or client paths.
- **Observability:** structured job logs, solver diagnostics, GPU/browser
  capability metrics, failed-import reasons and simulation timing.

## Suggested release gates

1. **Developer preview:** reproducible clean checkout; all dependencies pinned;
   app builds and starts; sample garment simulates.
2. **SVG alpha:** import at least 20 real ShopDrop patterns; scale and geometry
   verified; manual seam pairing; save/reopen without data loss.
3. **Garment alpha:** at least five complete garment types sew and settle;
   no seam tears or body penetration beyond agreed tolerances; exports reopen.
4. **Private pilot:** ShopDrop authentication, tenant isolation, storage,
   quotas, job recovery, monitoring and privacy deletion verified.
5. **Production:** hardware browser matrix, load tests, GPU-failure handling,
   backup/restore, security review, licence/SBOM review and signed release.

## Verification status of this cleanup

The uploaded archive was inspected without executing its code. The local
environment used for this review does not have pnpm installed, and the ZIP
omits Atelier and body-model sources. Therefore `pnpm install`, type-check,
unit tests, browser tests and production builds were **not run**. Install and
verification instructions are provided in `SHOPDROP-QUICKSTART.md`.
