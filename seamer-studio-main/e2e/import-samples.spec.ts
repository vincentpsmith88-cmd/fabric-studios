import { expect, test, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
	await page.addInitScript(() => {
		localStorage.setItem('seamer.welcomeSeen', '1');
		// Explicit-save cases must observe dirty state before the autosave interval.
		localStorage.setItem('seamer.autosaveSeconds', '120');
	});
});

async function openStudio(page: Page) {
	await page.goto('/studio', { waitUntil: 'domcontentloaded' });
	const patternName = page.getByRole('textbox', { name: 'Pattern name' });
	await expect(patternName).toHaveValue('New Pattern');
	await page.getByRole('button', { name: 'Library', exact: true }).click();
	await page.getByRole('button', { name: /Pencil skirt - 3D/ }).click();
	await expect(patternName).toBeVisible();
	await expect(patternName).toHaveValue('Pencil skirt - 3D');
}

async function importSample(page: Page, file: string) {
	await page.getByTestId('import-menu-trigger').click();
	await page.getByTestId(`import-sample-${file}`).click();
}

test('opens with a blank pattern instead of loading a template', async ({ page }) => {
	await page.goto('/studio', { waitUntil: 'domcontentloaded' });
	await expect(page.getByRole('textbox', { name: 'Pattern name' })).toHaveValue('New Pattern');
	await expect(page.getByText('P:0 · Paths:0 · Pieces:0 · Seams:0')).toBeVisible();
	await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test.describe('Import samples', () => {
	test('studio loads and pattern name input is present', async ({ page }) => {
		const seamWarnings: string[] = [];
		const templateRequests: string[] = [];
		page.on('request', (request) => {
			if (request.url().includes('/templates/')) templateRequests.push(request.url());
		});
		page.on('console', (message) => {
			if (/Seam (?:particle count|length) mismatch/.test(message.text())) {
				seamWarnings.push(message.text());
			}
		});
		await openStudio(page);
		await expect(page.getByTestId('pattern-name-input')).toBeVisible();
		await expect(page.getByText('P:35 · Paths:36 · Pieces:4 · Seams:12')).toBeVisible();
		const scene = page.getByTestId('pattern-scene-3d');
		await expect(scene).toBeVisible();
		await expect(scene.locator('canvas')).toBeVisible();
		await expect(scene).toHaveAttribute('data-status', 'ready');
		expect(templateRequests.some((url) => url.endsWith('/templates/pencil-skirt.seamer.ssp'))).toBe(true);
		// The native SSP intentionally starts without a saved drape. Its two composite waistband
		// seams use proportional particle sampling (33 vs 35) during the source arrangement rebuild,
		// so allow those known fallbacks but reject every other warning.
		const allowedSeamWarnings = [
			'Seam particle count mismatch (Seam_uzave2eyv): 33 vs 35 — fallback proportional sampling applied',
			'Seam particle count mismatch (Seam_sibuwpf53): 33 vs 35 — fallback proportional sampling applied'
		];
		expect(seamWarnings.filter((warning) => !allowedSeamWarnings.includes(warning))).toEqual([]);
	});

	test('full 2D mode refits the canonical draft to the expanded canvas', async ({ page }) => {
		await openStudio(page);
		const splitZoom = Number.parseInt(await page.getByTestId('zoom-percent').innerText(), 10);
		await page.getByRole('button', { name: '2D', exact: true }).click();
		await expect.poll(async () => Number.parseInt(await page.getByTestId('zoom-percent').innerText(), 10))
			.toBeGreaterThan(splitZoom + 20);
	});

	test('complete SSP sample library is visible and loads a bundled project', async ({ page }) => {
		await openStudio(page);
		await page.getByTestId('templates-menu-trigger').click();
		await expect(page.getByText('Complete SSP samples (21)')).toBeVisible();
		// 21 SSP projects, two drafting templates, and the lantern generator.
		await expect(page.locator('[data-testid^="template-"]')).toHaveCount(25);

		const sampleResponse = page.waitForResponse((response) =>
			response.url().endsWith('/templates/reference-ssp/04-panty-block.seamer.ssp') && response.ok()
		);
		await page.getByTestId('template-panty-block').click();
		await sampleResponse;

		await expect(page.getByTestId('pattern-name-input')).toHaveValue('Panty Block');
		await expect(page.getByText(/Pieces:3 · Seams:0/)).toBeVisible();
	});

	const samples = [
		{ file: 'pocket-curved.svg', label: 'Pocket (curved, SVG)', name: 'pocket-curved' },
		{ file: 'two-pieces.svg', label: 'Two pieces (SVG)', name: 'two-pieces' },
		{ file: 'rect-piece.dxf', label: 'Rectangle (DXF)', name: 'rect-piece' },
		{ file: 'curved-hem.dxf', label: 'Curved hem (DXF bulge)', name: 'curved-hem' }
	];

	for (const sample of samples) {
		test(`imports ${sample.label}`, async ({ page }) => {
			await openStudio(page);
			await importSample(page, sample.file);

			await expect(page.getByText(`Imported "${sample.name}"`)).toBeVisible();
			await expect(page.getByTestId('pattern-name-input')).toHaveValue(sample.name);
			const canvas = page.getByTestId('pattern-canvas-2d');
			await expect(canvas).toBeVisible();
			const box = await canvas.boundingBox();
			expect(box?.width).toBeGreaterThan(0);
			expect(box?.height).toBeGreaterThan(0);
		});
	}

	test('combines multiple SVG uploads into separately placed 3D pieces', async ({ page }) => {
		await page.goto('/studio', { waitUntil: 'domcontentloaded' });
		await expect(page.getByRole('textbox', { name: 'Pattern name' })).toHaveValue('New Pattern');
		await page.getByRole('button', { name: 'Import', exact: true }).click();
		const fileChooserPromise = page.waitForEvent('filechooser');
		await page.getByRole('button', { name: /SVG pattern pieces/ }).click();
		const fileChooser = await fileChooserPromise;
		expect(fileChooser.isMultiple()).toBe(true);
		await fileChooser.setFiles([
			{ name: 'front.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="50mm" height="40mm" viewBox="0 0 50 40"><path d="M0 0 H50 V40 H0 Z"/></svg>') },
			{ name: 'back.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="45mm" height="30mm" viewBox="0 0 45 30"><path d="M0 0 H45 V30 H0 Z"/></svg>') }
		]);

		await expect(page.getByRole('heading', { name: 'Combine SVG pattern pieces' })).toBeVisible();
		await page.getByRole('dialog').getByRole('button', { name: 'Import', exact: true }).click();
		await expect(page.getByRole('textbox', { name: 'Pattern name' })).toHaveValue('Combined SVG garment');
		await expect(page.getByText('Imported "Combined SVG garment"')).toBeVisible();
		const result = await page.evaluate(() => {
			const pattern = window.seamer!.getPattern();
			return {
				pieces: pattern.pieces.map(piece => piece.name),
				minXs: pattern.pieces.map(piece => Math.min(...piece.mainPaths.flatMap(edge =>
					edge.path ? pattern.paths.find(path => path.id === edge.path)?.pathPoints.map(point =>
						pattern.points.find(candidate => candidate.id === point.id)?.x ?? 0) ?? [] : []
				)))
			};
		});
		expect(result.pieces).toEqual(['front: Piece 1', 'back: Piece 1']);
		expect(result.minXs[1]).toBeGreaterThan(result.minXs[0] + 50);
	});

	test('an import becomes the active unsaved document and survives save/reload', async ({ page }) => {
		await openStudio(page);
		const patternName = page.getByTestId('pattern-name-input');
		await expect(patternName).toHaveValue('Pencil skirt - 3D');
		await page.getByRole('button', { name: 'Import', exact: true }).click();
		await page.getByRole('button', { name: 'Two pieces (SVG)', exact: true }).click();

		await expect(page.getByText('Imported "two-pieces"')).toBeVisible();
		await expect(patternName).toHaveValue('two-pieces');
		const importedGeometry = await page.evaluate(() => {
			const document = window.seamer!.getPattern();
			return { points: document.points, paths: document.paths, pieces: document.pieces.map(({ id, mainPaths, internalPaths }) => ({ id, mainPaths, internalPaths })) };
		});
		expect(new URL(page.url()).pathname).toMatch(/\/studio\/[^/]+$/);
		const importedUrl = page.url();

		// The old bug left the stale "Saved" state in place even though no imported record existed.
		// Observing the dirty state before saving makes that lifecycle regression deterministic.
		await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeVisible();
		await page.getByRole('button', { name: 'Save', exact: true }).click();
		await expect(page.getByRole('button', { name: 'Saved', exact: true })).toBeVisible();
		await page.reload({ waitUntil: 'domcontentloaded' });
		expect(page.url()).toBe(importedUrl);
		await expect(page.getByTestId('pattern-name-input')).toHaveValue('two-pieces');
		await expect.poll(() => page.evaluate(() => {
			const document = window.seamer!.getPattern();
			return { points: document.points, paths: document.paths, pieces: document.pieces.map(({ id, mainPaths, internalPaths }) => ({ id, mainPaths, internalPaths })) };
		})).toEqual(importedGeometry);
	});

	test('object browser lists imported pieces', async ({ page }) => {
		await openStudio(page);
		await importSample(page, 'two-pieces.svg');
		await expect(page.getByText('Imported "two-pieces"')).toBeVisible();

		await page.getByTestId('object-browser-toggle').click();
		const browser = page.getByTestId('object-browser');
		await expect(browser).toBeVisible();
		await expect(browser.getByTestId('object-browser-pieces-count')).toHaveText('Pieces (2)');
		await expect(browser.getByTestId('object-browser-piece')).toHaveCount(2);
		await expect(browser.getByTestId('object-browser-piece').nth(0)).toContainText('Piece 1');
		await expect(browser.getByTestId('object-browser-piece').nth(1)).toContainText('Piece 2');
	});

	test('rejects an invalid 3D import without replacing the active document', async ({ page }) => {
		await openStudio(page);
		const scene = page.getByTestId('pattern-scene-3d');
		await expect(scene).toHaveAttribute('data-status', 'ready');

		const invalidLegacy = {
			name: 'Broken bow-tie',
			pieces: [{
				name: 'Crossed piece',
				origin: [0, 0],
				grain: [0, 1],
				materialId: 'Material',
				boundary: [
					[[0, 0], [100, 100]],
					[[100, 100], [0, 100]],
					[[0, 100], [100, 0]],
					[[100, 0], [0, 0]]
				],
				sewLines: [
					[[0, 0], [100, 100]],
					[[100, 100], [0, 100]],
					[[0, 100], [100, 0]],
					[[100, 0], [0, 0]]
				]
			}]
		};

		const chooserPromise = page.waitForEvent('filechooser');
		await page.getByTestId('import-menu-trigger').click();
		await page.getByRole('button', { name: /From file/ }).click();
		const chooser = await chooserPromise;
		await chooser.setFiles({
			name: 'broken.json',
			mimeType: 'application/json',
			buffer: Buffer.from(JSON.stringify(invalidLegacy))
		});

		await expect(page.getByText(/Cannot import "Broken bow-tie"/)).toBeVisible();
		await expect(page.getByTestId('pattern-name-input')).toHaveValue('Pencil skirt - 3D');
		await expect(scene).toHaveAttribute('data-status', 'ready');
		await expect(scene.getByRole('button', { name: 'Start simulation' })).toBeEnabled();
	});
});
