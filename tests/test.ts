import { expect, test, type Page } from '@playwright/test';
import { describe } from 'node:test';
import fc from 'fast-check';

// To keep the console clean, throw an error to fail the test immediately if a console message occurs.
test.beforeEach(({ page }) => {
	page.on('console', (message) => {
		if (message.type() in ['warning', 'error']) {
			throw new Error(`Unexpected error in console: ${message.text()}`);
		}
	});
});

test('index page has expected h1', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { name: 'Demo folder', exact: true })).toBeVisible();
});

test('index page does not show commented-out latex notes', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByText('Yes, we like our punny set names')).toBeVisible();
	await expect(page.getByText("nope this shouldn't show up")).not.toBeVisible();
});

test('index page can be filtered', async ({ page }) => {
	await page.goto('/');
	const reel = page.getByText('The Old Morpeth Rant', { exact: true });
	const jig = page.getByText('Seven Stars', { exact: true });
	await expect(reel).toBeVisible();
	await expect(jig).toBeVisible();

	await page.getByRole('checkbox', { name: 'Reels' }).uncheck();
	await expect(reel).not.toBeVisible();
	await expect(jig).toBeVisible();
});

test('index page can be filtered to show only core tunes', async ({ page }) => {
	await page.goto('/');
	const reel = page.getByText('The Old Morpeth Rant', { exact: true });
	const jig = page.getByText('Seven Stars', { exact: true });
	await expect(reel).toBeVisible();
	await expect(jig).toBeVisible();

	await page.getByRole('button', { name: 'Show only core tunes' }).tap();
	await expect(reel).not.toBeVisible();
	await expect(jig).toBeVisible();

	await page.getByRole('button', { name: 'Show all tunes' }).tap();
	await expect(reel).toBeVisible();
	await expect(jig).toBeVisible();
});

test('index page remembers filters', async ({ page }) => {
	await page.goto('/');

	await page.getByRole('checkbox', { name: 'Reels' }).uncheck();
	const reel = page.getByText('The Old Morpeth Rant', { exact: true });
	const jig = page.getByText('Seven Stars', { exact: true });
	await expect(reel).not.toBeVisible();
	await expect(jig).toBeVisible();

	await page.goto('/');
	await expect(reel).not.toBeVisible();
	await expect(jig).toBeVisible();

	await page.getByRole('checkbox', { name: 'Jigs' }).uncheck();
	await expect(reel).not.toBeVisible();
	await expect(jig).not.toBeVisible();

	// Should reset if we leave everything unchecked
	await page.goto('/');
	await expect(reel).toBeVisible();
	await expect(jig).toBeVisible();
});

test('autozoom zooms tunes when showing and hiding controls via clicking', async ({ page }) => {
	await page.goto('/Jigs-1-Severn-Stars');
	await expect(page.getByText('Upton upon Severn Stick Dance', { exact: true })).toBeInViewport();
	await expect(page.getByText('Seven Stars', { exact: true })).toBeInViewport();

	await page.getByRole('button', { name: 'Show controls' }).click();
	await expect(page.getByText('Upton upon Severn Stick Dance', { exact: true })).toBeInViewport();
	await expect(page.getByText('Seven Stars', { exact: true })).toBeInViewport();

	await page.getByRole('button', { name: 'Hide controls' }).click();
	await expect(page.getByText('Upton upon Severn Stick Dance', { exact: true })).toBeInViewport();
	await expect(page.getByText('Seven Stars', { exact: true })).toBeInViewport();
});

test('autozoom zooms tunes when navigating between tunes', async ({ page }) => {
	await page.goto('/Jigs-1-Severn-Stars');
	await expect(page.getByText('Upton upon Severn Stick Dance', { exact: true })).toBeInViewport();
	await expect(page.getByText('Seven Stars', { exact: true })).toBeInViewport();

	await page.getByRole('link', { name: 'Next set' }).click();
	await expect(page.getByText('The Cliffs Of Moher', { exact: true })).toBeInViewport();
	await expect(page.getByText('Spirit of the Dance', { exact: true })).toBeInViewport();
	await expect(page.getByText('The Roman Wall', { exact: true })).toBeInViewport();
	await expect(page.getByText('The Kesh', { exact: true })).toBeInViewport();
});

