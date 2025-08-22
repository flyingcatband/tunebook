import { expect, test } from '@playwright/test';

// To keep the console clean, throw an error to fail the test immediately if a console message occurs.
test.beforeEach(({ page }) => {
	page.on('console', (message) => {
		if (message.type() in ['warning', 'error']) {
			throw new Error(`Unexpected error in console: ${message.text()}`);
		}
	});
});

test.describe('Hidden Tunes Tests', () => {
	test('fit to page handles hidden tunes by making remaining tunes wider', async ({ page }) => {
		// Navigate to a set with multiple tunes
		await page.goto('/Jigs-2-Lots-of-jigs');
		await expect(page.getByText('The Cliffs Of Moher', { exact: true })).toBeInViewport();

		// Wait for tunes to render and get initial width of first tune
		await page.waitForTimeout(200);
		const firstTune = page.locator('.tune').first();
		const initialWidth = await firstTune.evaluate((el) => el.getBoundingClientRect().width);

		// Show controls and hide some tunes
		await page.getByRole('button', { name: 'Show controls' }).click();

		// Hide the second and third tunes
		const hideTuneButtons = page.getByRole('button', { name: 'Hide tune' });
		await hideTuneButtons.nth(1).click(); // Hide second tune
		await hideTuneButtons.nth(1).click(); // Hide third tune

		// Trigger fit to page by hiding and showing controls (which should re-trigger fit to page)
		await page.getByRole('button', { name: 'Hide controls' }).click();
		await page.waitForTimeout(500); // Wait for fit to page to recalculate

		// Check that remaining visible tunes are wider
		const newWidth = await firstTune.evaluate((el) => el.getBoundingClientRect().width);
		expect(newWidth).toBeGreaterThan(initialWidth);

		// Verify that hidden tunes are not visible when controls are hidden
		await expect(page.getByText('Spirit of the Dance', { exact: true })).not.toBeInViewport();
		await expect(page.getByText('The Roman Wall', { exact: true })).not.toBeInViewport();

		// But remaining tunes should still be visible
		await expect(page.getByText('The Cliffs Of Moher', { exact: true })).toBeInViewport();
		await expect(page.getByText('The Kesh', { exact: true })).toBeInViewport();
	});

	test('pagination handles hidden tunes correctly with one tune per page', async ({ page }) => {
		// Navigate to a set with multiple tunes
		await page.goto('/Jigs-2-Lots-of-jigs');
		await expect(page.getByText('The Cliffs Of Moher', { exact: true })).toBeInViewport();

		// Wait for tunes to render
		await page.waitForTimeout(200);

		// Show controls and hide middle tunes, keeping first and last
		await page.getByRole('button', { name: 'Show controls' }).click();

		// Hide second and third tunes (keeping first and fourth)
		const hideTuneButtons = page.getByRole('button', { name: 'Hide tune' });
		await hideTuneButtons.nth(1).click(); // Hide "Spirit of the Dance"
		await hideTuneButtons.nth(1).click(); // Hide "The Roman Wall"

		// Zoom in as far as possible to force single tune per page
		const zoomInButton = page.getByRole('button', { name: 'Zoom in' });
		while (!(await zoomInButton.isDisabled())) {
			await zoomInButton.click();
		}

		// Hide controls to enable pagination
		await page.getByRole('button', { name: 'Hide controls' }).click();
		await page.waitForTimeout(200);

		// First page should show only the first tune
		await expect(page.getByText('The Cliffs Of Moher', { exact: true })).toBeInViewport();
		await expect(page.getByText('Spirit of the Dance', { exact: true })).not.toBeInViewport();
		await expect(page.getByText('The Roman Wall', { exact: true })).not.toBeInViewport();
		await expect(page.getByText('The Kesh', { exact: true })).not.toBeInViewport();

		// Navigate to next page
		await expect(page.getByRole('button', { name: 'Next page' })).toBeVisible();
		await page.getByRole('button', { name: 'Next page' }).click();

		// Second page should show only the last tune (since middle ones are hidden)
		await expect(page.getByText('The Cliffs Of Moher', { exact: true })).not.toBeInViewport();
		await expect(page.getByText('Spirit of the Dance', { exact: true })).not.toBeInViewport();
		await expect(page.getByText('The Roman Wall', { exact: true })).not.toBeInViewport();
		await expect(page.getByText('The Kesh', { exact: true })).toBeInViewport();

		// Should not be able to navigate further (no more pages)
		await expect(page.getByRole('button', { name: 'Next page' })).not.toBeVisible();

		// Navigate back to previous page
		await expect(page.getByRole('button', { name: 'Previous page' })).toBeVisible();
		await page.getByRole('button', { name: 'Previous page' }).click();

		// Should be back to first page
		await expect(page.getByText('The Cliffs Of Moher', { exact: true })).toBeInViewport();
		await expect(page.getByText('The Kesh', { exact: true })).not.toBeInViewport();

		// Should not be able to go back further
		await expect(page.getByRole('button', { name: 'Previous page' })).not.toBeVisible();
	});

	test('no next page button when only first tune is visible', async ({ page }) => {
		// Navigate to a set with multiple tunes
		await page.goto('/Jigs-2-Lots-of-jigs');
		await expect(page.getByText('The Cliffs Of Moher', { exact: true })).toBeInViewport();

		// Wait for tunes to render
		await page.waitForTimeout(200);

		// Show controls and hide all tunes except the first
		await page.getByRole('button', { name: 'Show controls' }).click();

		// Hide all tunes except the first (hide tunes 2, 3, 4)
		const hideTuneButtons = page.getByRole('button', { name: 'Hide tune' });
		await hideTuneButtons.nth(1).click(); // Hide "Spirit of the Dance"
		await hideTuneButtons.nth(1).click(); // Hide "The Roman Wall"
		await hideTuneButtons.nth(1).click(); // Hide "The Kesh"

		// Zoom in as far as possible to force single tune per page
		const zoomInButton = page.getByRole('button', { name: 'Zoom in' });
		while (!(await zoomInButton.isDisabled())) {
			await zoomInButton.click();
		}

		// Hide controls to enable pagination
		await page.getByRole('button', { name: 'Hide controls' }).click();
		await page.waitForTimeout(200);

		// Only the first tune should be visible
		await expect(page.getByText('The Cliffs Of Moher', { exact: true })).toBeInViewport();
		await expect(page.getByText('Spirit of the Dance', { exact: true })).not.toBeInViewport();
		await expect(page.getByText('The Roman Wall', { exact: true })).not.toBeInViewport();
		await expect(page.getByText('The Kesh', { exact: true })).not.toBeInViewport();

		// There should be no Next page button since only one tune is visible
		await expect(page.getByRole('button', { name: 'Next page' })).not.toBeVisible();

		// There should also be no Previous page button since we're on the first (and only) page
		await expect(page.getByRole('button', { name: 'Previous page' })).not.toBeVisible();
	});
});
