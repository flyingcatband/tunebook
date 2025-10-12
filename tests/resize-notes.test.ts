import { expect, test } from '@playwright/test';

test.beforeEach(({ page }) => {
	page.on('console', (message) => {
		if (message.type() in ['warning', 'error']) {
			throw new Error(`Unexpected error in console: ${message.text()}`);
		}
	});
});

test.describe('Notes Panel Resize Tests', () => {
	test('resize handle appears when notes beside is active and controls are visible', async ({
		page
	}) => {
		await page.goto('/Jigs-1-Severn-Stars');
		await expect(page.getByText('Upton upon Severn Stick Dance', { exact: true })).toBeInViewport();

		await page.getByRole('button', { name: 'Show controls' }).click();

		const notesButton = page.getByRole('button', { name: /Notes (below|beside)/ });
		const buttonText = await notesButton.textContent();
		if (buttonText?.includes('beside')) {
			await notesButton.click();
		}

		await expect(page.locator('.resize-handle')).toBeVisible();
	});

	test('resize handle is hidden when controls are hidden', async ({ page }) => {
		await page.goto('/Jigs-1-Severn-Stars');
		await expect(page.getByText('Upton upon Severn Stick Dance', { exact: true })).toBeInViewport();

		await page.getByRole('button', { name: 'Show controls' }).click();
		const notesButton = page.getByRole('button', { name: /Notes (below|beside)/ });
		const buttonText = await notesButton.textContent();
		if (buttonText?.includes('beside')) {
			await notesButton.click();
		}

		await expect(page.locator('.resize-handle')).toBeVisible();

		await page.getByRole('button', { name: 'Hide controls' }).click();

		await expect(page.locator('.resize-handle')).not.toBeVisible();
	});

	test('resize handle is hidden when notes are not beside', async ({ page }) => {
		await page.goto('/Jigs-1-Severn-Stars');
		await expect(page.getByText('Upton upon Severn Stick Dance', { exact: true })).toBeInViewport();

		await page.getByRole('button', { name: 'Show controls' }).click();

		const notesButton = page.getByRole('button', { name: /Notes (below|beside)/ });
		const buttonText = await notesButton.textContent();
		if (buttonText?.includes('below')) {
			await notesButton.click();
		}

		await expect(page.locator('.resize-handle')).not.toBeVisible();
	});

	test('dragging resize handle changes notes panel width', async ({ page }) => {
		await page.goto('/Jigs-1-Severn-Stars');
		await expect(page.getByText('Upton upon Severn Stick Dance', { exact: true })).toBeInViewport();

		await page.getByRole('button', { name: 'Show controls' }).click();
		const notesButton = page.getByRole('button', { name: /Notes (below|beside)/ });
		const buttonText = await notesButton.textContent();
		if (buttonText?.includes('beside')) {
			await notesButton.click();
		}

		const handle = page.locator('.resize-handle');
		await expect(handle).toBeVisible();

		const pageContainer = page.locator('.page-container.notes-beside');
		const initialStyle = await pageContainer.getAttribute('style');
		const initialWidth = initialStyle?.match(/--stored-notes-width:\s*([\d.]+)dvw/)?.[1];

		const box = await handle.boundingBox();
		if (box) {
			await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
			await page.mouse.down();
			await page.mouse.move(box.x + 100, box.y + box.height / 2);
			await page.mouse.up();
		}

		const newStyle = await pageContainer.getAttribute('style');
		const newWidth = newStyle?.match(/--stored-notes-width:\s*([\d.]+)dvw/)?.[1];

		expect(initialWidth).toBeDefined();
		expect(newWidth).toBeDefined();
		expect(Number(newWidth)).toBeGreaterThan(Number(initialWidth));
	});

	test('dragging resize handle is constrained to min and max values', async ({ page }) => {
		await page.goto('/Jigs-1-Severn-Stars');
		await expect(page.getByText('Upton upon Severn Stick Dance', { exact: true })).toBeInViewport();

		await page.getByRole('button', { name: 'Show controls' }).click();
		const notesButton = page.getByRole('button', { name: /Notes (below|beside)/ });
		const buttonText = await notesButton.textContent();
		if (buttonText?.includes('beside')) {
			await notesButton.click();
		}

		const handle = page.locator('.resize-handle');
		await expect(handle).toBeVisible();
		const pageContainer = page.locator('.page-container.notes-beside');

		const box = await handle.boundingBox();
		if (box) {
			await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
			await page.mouse.down();
			await page.mouse.move(box.x - 1000, box.y + box.height / 2);
			await page.mouse.up();
		}

		const minStyle = await pageContainer.getAttribute('style');
		const minWidth = Number(minStyle?.match(/--stored-notes-width:\s*([\d.]+)dvw/)?.[1]);
		expect(minWidth).toBeGreaterThanOrEqual(15);

		if (box) {
			await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
			await page.mouse.down();
			await page.mouse.move(box.x + 2000, box.y + box.height / 2);
			await page.mouse.up();
		}

		const maxStyle = await pageContainer.getAttribute('style');
		const maxWidth = Number(maxStyle?.match(/--stored-notes-width:\s*([\d.]+)dvw/)?.[1]);
		expect(maxWidth).toBeLessThanOrEqual(60);
	});

	test('double clicking resize handle resets width to default and shows toast', async ({
		page
	}) => {
		await page.goto('/Jigs-1-Severn-Stars');
		await expect(page.getByText('Upton upon Severn Stick Dance', { exact: true })).toBeInViewport();

		await page.getByRole('button', { name: 'Show controls' }).click();
		const notesButton = page.getByRole('button', { name: /Notes (below|beside)/ });
		const buttonText = await notesButton.textContent();
		if (buttonText?.includes('beside')) {
			await notesButton.click();
		}

		const handle = page.locator('.resize-handle');
		await expect(handle).toBeVisible();

		const box = await handle.boundingBox();
		if (box) {
			await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
			await page.mouse.down();
			await page.mouse.move(box.x + 100, box.y + box.height / 2);
			await page.mouse.up();
		}

		await handle.dblclick();

		await expect(page.locator('.toast')).toBeVisible();
		await expect(page.locator('.toast')).toContainText('Notes width reset to default');

		const pageContainer = page.locator('.page-container.notes-beside');
		const resetStyle = await pageContainer.getAttribute('style');
		const resetWidth = Number(resetStyle?.match(/--stored-notes-width:\s*([\d.]+)dvw/)?.[1]);
		expect(resetWidth).toBe(33);

		await page.waitForTimeout(2500);
		await expect(page.locator('.toast')).not.toBeVisible();
	});

	test('resize handle works with touch events', async ({ page }) => {
		await page.goto('/Jigs-1-Severn-Stars');
		await expect(page.getByText('Upton upon Severn Stick Dance', { exact: true })).toBeInViewport();

		await page.getByRole('button', { name: 'Show controls' }).click();
		const notesButton = page.getByRole('button', { name: /Notes (below|beside)/ });
		const buttonText = await notesButton.textContent();
		if (buttonText?.includes('beside')) {
			await notesButton.click();
		}

		const handle = page.locator('.resize-handle');
		await expect(handle).toBeVisible();
		const pageContainer = page.locator('.page-container.notes-beside');

		const initialStyle = await pageContainer.getAttribute('style');
		const initialWidth = initialStyle?.match(/--stored-notes-width:\s*([\d.]+)dvw/)?.[1];

		await page.evaluate(() => {
			const handle = document.querySelector('.resize-handle');
			if (!handle) throw new Error('Could not find resize handle');

			const box = handle.getBoundingClientRect();
			const startX = box.x + box.width / 2;
			const startY = box.y + box.height / 2;

			const startTouch = new Touch({
				identifier: 0,
				target: handle,
				clientX: startX,
				clientY: startY,
				pageX: startX,
				pageY: startY,
				screenX: startX,
				screenY: startY,
				radiusX: 10,
				radiusY: 10,
				rotationAngle: 0,
				force: 1
			});

			const startEvent = new TouchEvent('touchstart', {
				touches: [startTouch],
				changedTouches: [startTouch],
				targetTouches: [startTouch],
				bubbles: true,
				cancelable: true
			});
			handle.dispatchEvent(startEvent);

			const moveTouch = new Touch({
				identifier: 0,
				target: handle,
				clientX: startX + 100,
				clientY: startY,
				pageX: startX + 100,
				pageY: startY,
				screenX: startX + 100,
				screenY: startY,
				radiusX: 10,
				radiusY: 10,
				rotationAngle: 0,
				force: 1
			});

			const moveEvent = new TouchEvent('touchmove', {
				touches: [moveTouch],
				changedTouches: [moveTouch],
				targetTouches: [moveTouch],
				bubbles: true,
				cancelable: true
			});
			window.dispatchEvent(moveEvent);

			const endEvent = new TouchEvent('touchend', {
				touches: [],
				changedTouches: [moveTouch],
				targetTouches: [],
				bubbles: true,
				cancelable: true
			});
			window.dispatchEvent(endEvent);
		});

		const newStyle = await pageContainer.getAttribute('style');
		const newWidth = newStyle?.match(/--stored-notes-width:\s*([\d.]+)dvw/)?.[1];

		expect(initialWidth).toBeDefined();
		expect(newWidth).toBeDefined();
		expect(Number(newWidth)).toBeGreaterThan(Number(initialWidth));
	});

	test('notes width persists in localStorage', async ({ page }) => {
		await page.goto('/Jigs-1-Severn-Stars');
		await expect(page.getByText('Upton upon Severn Stick Dance', { exact: true })).toBeInViewport();

		await page.getByRole('button', { name: 'Show controls' }).click();
		const notesButton = page.getByRole('button', { name: /Notes (below|beside)/ });
		const buttonText = await notesButton.textContent();
		if (buttonText?.includes('beside')) {
			await notesButton.click();
		}

		const handle = page.locator('.resize-handle');
		await expect(handle).toBeVisible();

		const box = await handle.boundingBox();
		if (box) {
			await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
			await page.mouse.down();
			await page.mouse.move(box.x + 100, box.y + box.height / 2);
			await page.mouse.up();
		}

		const pageContainer = page.locator('.page-container.notes-beside');
		const style = await pageContainer.getAttribute('style');
		const width = style?.match(/--stored-notes-width:\s*([\d.]+)dvw/)?.[1];

		await page.reload();
		await expect(page.getByText('Upton upon Severn Stick Dance', { exact: true })).toBeInViewport();

		await page.getByRole('button', { name: 'Show controls' }).click();
		const notesButton2 = page.getByRole('button', { name: /Notes (below|beside)/ });
		const buttonText2 = await notesButton2.textContent();
		if (buttonText2?.includes('beside')) {
			await notesButton2.click();
		}

		const newStyle = await pageContainer.getAttribute('style');
		const newWidth = newStyle?.match(/--stored-notes-width:\s*([\d.]+)dvw/)?.[1];

		expect(newWidth).toBe(width);
	});
});