test('autozoom zooms tunes when navigating from manually zoomed set', async ({ page }) => {
	// Navigate and check autozoom has done useful things
	await page.goto('/Jigs-1-Severn-Stars');
	await expect(page.getByText('Upton upon Severn Stick Dance', { exact: true })).toBeInViewport();
	await expect(page.getByText('Seven Stars', { exact: true })).toBeInViewport();

	// Enable manual zoom
	await page.getByRole('button', { name: 'Show controls' }).click();
	await page.getByRole('button', { name: 'Zoom in' }).click();
	await page.getByRole('button', { name: 'Hide controls' }).click();

	// Navigate to the next set and check that we're autozoomed as expected
	// i.e. all tunes are visible, and there isn't a page turn button
	await page.getByRole('link', { name: 'Next set' }).click();
	await expect(page.getByText('The Cliffs Of Moher', { exact: true })).toBeInViewport();
	await expect(page.getByText('Spirit of the Dance', { exact: true })).toBeInViewport();
	await expect(page.getByText('The Roman Wall', { exact: true })).toBeInViewport();
	await expect(page.getByText('The Kesh', { exact: true })).toBeInViewport();
	await expect(page.getByRole('button', { name: 'Next page' })).not.toBeVisible();

	// Check one of the tunes actually appears exactly the same before and after reload
	const firstTuneOnPage = page.getByRole('img').first();
	await expect(firstTuneOnPage).toContainText('The Cliffs Of Moher');
	const tuneBB = await firstTuneOnPage.boundingBox();
	await page.reload();
	await expect(page.getByText('The Cliffs Of Moher', { exact: true })).toBeInViewport();
	const tuneBB2 = await firstTuneOnPage.boundingBox();
	expect(tuneBB!.width).toEqual(tuneBB2!.width);
});

test('autozoom restores zoom to correct value when navigating from manually zoomed set', async ({
	page
}) => {
	await page.goto('/Jigs-2-Lots-of-jigs');
	await expect(page.getByText('The Cliffs Of Moher', { exact: true })).toBeInViewport();
	await page.getByRole('button', { name: 'Show controls' }).click();
	await page.getByRole('button', { name: 'Zoom in' }).click();
	await page.getByRole('button', { name: 'Zoom in' }).click();
	await page.getByRole('button', { name: 'Zoom in' }).click();
	await page.getByRole('button', { name: 'Hide controls' }).click();
	await page.getByRole('link', { name: 'Next set' }).click();

	// Check one of the tunes actually appears exactly the same before and after reload
	const firstTuneOnPage = page.getByRole('img').first();
	await expect(firstTuneOnPage).toContainText('The Old Morpeth Rant');
	const tuneBB = await firstTuneOnPage.boundingBox();
	await page.reload();
	await expect(page.getByText('The Old Morpeth Rant', { exact: true })).toBeInViewport();
	const tuneBB2 = await firstTuneOnPage.boundingBox();
	expect(tuneBB!.width).toEqual(tuneBB2!.width);

	// Known good value from previous test run - maybe this should be a separate test
	expect(tuneBB!.width).toEqual(384);
});

