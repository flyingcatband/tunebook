import { expect, test } from '@playwright/test';

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

	// Uncheck the checkbox
	await page.getByText('Reels', { exact: true }).tap();
	await expect(reel).not.toBeVisible();
	await expect(jig).toBeVisible();
});

test('index page remembers filters', async ({ page }) => {
	await page.goto('/');

	await page.getByText('Reels', { exact: true }).tap();
	const reel = page.getByText('The Old Morpeth Rant', { exact: true });
	const jig = page.getByText('Seven Stars', { exact: true });
	await expect(reel).not.toBeVisible();
	await expect(jig).toBeVisible();

	await page.goto('/');
	await expect(reel).not.toBeVisible();
	await expect(jig).toBeVisible();

	await page.getByText('Jigs', { exact: true }).tap();
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

	const transpositionSubtitle = page.getByText('Transposed +2', { exact: true });
	await expect(transpositionSubtitle).not.toBeInViewport();
	await page.getByLabel('Transpose abc-seven-stars').selectOption('E (+2)');
	await expect(page.getByText('Seven Stars', { exact: true })).toBeInViewport();
	await expect(transpositionSubtitle).toBeInViewport();

	await page.getByRole('button', { name: 'Hide controls' }).tap();
	await expect(page.getByText('Upton upon Severn Stick Dance', { exact: true })).toBeVisible();
	await expect(page.getByText('Seven Stars', { exact: true })).toBeInViewport();
});

test('manually zoomed tunes reflow to fit page when controls are hidden', async ({ page }) => {
	page.setViewportSize({ width: 1600, height: 1000 });
	const secondTune = page.getByText('The Silver Spear', { exact: true });
	const thirdTune = page.getByText("Paddy's Trip To Scotland", { exact: true });
	await page.goto('/Reels-1-Some-reels');
	await expect(secondTune).toBeInViewport();
	await expect(thirdTune).toBeInViewport();

	await page.getByRole('button', { name: 'Show controls' }).tap();
	await expect(secondTune).toBeInViewport();
	await expect(thirdTune).toBeInViewport();
	const button = page.getByRole('button', { name: 'Zoom in' });
	while (!(await button.isDisabled()) && (await thirdTune.isVisible())) {
		await button.tap();
	}

	await expect(thirdTune).not.toBeInViewport();
	await expect(secondTune).toBeInViewport();
	await page.getByRole('button', { name: 'Hide controls' }).tap();
	await expect(secondTune).toBeInViewport();
	await expect(thirdTune).toBeInViewport();
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
