# Atelier Forge / Seamer Studio optimization update

## Changes in this update

### 2D Pattern Studio initial framing
- The canvas now measures its real DOM dimensions and performs an initial `fitView()` after mount.
- This fixes a lifecycle race where the pattern effect could mark a document as fitted before the canvas had a usable 2D context/size. If the measured canvas happened to equal the old 800x600 defaults, the resize observer could also skip the first fit.
- Resize-driven fitting remains enabled when the workspace layout changes.
- Manual zoom and pan remain unchanged; the existing Fit button remains available.

### 3D Avatar Studio framing
- Added `PatternRenderer.fitAvatarAndGarment()` to frame the actual avatar and current cloth geometry inside the measured, unobstructed viewport.
- Added a camera-toolbar control with the accessible label “Fit avatar and garment”.
- The explicit fit is saved as the user's camera choice. Existing orbit, zoom-to-garment, and reset behavior remain available.

## Important scope note
This is a targeted camera/framing patch, not a claim that every broader performance recommendation or OpenAI feature has already been implemented. The original WebGPU simulation and recommendation code has been preserved. The next performance work should be benchmark-led: GPU/CPU readback reduction, adaptive solver quality, worker-based geometry preparation, and device-loss recovery. OpenAI should be added through a server-side gateway with the central API key kept off the client.

## Validation status
The source archives did not include installed dependencies (`node_modules`), and `pnpm` is not installed in this execution environment. Therefore Svelte type-checking, unit tests, browser tests, and real-GPU performance tests could not be run here. Run the project's checks after installing dependencies on the development machine.