test('set navigates to start when switching between different sets', async ({ page }) => {
	// Navigate and wait for abc to render
	await page.goto('/Jigs-1-Severn-Stars');
	await expect(page.getByText('Upton upon Severn Stick Dance', { exact: true })).toBeInViewport();

	// Zoom in fully, so only one tune per page is visible
	await page.getByRole('button', { name: 'Show controls' }).click();
	const zoomIn = page.getByRole('button', { name: 'Zoom in' });
	while (!(await zoomIn.isDisabled())) {
		await zoomIn.tap();
	}

	// Check we can see the first tune, but not the second
	await expect(page.getByText('Upton upon Severn Stick Dance', { exact: true })).toBeInViewport();
	await expect(page.getByText('Seven Stars', { exact: true })).not.toBeInViewport();

	// Repeat with the next set
	await page.getByText('Next set').click();
	await expect(page.getByText('The Cliffs Of Moher', { exact: true })).toBeInViewport();
	while (!(await zoomIn.isDisabled())) {
		await zoomIn.tap();
	}

	// Navigate to the second page of this set, check it actually did what we expected
	await page.getByRole('button', { name: 'Next page' }).click();
	await expect(page.getByText('The Cliffs Of Moher', { exact: true })).not.toBeInViewport();
	await expect(page.getByText('Spirit of the Dance', { exact: true })).toBeInViewport();

	// Verify that we can navigate back and forth between the two tunes with the arrow keys
	await page.keyboard.press('ArrowLeft');
	await expect(page.getByText('The Cliffs Of Moher', { exact: true })).toBeInViewport();
	await expect(page.getByText('Spirit of the Dance', { exact: true })).not.toBeInViewport();

	await page.keyboard.press('ArrowRight');
	await expect(page.getByText('The Cliffs Of Moher', { exact: true })).not.toBeInViewport();
	await expect(page.getByText('Spirit of the Dance', { exact: true })).toBeInViewport();

	// Check that pressing the right arrow key many times causes us to stay at the end of the set
	await page.keyboard.press('ArrowRight');
	await page.keyboard.press('ArrowRight');
	await page.keyboard.press('ArrowRight');
	await page.keyboard.press('ArrowRight');
	await expect(page.getByText('The Kesh', { exact: true })).toBeInViewport();

	await page.keyboard.press('ArrowLeft');
	await expect(page.getByText('The Kesh', { exact: true })).not.toBeInViewport();

	// Navigate back to the previous set, check that we're sent to the start of said set
	await page.getByRole('link', { name: 'Previous set' }).click();
	await expect(page.getByText('Upton upon Severn Stick Dance', { exact: true })).toBeInViewport();
	await expect(page.getByText('Seven Stars', { exact: true })).not.toBeInViewport();
});

test('autozoom zooms tunes when showing and hiding controls via tapping', async ({ page }) => {
	await page.goto('/Jigs-1-Severn-Stars');
	await expect(page.getByText('Upton upon Severn Stick Dance', { exact: true })).toBeInViewport();
	await expect(page.getByText('Seven Stars', { exact: true })).toBeInViewport();

	await page.getByRole('button', { name: 'Show controls' }).tap();
	await expect(page.getByText('Upton upon Severn Stick Dance', { exact: true })).toBeInViewport();
	await expect(page.getByText('Seven Stars', { exact: true })).toBeInViewport();

	await page.getByRole('button', { name: 'Hide controls' }).tap();
	await expect(page.getByText('Upton upon Severn Stick Dance', { exact: true })).toBeVisible();
	await expect(page.getByText('Seven Stars', { exact: true })).toBeInViewport();
});

test('tunes continue to show when zoomed out', async ({ page }) => {
	const tune = page.getByText("Paddy's Trip To Scotland", { exact: true });
	await page.goto('/Reels-1-Some-reels');
	await expect(tune).toBeInViewport();

	await page.getByRole('button', { name: 'Show controls' }).tap();
	await expect(tune).toBeInViewport();

	const button = page.getByRole('button', { name: 'Zoom out' });
	while (!(await button.isDisabled())) {
		await button.tap();
		await expect(tune).toBeInViewport();
	}
});

test('autozoom zooms tunes sensibly after the second tune is transposed', async ({ page }) => {
	await page.goto('/Jigs-1-Severn-Stars');
	await expect(page.getByText('Upton upon Severn Stick Dance', { exact: true })).toBeInViewport();
	await expect(page.getByText('Seven Stars', { exact: true })).toBeInViewport();

	await page.getByRole('button', { name: 'Show controls' }).tap();
	await expect(page.getByText('Upton upon Severn Stick Dance', { exact: true })).toBeInViewport();

	const transpositionSubtitle = page.getByText('Transposed +3', { exact: true });
	await expect(transpositionSubtitle).not.toBeInViewport();
	await page.getByLabel('Transpose abc-seven-stars').selectOption('F (+3)');
	await expect(page.getByText('Seven Stars', { exact: true })).toBeInViewport();
	await expect(transpositionSubtitle).toBeInViewport();

	await page.getByRole('button', { name: 'Hide controls' }).tap();
	await expect(page.getByText('Upton upon Severn Stick Dance', { exact: true })).toBeVisible();
	await expect(page.getByText('Seven Stars', { exact: true })).toBeInViewport();
});

