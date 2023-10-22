import { expect, test } from '@playwright/test';

test('index page has expected h1', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { name: 'Welcome to Choonbook' })).toBeVisible();
});

test('index page can be filtered', async ({ page }) => {
	await page.goto('/');
	const errogie = page.getByText('The Road to Errogie', { exact: true });
	const tooManySocks = page.getByText('Too Many Socks', { exact: true });
	await expect(errogie).toBeVisible();
	await expect(tooManySocks).toBeVisible();
	await page.getByText('Contra Choonz').tap();
	await expect(errogie).not.toBeVisible();
	await expect(tooManySocks).toBeVisible();
});

test('autozoom zooms tunes when showing and hiding controls via clicking', async ({ page }) => {
	await page.goto('/Reels-1-Ranting-in-Munster');
	await expect(page.getByText('Islay Rant', { exact: true })).toBeInViewport();
	await expect(page.getByText('The Star Of Munster', { exact: true })).toBeInViewport();

	await page.getByRole('button', { name: 'Show controls' }).click();
	await expect(page.getByText('Islay Rant', { exact: true })).toBeInViewport();
	await expect(page.getByText('The Star Of Munster', { exact: true })).toBeInViewport();

	await page.getByRole('button', { name: 'Hide controls' }).click();
	await expect(page.getByText('Islay Rant', { exact: true })).toBeInViewport();
	await expect(page.getByText('The Star Of Munster', { exact: true })).toBeInViewport();
});

test('autozoom zooms tunes when showing and hiding controls via tapping', async ({ page }) => {
	await page.goto('/Reels-1-Ranting-in-Munster');
	await expect(page.getByText('Islay Rant', { exact: true })).toBeInViewport();
	await expect(page.getByText('The Star Of Munster', { exact: true })).toBeInViewport();

	await page.getByRole('button', { name: 'Show controls' }).tap();
	await expect(page.getByText('Islay Rant', { exact: true })).toBeInViewport();
	await expect(page.getByText('The Star Of Munster', { exact: true })).toBeInViewport();

	await page.getByRole('button', { name: 'Hide controls' }).tap();
	await expect(page.getByText('Islay Rant', { exact: true })).toBeVisible();
	await expect(page.getByText('The Star Of Munster', { exact: true })).toBeInViewport();
});

test('tunes continue to show when zoomed out', async ({ page }) => {
	await page.goto('/Reels-3-Road-to-from-Salvation');
	await expect(page.getByText('The Road to Errogie', { exact: true })).toBeInViewport();

	await page.getByRole('button', { name: 'Show controls' }).tap();
	await expect(page.getByText('The Road to Errogie', { exact: true })).toBeInViewport();

	const button = page.getByRole('button', { name: 'Zoom out' });
	while (!(await button.isDisabled())) {
		await button.tap();
		await expect(page.getByText('The Road to Errogie', { exact: true })).toBeInViewport();
	}
});

test('autozoom zooms tunes sensibly after the second tune is transposed', async ({ page }) => {
	await page.goto('/Reels-1-Ranting-in-Munster');
	await expect(page.getByText('Islay Rant', { exact: true })).toBeInViewport();
	await expect(page.getByText('The Star Of Munster', { exact: true })).toBeInViewport();

	await page.getByRole('button', { name: 'Show controls' }).tap();
	await expect(page.getByText('Islay Rant', { exact: true })).toBeInViewport();
	await page.getByLabel('Transpose contra-reel-star-of-munster').selectOption('BDor (+2)');
	await expect(page.getByText('The Star Of Munster', { exact: true })).toBeInViewport();

	await page.getByRole('button', { name: 'Hide controls' }).tap();
	await expect(page.getByText('Islay Rant', { exact: true })).toBeVisible();
	await expect(page.getByText('The Star Of Munster', { exact: true })).toBeInViewport();
});

test('manually zoomed tunes reflow to fit page when controls are hidden', async ({ page }) => {
	const salvation = page.getByText('The Salvation', { exact: true });
	const errogie = page.getByText('The Road to Errogie', { exact: true });
	await page.goto('/Reels-3-Road-to-from-Salvation');
	await expect(errogie).toBeInViewport();

	await page.getByRole('button', { name: 'Show controls' }).tap();
	await expect(errogie).toBeInViewport();
	const button = page.getByRole('button', { name: 'Zoom in' });
	while (!(await button.isDisabled()) && (await errogie.isVisible())) {
		await button.tap();
	}

	await expect(errogie).not.toBeInViewport();
	await page.getByRole('button', { name: 'Hide controls' }).tap();
	await expect(errogie).toBeInViewport();
});

test('first page remains unchanged upon return', async ({ page }) => {
	const secondTune = page.getByText('The Salvation', { exact: true });
	const thirdTune = page.getByText('The Road to Errogie', { exact: true });
	await page.goto('/Reels-3-Road-to-from-Salvation');
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
