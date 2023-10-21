import { expect, test } from '@playwright/test';

test('index page has expected h1', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { name: 'Welcome to Choonbook' })).toBeVisible();
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