test('transposition summary recognises Bb/Eb', async ({ page }) => {
	await page.goto('/Jigs-1-Severn-Stars');
	await expect(page.getByText('Upton upon Severn Stick Dance', { exact: true })).toBeInViewport();
	await expect(page.getByText('Seven Stars', { exact: true })).toBeInViewport();
	await page.getByRole('button', { name: 'Show controls' }).tap();

	let transpositionSubtitle = page.getByText('Transposed +2 (for B♭ instruments)', { exact: true });
	await expect(transpositionSubtitle).not.toBeInViewport();
	await page.getByLabel('Transpose abc-seven-stars').selectOption('E (+2)');
	await expect(transpositionSubtitle).toBeVisible();

	transpositionSubtitle = page.getByText('Transposed -10 (for B♭ instruments)', { exact: true });
	await page.getByLabel('Transpose abc-seven-stars').selectOption('E (-10)');
	await expect(transpositionSubtitle).toBeVisible();

	transpositionSubtitle = page.getByText('Transposed -3 (for E♭ instruments)', { exact: true });
	await page.getByLabel('Transpose abc-seven-stars').selectOption('B (-3)');
	await expect(transpositionSubtitle).toBeVisible();

	await page.goto('/');
	// Make sure the button press actually registers and the value is persisted
	// before we navigate

	await expect
		.poll(async () => {
			await page.getByRole('button', { name: 'Make the folder B♭' }).click();
			return await page.evaluate(() => window.localStorage.getItem('globalTransposition'));
		})
		.toBe('2');

	await page.goto('/Jigs-1-Severn-Stars');
	await expect(page.getByText('Upton upon Severn Stick Dance', { exact: true })).toBeInViewport();
	await expect(page.getByText('Seven Stars', { exact: true })).toBeInViewport();
	await expect(page.getByText('Transposed -3')).toBeVisible();
	await expect(page.getByText('(for E♭ instruments)')).not.toBeVisible();
});

test('transposition selection quotes correct keys when globally transposed', async ({ page }) => {
	await page.goto('/Jigs-1-Severn-Stars');
	await expect(page.getByText('Upton upon Severn Stick Dance', { exact: true })).toBeInViewport();
	await expect(page.getByText('Seven Stars', { exact: true })).toBeInViewport();
	await page.getByRole('button', { name: 'Show controls' }).tap();

	await expect(page.getByLabel('Transpose abc-seven-stars')).toContainText('E (+2)');

	await page.goto('/');
	// Make sure the button press actually registers and the value is persisted
	// before we navigate
	await expect
		.poll(async () => {
			await page.getByRole('button', { name: 'Make the folder B♭' }).click();
			return await page.evaluate(() => window.localStorage.getItem('globalTransposition'));
		})
		.toBe('2');

	await page.goto('/Jigs-1-Severn-Stars');
	await page.getByRole('button', { name: 'Show controls' }).tap();
	// In the original implementation, the transposition selection would show 'E
	// (+2)' here since the labels ignored the global transpotition. This meant
	// the labels didn't match the actual key shown in the ABC.
	await expect(page.getByLabel('Transpose abc-seven-stars')).toContainText('F♯ (+2)');
});

test('manually zoomed tunes reflow to fit page when controls are hidden', async ({ page }) => {
	page.setViewportSize({ width: 1600, height: 1150 });
	const firstTune = page.getByText('The Old Morpeth Rant', { exact: true });
	const secondTune = page.getByText('The Silver Spear', { exact: true });
	await page.goto('/Reels-1-Some-reels');
	await expect(secondTune).toBeInViewport();
	await expect(firstTune).toBeInViewport();

	await page.getByRole('button', { name: 'Show controls' }).tap();
	await page.getByRole('button', { name: 'Hide notes' }).tap();
	await expect(secondTune).toBeInViewport();
	await expect(firstTune).toBeInViewport();
	const button = page.getByRole('button', { name: 'Zoom in' });
	while (!(await button.isDisabled()) && (await secondTune.isVisible())) {
		await button.tap();
	}

	await expect(secondTune).not.toBeInViewport();
	await expect(firstTune).toBeInViewport();
	await page.getByRole('button', { name: 'Hide controls' }).tap();
	await expect(secondTune).toBeInViewport();
	await expect(firstTune).toBeInViewport();
});

test('page controls work with controls shown and autozoom enabled', async ({ page }) => {
	page.setViewportSize({ width: 1504, height: 840 });
	await page.goto('/Jigs-2-Lots-of-jigs');
	await expect(page.getByText('The Kesh', { exact: true })).toBeInViewport();

	await page.getByRole('button', { name: 'Show controls' }).tap();
	await expect(page.getByText('The Kesh', { exact: true })).not.toBeInViewport();
	await expect(page.getByText('The Cliffs Of Moher', { exact: true })).toBeInViewport();

	await page.getByRole('button', { name: 'Next page' }).tap();
	await expect(page.getByText('The Kesh', { exact: true })).toBeInViewport();
	await expect(page.getByText('The Cliffs Of Moher', { exact: true })).not.toBeInViewport();

	await page.getByRole('button', { name: 'Hide controls' }).tap();
	await expect(page.getByText('The Kesh', { exact: true })).toBeInViewport();
	await expect(page.getByText('The Cliffs Of Moher', { exact: true })).toBeInViewport();
	await expect(page.getByRole('button', { name: 'Previous page' })).not.toBeInViewport();
});

test('set and tune notes can be hidden', async ({ page }) => {
	await page.goto('/Jigs-2-Lots-of-jigs');
	await expect(page.getByText('Extra notes', { exact: true })).toBeVisible();
	await expect(
		page.getByText('Extra notes for a set can be placed directly inside <ViewSet>')
	).toBeVisible();
	await expect(page.getByText(`Here's a note in a tune's ABC N: field`)).toBeVisible();

	await page.getByRole('button', { name: 'Show controls' }).click();
	await page.getByRole('button', { name: 'Hide notes' }).click();

	await expect(page.getByText('Extra notes', { exact: true })).not.toBeVisible();
	await expect(
		page.getByText('Extra notes for a set can be placed directly inside <ViewSet>')
	).not.toBeVisible();
	await expect(page.getByText(`Here's a note in a tune's ABC N: field`)).not.toBeVisible();
});

test('first page remains unchanged upon return', async ({ page }) => {
	const secondTune = page.getByText('The Silver Spear', { exact: true });
	const thirdTune = page.getByText("Paddy's Trip To Scotland", { exact: true });
	await page.goto('/Reels-1-Some-reels');
	await expect(thirdTune).toBeInViewport();

	await page.getByRole('button', { name: 'Show controls' }).tap();
	const zoomIn = page.getByRole('button', { name: 'Zoom in' });
	// Zoom in until the third tune disappears
	while (!(await zoomIn.isDisabled()) && (await thirdTune.isVisible())) {
		await zoomIn.tap();
	}

	await expect(thirdTune).not.toBeInViewport();
	await expect(secondTune).toBeInViewport();

	await page.getByRole('button', { name: 'Next page' }).click();

	await expect(thirdTune).toBeInViewport();
	await expect(secondTune).not.toBeInViewport();

	await page.getByRole('button', { name: 'Previous page' }).click();

	await expect(thirdTune).not.toBeInViewport();
	await expect(secondTune).toBeInViewport();
});

test('tune abc can be copied', async ({ page, context }) => {
	await page.goto('/Jigs-1-Severn-Stars');
	const tuneTitle = 'Upton upon Severn Stick Dance';
	const tune = page.getByText(tuneTitle, { exact: true });

	await context.grantPermissions(['clipboard-read', 'clipboard-write']);
	await expect(tune).toBeInViewport();

	await page.getByRole('button', { name: 'Show controls' }).click();
	await page.locator('#copy-abc-upton-upon-severn').click();

	const clipboardContent = await page.evaluate(() => navigator.clipboard.readText());
	expect(clipboardContent).toContain('X:');
	expect(clipboardContent).toContain(tuneTitle);
});

test('scrolls through all pages of a set', async ({ page }) => {
	await page.goto('/Jigs-2-Lots-of-jigs');
	await expect(page.getByText('The Cliffs Of Moher', { exact: true })).toBeInViewport();
	await page.waitForTimeout(1000); // Wait for the tunes to render
	await page.getByRole('button', { name: 'Show controls' }).click();
	const secondTune = page.getByText('Spirit of the Dance', { exact: true });
	while (await secondTune.isVisible()) {
		await page.getByRole('button', { name: 'Zoom in' }).click();
	}
	await page.getByRole('button', { name: 'Hide controls' }).click();

	await page.getByRole('button', { name: 'Next page' }).click();
	await expect(page.getByText('Spirit of the Dance', { exact: true })).toBeInViewport();
	await expect(page.getByText('The Cliffs Of Moher', { exact: true })).not.toBeInViewport();

	await page.getByRole('button', { name: 'Next page' }).click();
	await expect(page.getByText('The Roman Wall', { exact: true })).toBeInViewport();
	await expect(page.getByText('Spirit of the Dance', { exact: true })).not.toBeInViewport();

	await page.getByRole('button', { name: 'Next page' }).click();
	await expect(page.getByText('The Kesh', { exact: true })).toBeInViewport();
	await expect(page.getByText('The Roman Wall', { exact: true })).not.toBeInViewport();

	await expect(page.getByRole('button', { name: 'Next page' })).not.toBeInViewport();

	await page.getByRole('button', { name: 'Previous page' }).click();
	await expect(page.getByText('The Roman Wall', { exact: true })).toBeInViewport();
	await expect(page.getByText('The Kesh', { exact: true })).not.toBeInViewport();

	await page.getByRole('button', { name: 'Previous page' }).click();
	await expect(page.getByText('Spirit of the Dance', { exact: true })).toBeInViewport();
	await expect(page.getByText('The Roman Wall', { exact: true })).not.toBeInViewport();

	await page.getByRole('button', { name: 'Previous page' }).click();
	await expect(page.getByText('The Cliffs Of Moher', { exact: true })).toBeInViewport();
	await expect(page.getByText('Spirit of the Dance', { exact: true })).not.toBeInViewport();

	await expect(page.getByRole('button', { name: 'Previous page' })).not.toBeInViewport();
});

describe('wakelock', () => {
	/**
	 * A helper function to set up a spy on the navigator.wakeLock.request method.
	 * It uses page.exposeFunction to create a communication bridge from the browser
	 * context (where the app runs) to the Node.js context (where the test runs).
	 *
	 * @param page The Playwright Page object.
	 * @returns A Promise that resolves with the type of wake lock requested (e.g., 'screen').
	 */
	const spyOnWakeLock = (page: Page): Promise<string> => {
		// Create a Promise that will resolve when our exposed function is called.
		// This is how we "wait" for the API call to happen in our test.
		const wakeLockRequestedPromise = new Promise<string>((resolve) => {
			// This function will be exposed to the browser's window object.
			// We can name it anything we want, e.g., 'onWakeLockRequest'.
			page.exposeFunction('onWakeLockRequest', (type: string) => {
				console.log(`Playwright test detected wake lock request of type: ${type}`);
				resolve(type);
			});
		});

		// This is the core of the solution. We run a script in the browser *before*
		// our app's code runs. This script replaces the original wake lock function
		// with our own version (a "spy").
		page
			.addInitScript(() => {
				// Ensure navigator.wakeLock exists before trying to patch it.
				if (navigator.wakeLock) {
					// Store the original function so we can still call it.
					const originalRequest = navigator.wakeLock.request.bind(navigator.wakeLock);

					// Override the original function.
					navigator.wakeLock.request = async (type: WakeLockType) => {
						console.log(`Wake lock request intercepted for type: ${type}`);

						// 1. Notify our test by calling the function we exposed.
						// The 'as any' is used to tell TypeScript that we know window.onWakeLockRequest exists.
						(window as any).onWakeLockRequest(type);

						// 2. Call the original function to ensure the app behaves as expected.
						// This is important so we don't break the actual functionality.
						return originalRequest(type);
					};
				}
			})
			.catch((err) => console.error('Error in addInitScript:', err));

		return wakeLockRequestedPromise;
	};

	test('view set requests wake lock', async ({ page }) => {
		const wakeLockRequested = spyOnWakeLock(page);
		await page.goto('/Jigs-1-Severn-Stars');
		const wakeLockType = await wakeLockRequested;
		expect(wakeLockType).toBe('screen');
	});
});

test('pages remain the same after navigating away and back', async ({ page }) => {
	await page.setViewportSize({ width: 495, height: 841 });
	await page.goto('/Jigs-2-Lots-of-jigs');
	await expect(page.getByText('The Cliffs Of Moher', { exact: true })).toBeInViewport();
	await page.getByRole('button', { name: 'Show controls' }).click();
	await expect(page.getByText('50%')).toBeVisible();
	for (let i = 0; i < 5; i++) {
		await page.getByRole('button', { name: 'Zoom in' }).click();
	}
	await expect(page.getByText('75%')).toBeVisible();

	await page.getByRole('button', { name: 'Hide controls' }).click();

	await expect(page.getByText('Spirit of the Dance', { exact: true })).toBeInViewport();

	await page.getByRole('button', { name: 'Next page' }).click();
	await expect(page.getByText('Spirit of the Dance', { exact: true })).not.toBeInViewport();
	await expect(page.getByText('The Roman Wall', { exact: true })).toBeInViewport();
	await expect(page.getByText('The Kesh', { exact: true })).toBeInViewport();

	await page.getByRole('button', { name: 'Previous page' }).click();
	await expect(page.getByText('The Cliffs Of Moher', { exact: true })).toBeInViewport();
	await expect(page.getByText('Spirit of the Dance', { exact: true })).toBeInViewport();
	await page.getByRole('button', { name: 'Next page' }).click();
	await expect(page.getByText('The Roman Wall', { exact: true })).toBeInViewport();
	await expect(page.getByText('The Kesh', { exact: true })).toBeInViewport();
	await page.getByRole('button', { name: 'Previous page' }).click();
	await expect(page.getByText('The Cliffs Of Moher', { exact: true })).toBeInViewport();
	await expect(page.getByText('Spirit of the Dance', { exact: true })).toBeInViewport();
});

describe('properties', () => {
	const TEST_TIMEOUT_MILLIS = 15_000;
	// Set the playwright test timeout larger than the fast-check timeout
	test.setTimeout(TEST_TIMEOUT_MILLIS * 3);
	const propPageWidth = fc.noShrink(fc.integer({ min: 360, max: 2000 }));
	const propPageHeight = fc.noShrink(fc.integer({ min: 800, max: 2000 }));
	test('fitToPage always shows all tunes', async ({ page }) => {
		await page.goto('/Jigs-2-Lots-of-jigs');
		await fc.assert(
			fc.asyncProperty(propPageWidth, propPageHeight, async (width, height) => {
				await page.setViewportSize({ width, height });
				await expect(page.getByText('The Cliffs Of Moher', { exact: true })).toBeInViewport();
				await expect(page.getByText('Spirit of the Dance', { exact: true })).toBeInViewport();
				await expect(page.getByText('The Roman Wall', { exact: true })).toBeInViewport();
				await expect(page.getByText('The Kesh', { exact: true })).toBeInViewport();
			}),
			{
				examples: [
					[1992, 809],
					[2000, 809]
				],
				timeout: TEST_TIMEOUT_MILLIS,
				interruptAfterTimeLimit: TEST_TIMEOUT_MILLIS
			}
		);
	});

	const tuneTitlesAndPositions =
		'[...document.querySelectorAll(".tune").values().map(t => [t.getBoundingClientRect(), t.querySelector("text[data-name=title]").textContent]).map(([rect, title]) => ({title, x: rect.x, y: rect.y, width: rect.width, height: rect.height}))]';

	const zoomThenFitToPage = (page: Page, direction: 'in' | 'out') =>
		fc.asyncProperty(propPageWidth, propPageHeight, async (width, height) => {
			await page.setViewportSize({ width, height });
			// Wait for the tunes to rerender at the new viewport size
			await page.waitForTimeout(1000);
			await expect(page.getByRole('img').first()).toBeInViewport();
			const positionsBefore = await page.evaluate(tuneTitlesAndPositions);
			await page.getByRole('button', { name: 'Show controls' }).click();
			const zoomButton = page.getByRole('button', { name: `Zoom ${direction}` });

			// Ensure the relevant button exists
			if (!(await zoomButton.isEnabled())) {
				await page.getByRole('button', { name: 'Hide controls' }).click();
				fc.pre(false);
			}

			while (await zoomButton.isEnabled()) {
				await zoomButton.click();
			}

			await page.getByRole('button', { name: 'Fit to page' }).click();
			await page.getByRole('button', { name: 'Hide controls' }).click();
			await expect(page.getByRole('img').first()).toBeInViewport();
			const positionsAfter = await page.evaluate(tuneTitlesAndPositions);
			await expect(positionsBefore).toEqual(positionsAfter);
		});

	test(`fitToPage shows the same view after zooming all the way in`, async ({ page }) => {
		await page.goto('/Jigs-2-Lots-of-jigs');
		await fc.assert(zoomThenFitToPage(page, 'in'), {
			examples: [[1993, 805]],
			timeout: TEST_TIMEOUT_MILLIS,
			interruptAfterTimeLimit: TEST_TIMEOUT_MILLIS
		});
	});

	test(`fitToPage shows the same view after zooming all the way out`, async ({ page }) => {
		await page.goto('/Jigs-2-Lots-of-jigs');
		await fc.assert(zoomThenFitToPage(page, 'out'), {
			examples: [[1993, 802]],
			timeout: TEST_TIMEOUT_MILLIS,
			interruptAfterTimeLimit: TEST_TIMEOUT_MILLIS
		});
	});

	test(`zooming in from fit to page always makes a tune invisible`, async ({ page }) => {
		await page.goto('/Jigs-2-Lots-of-jigs');
		await expect(page.getByText('The Cliffs Of Moher', { exact: true })).toBeInViewport();
		await fc.assert(
			fc.asyncProperty(propPageWidth, propPageHeight, async (width, height) => {
				await page.setViewportSize({ width, height });
				// Wait for the tunes to rerender at the new viewport size
				await page.waitForTimeout(1000);
				await expect(page.getByText('The Cliffs Of Moher', { exact: true })).toBeInViewport();

				const tuneWidth = 'document.querySelector(".tune").getBoundingClientRect().width';
				const originalWidth: number = await page.evaluate(tuneWidth);
				await page.getByRole('button', { name: 'Show controls' }).click();
				const zoomIn = page.getByRole('button', { name: `Zoom in` });

				if (await zoomIn.isEnabled()) {
					await zoomIn.click();

					await page.getByRole('button', { name: 'Hide controls' }).click();
					await expect(page.getByText('The Kesh', { exact: true })).not.toBeInViewport();
					await expect(await page.evaluate(tuneWidth)).toBeGreaterThan(originalWidth);
				} else {
					await page.getByRole('button', { name: 'Hide controls' }).click();
				}
			}),
			{
				timeout: TEST_TIMEOUT_MILLIS,
				interruptAfterTimeLimit: TEST_TIMEOUT_MILLIS,
				examples: [
					[363, 971],
					[387, 1377]
				]
			}
		);
	});

	test(`zooming in with notes hidden makes a tune invisible`, async ({ page }) => {
		await page.goto('/Jigs-2-Lots-of-jigs');
		await expect(page.getByText('The Cliffs Of Moher', { exact: true })).toBeInViewport();
		await fc.assert(
			fc.asyncProperty(propPageWidth, propPageHeight, async (width, height) => {
				await page.setViewportSize({ width, height });
				// Wait for the tunes to rerender at the new viewport size
				await page.waitForTimeout(1000);
				await expect(page.getByText('The Cliffs Of Moher', { exact: true })).toBeInViewport();

				const tuneWidth = 'document.querySelector(".tune").getBoundingClientRect().width';
				const originalWidth: number = await page.evaluate(tuneWidth);
				await page.getByRole('button', { name: 'Show controls' }).click();
				if (await page.getByRole('button', { name: 'Hide notes' }).isVisible()) {
					await page.getByRole('button', { name: 'Hide notes' }).click();
				}
				await expect(page.getByText('Extra notes', { exact: true })).not.toBeVisible();
				await page.getByRole('button', { name: 'Hide controls' }).click();
				await page.waitForTimeout(1000); // Wait for the tunes to rerender after hiding notes
				await page.getByRole('button', { name: 'Show controls' }).click();
				const zoomIn = page.getByRole('button', { name: `Zoom in` });

				if (await zoomIn.isEnabled()) {
					await zoomIn.click();

					await page.getByRole('button', { name: 'Hide controls' }).click();
					await expect(page.getByText('The Kesh', { exact: true })).not.toBeInViewport();
					await expect(await page.evaluate(tuneWidth)).toBeGreaterThan(originalWidth);
				} else {
					await page.getByRole('button', { name: 'Hide controls' }).click();
				}
			}),
			{
				timeout: TEST_TIMEOUT_MILLIS,
				interruptAfterTimeLimit: TEST_TIMEOUT_MILLIS,
				examples: [[363, 971]]
			}
		);
	});
});
