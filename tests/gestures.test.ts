import { expect, test, type Page } from '@playwright/test';

// To keep the console clean, throw an error to fail the test immediately if a console message occurs.
test.beforeEach(({ page }) => {
	page.on('console', (message) => {
		if (message.type() in ['warning', 'error']) {
			throw new Error(`Unexpected error in console: ${message.text()}`);
		}
	});
});

/**
 * Helper function to simulate pinch gesture
 */
async function simulatePinch(
	page: Page,
	startDistance: number,
	endDistance: number,
	centerX: number = 400,
	centerY: number = 300
) {
	await page.evaluate(
		({ startDistance, endDistance, centerX, centerY }) => {
			const element = document.querySelector('.tunes');
			if (!element) throw new Error('Could not find .tunes element');

			const startOffset = startDistance / 2;
			const endOffset = endDistance / 2;

			// Start touches
			const startTouch1 = new Touch({
				identifier: 0,
				target: element,
				clientX: centerX - startOffset,
				clientY: centerY,
				pageX: centerX - startOffset,
				pageY: centerY,
				screenX: centerX - startOffset,
				screenY: centerY,
				radiusX: 10,
				radiusY: 10,
				rotationAngle: 0,
				force: 1
			});

			const startTouch2 = new Touch({
				identifier: 1,
				target: element,
				clientX: centerX + startOffset,
				clientY: centerY,
				pageX: centerX + startOffset,
				pageY: centerY,
				screenX: centerX + startOffset,
				screenY: centerY,
				radiusX: 10,
				radiusY: 10,
				rotationAngle: 0,
				force: 1
			});

			// Touch start
			const startEvent = new TouchEvent('touchstart', {
				touches: [startTouch1, startTouch2],
				changedTouches: [startTouch1, startTouch2],
				targetTouches: [startTouch1, startTouch2],
				bubbles: true,
				cancelable: true
			});
			element.dispatchEvent(startEvent);

			// Move touches - simulate pinch beyond dead zone (20px)
			const moveTouch1 = new Touch({
				identifier: 0,
				target: element,
				clientX: centerX - endOffset,
				clientY: centerY,
				pageX: centerX - endOffset,
				pageY: centerY,
				screenX: centerX - endOffset,
				screenY: centerY,
				radiusX: 10,
				radiusY: 10,
				rotationAngle: 0,
				force: 1
			});

			const moveTouch2 = new Touch({
				identifier: 1,
				target: element,
				clientX: centerX + endOffset,
				clientY: centerY,
				pageX: centerX + endOffset,
				pageY: centerY,
				screenX: centerX + endOffset,
				screenY: centerY,
				radiusX: 10,
				radiusY: 10,
				rotationAngle: 0,
				force: 1
			});

			// Touch move
			const moveEvent = new TouchEvent('touchmove', {
				touches: [moveTouch1, moveTouch2],
				changedTouches: [moveTouch1, moveTouch2],
				targetTouches: [moveTouch1, moveTouch2],
				bubbles: true,
				cancelable: true
			});
			element.dispatchEvent(moveEvent);

			// Touch end
			const endEvent = new TouchEvent('touchend', {
				touches: [],
				changedTouches: [moveTouch1, moveTouch2],
				targetTouches: [],
				bubbles: true,
				cancelable: true
			});
			element.dispatchEvent(endEvent);
		},
		{ startDistance, endDistance, centerX, centerY }
	);
}

/**
 * Helper function to simulate swipe gesture
 */
async function simulateSwipe(
	page: Page,
	startX: number,
	startY: number,
	endX: number,
	endY: number
) {
	await page.evaluate(
		({ startX, startY, endX, endY }) => {
			const element = document.querySelector('.tunes');
			if (!element) throw new Error('Could not find .tunes element');

			// Create touch start
			const startTouch = new Touch({
				identifier: 0,
				target: element,
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
			element.dispatchEvent(startEvent);

			// Create touch move
			const moveTouch = new Touch({
				identifier: 0,
				target: element,
				clientX: endX,
				clientY: endY,
				pageX: endX,
				pageY: endY,
				screenX: endX,
				screenY: endY,
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
			element.dispatchEvent(moveEvent);

			// Create touch end
			const endEvent = new TouchEvent('touchend', {
				touches: [],
				changedTouches: [moveTouch],
				targetTouches: [],
				bubbles: true,
				cancelable: true
			});
			element.dispatchEvent(endEvent);
		},
		{ startX, startY, endX, endY }
	);
}

/**
 * Helper function to simulate double tap
 */
async function simulateDoubleTap(page: Page, touches: Array<{ x: number; y: number }>) {
	await page.evaluate(
		({ touches }) => {
			const element = document.querySelector('.tunes');
			if (!element) throw new Error('Could not find .tunes element');

			const performTap = () => {
				const touchObjects = touches.map(
					(touch, index) =>
						new Touch({
							identifier: index,
							target: element,
							clientX: touch.x,
							clientY: touch.y,
							pageX: touch.x,
							pageY: touch.y,
							screenX: touch.x,
							screenY: touch.y,
							radiusX: 10,
							radiusY: 10,
							rotationAngle: 0,
							force: 1
						})
				);

				// Touch start
				const startEvent = new TouchEvent('touchstart', {
					touches: touchObjects,
					changedTouches: touchObjects,
					targetTouches: touchObjects,
					bubbles: true,
					cancelable: true
				});
				element.dispatchEvent(startEvent);

				// Touch end immediately
				const endEvent = new TouchEvent('touchend', {
					touches: [],
					changedTouches: touchObjects,
					targetTouches: [],
					bubbles: true,
					cancelable: true
				});
				element.dispatchEvent(endEvent);
			};

			// First tap
			performTap();

			// Wait and second tap
			setTimeout(performTap, 100);
		},
		{ touches }
	);

	// Wait for the second tap to complete
	await page.waitForTimeout(200);
}

test.describe('Gesture Tests', () => {
	test('two-finger double tap enables fit to page and shows toast', async ({ page }) => {
		await page.goto('/Jigs-1-Severn-Stars');
		await expect(page.getByText('Upton upon Severn Stick Dance', { exact: true })).toBeInViewport();

		// First, disable fit to page mode by enabling manual zoom
		await page.getByRole('button', { name: 'Show controls' }).click();
		await page.getByRole('button', { name: 'Zoom in' }).click();
		await page.getByRole('button', { name: 'Hide controls' }).click();

		// Verify we're in manual mode by checking if "Fit to page" button is visible when controls are shown
		await page.getByRole('button', { name: 'Show controls' }).click();
		await expect(page.getByRole('button', { name: 'Fit to page' })).toBeVisible();
		await page.getByRole('button', { name: 'Hide controls' }).click();

		// Perform two-finger double tap
		await simulateDoubleTap(page, [
			{ x: 300, y: 300 },
			{ x: 350, y: 300 }
		]);

		// Check that toast appears
		await expect(page.locator('.toast')).toBeVisible();
		await expect(page.locator('.toast')).toContainText('Fit to page enabled');

		// Verify fit to page is enabled by checking that "Fit to page" button is not visible
		await page.getByRole('button', { name: 'Show controls' }).click();
		await expect(page.getByRole('button', { name: 'Fit to page' })).not.toBeVisible();
		await page.getByRole('button', { name: 'Hide controls' }).click();

		// Toast should disappear after timeout
		await page.waitForTimeout(2500);
		await expect(page.locator('.toast')).not.toBeVisible();
	});

	test('pinch gesture switches to manual zoom and shows toast only when switching from fit to page', async ({
		page
	}) => {
		await page.goto('/Jigs-1-Severn-Stars');
		await expect(page.getByText('Upton upon Severn Stick Dance', { exact: true })).toBeInViewport();

		// Ensure we start in fit to page mode
		await page.getByRole('button', { name: 'Show controls' }).click();
		if (await page.getByRole('button', { name: 'Fit to page' }).isVisible()) {
			await page.getByRole('button', { name: 'Fit to page' }).click();
		}
		await page.getByRole('button', { name: 'Hide controls' }).click();

		// Simulate pinch to zoom (zoom in)
		await simulatePinch(page, 100, 150);

		// Check that toast appears for switching from fit to page to manual
		await expect(page.locator('.toast')).toBeVisible();
		await expect(page.locator('.toast')).toContainText('Manual zoom enabled');

		// Wait for toast to disappear
		await page.waitForTimeout(2500);
		await expect(page.locator('.toast')).not.toBeVisible();

		// Simulate another pinch gesture while already in manual mode
		await simulatePinch(page, 150, 200);

		// Toast should NOT appear this time since we're already in manual mode
		await expect(page.locator('.toast')).not.toBeVisible();
	});

	test('left swipe navigates to next page', async ({ page }) => {
		await page.goto('/Jigs-2-Lots-of-jigs');
		await expect(page.getByText('The Cliffs Of Moher', { exact: true })).toBeInViewport();

		// Zoom in to create multiple pages
		await page.getByRole('button', { name: 'Show controls' }).click();
		const zoomIn = page.getByRole('button', { name: 'Zoom in' });
		while (
			!(await zoomIn.isDisabled()) &&
			(await page.getByText('The Kesh', { exact: true }).isVisible())
		) {
			await zoomIn.click();
		}
		await page.getByRole('button', { name: 'Hide controls' }).click();

		// Verify we're on the first page
		await expect(page.getByText('The Cliffs Of Moher', { exact: true })).toBeInViewport();
		await expect(page.getByText('The Kesh', { exact: true })).not.toBeInViewport();

		// Perform left swipe (should go to next page)
		await simulateSwipe(page, 600, 300, 200, 300);

		// Verify we moved to the next page
		await expect(page.getByText('The Cliffs Of Moher', { exact: true })).not.toBeInViewport();
		// Should show a different tune now
	});

	test('right swipe navigates to previous page', async ({ page }) => {
		await page.goto('/Jigs-2-Lots-of-jigs');
		await expect(page.getByText('The Cliffs Of Moher', { exact: true })).toBeInViewport();

		// Zoom in to create multiple pages
		await page.getByRole('button', { name: 'Show controls' }).click();
		const zoomIn = page.getByRole('button', { name: 'Zoom in' });
		while (
			!(await zoomIn.isDisabled()) &&
			(await page.getByText('The Kesh', { exact: true }).isVisible())
		) {
			await zoomIn.click();
		}
		await page.getByRole('button', { name: 'Hide controls' }).click();

		// Navigate to a later page first using the Next page button
		await page.getByRole('button', { name: 'Next page' }).click();

		// Verify we're not on the first page
		await expect(page.getByText('The Cliffs Of Moher', { exact: true })).not.toBeInViewport();

		// Perform right swipe (should go to previous page)
		await simulateSwipe(page, 200, 300, 600, 300);

		// Verify we moved back to the previous page
		await expect(page.getByText('The Cliffs Of Moher', { exact: true })).toBeInViewport();
	});

	test('swipe gesture requires sufficient distance and horizontal dominance', async ({ page }) => {
		await page.goto('/Jigs-2-Lots-of-jigs');
		await expect(page.getByText('The Cliffs Of Moher', { exact: true })).toBeInViewport();

		// Zoom in to create multiple pages
		await page.getByRole('button', { name: 'Show controls' }).click();
		const zoomIn = page.getByRole('button', { name: 'Zoom in' });
		while (
			!(await zoomIn.isDisabled()) &&
			(await page.getByText('The Kesh', { exact: true }).isVisible())
		) {
			await zoomIn.click();
		}
		await page.getByRole('button', { name: 'Hide controls' }).click();

		// Test short swipe (should not navigate)
		await simulateSwipe(page, 400, 300, 430, 300); // Only 30px
		await expect(page.getByText('The Cliffs Of Moher', { exact: true })).toBeInViewport();

		// Test mostly vertical swipe (should not navigate)
		await simulateSwipe(page, 400, 200, 430, 400); // More vertical than horizontal
		await expect(page.getByText('The Cliffs Of Moher', { exact: true })).toBeInViewport();

		// Test proper horizontal swipe (should navigate)
		await simulateSwipe(page, 600, 300, 200, 320); // Long horizontal with small vertical
		await expect(page.getByText('The Cliffs Of Moher', { exact: true })).not.toBeInViewport();
	});

	test('gestures work correctly when controls are hidden', async ({ page }) => {
		await page.goto('/Jigs-1-Severn-Stars');
		await expect(page.getByText('Upton upon Severn Stick Dance', { exact: true })).toBeInViewport();

		// Ensure controls are hidden - check if hide button exists first
		const hideButton = page.getByRole('button', { name: 'Hide controls' });
		if (await hideButton.isVisible()) {
			await hideButton.click();
		}

		// Two-finger double tap should still work
		await simulateDoubleTap(page, [
			{ x: 300, y: 300 },
			{ x: 350, y: 300 }
		]);

		// Check that toast appears
		await expect(page.locator('.toast')).toBeVisible();
		await expect(page.locator('.toast')).toContainText('Fit to page enabled');

		// Wait for toast to disappear
		await page.waitForTimeout(2500);
		await expect(page.locator('.toast')).not.toBeVisible();

		// Pinch gesture should also work
		await simulatePinch(page, 100, 150);
		await expect(page.locator('.toast')).toBeVisible();
		await expect(page.locator('.toast')).toContainText('Manual zoom enabled');
	});

	test('toast messages have correct styling and animation', async ({ page }) => {
		await page.goto('/Jigs-1-Severn-Stars');
		await expect(page.getByText('Upton upon Severn Stick Dance', { exact: true })).toBeInViewport();

		// Trigger a toast
		await simulateDoubleTap(page, [
			{ x: 300, y: 300 },
			{ x: 350, y: 300 }
		]);

		// Check toast appears with correct styling
		const toast = page.locator('.toast');
		await expect(toast).toBeVisible();

		// Check CSS properties
		await expect(toast).toHaveCSS('position', 'fixed');
		await expect(toast).toHaveCSS('z-index', '1000');
		await expect(toast).toHaveCSS('pointer-events', 'none');

		// Check that it's centered (approximately)
		const box = await toast.boundingBox();
		const viewport = page.viewportSize();
		if (box && viewport) {
			const centerX = box.x + box.width / 2;
			const centerY = box.y + box.height / 2;
			expect(Math.abs(centerX - viewport.width / 2)).toBeLessThan(50);
			expect(Math.abs(centerY - viewport.height / 2)).toBeLessThan(50);
		}

		// Toast should disappear after timeout
		await page.waitForTimeout(2500);
		await expect(toast).not.toBeVisible();
	});

	test('multiple gestures can be performed in sequence', async ({ page }) => {
		await page.goto('/Jigs-1-Severn-Stars');
		await expect(page.getByText('Upton upon Severn Stick Dance', { exact: true })).toBeInViewport();

		// Start with fit to page
		await simulateDoubleTap(page, [
			{ x: 300, y: 300 },
			{ x: 350, y: 300 }
		]);
		await expect(page.locator('.toast')).toContainText('Fit to page enabled');
		await page.waitForTimeout(2500);

		// Switch to manual with pinch
		await simulatePinch(page, 100, 150);
		await expect(page.locator('.toast')).toContainText('Manual zoom enabled');
		await page.waitForTimeout(2500);

		// Try another pinch (should not show toast)
		await simulatePinch(page, 150, 200);
		await expect(page.locator('.toast')).not.toBeVisible();

		// Back to fit to page
		await simulateDoubleTap(page, [
			{ x: 300, y: 300 },
			{ x: 350, y: 300 }
		]);
		await expect(page.locator('.toast')).toContainText('Fit to page enabled');
	});

	test('previous page button should not appear when zooming reduces pages to one after hiding tunes', async ({
		page
	}) => {
		await page.goto('/Jigs-1-Severn-Stars');
		await expect(page.getByText('Upton upon Severn Stick Dance', { exact: true })).toBeInViewport();

		await page.getByRole('button', { name: 'Show controls' }).click();

		const zoomIn = page.getByRole('button', { name: 'Zoom in' });
		while (
			!(await zoomIn.isDisabled()) &&
			(await page.getByText('Seven Stars', { exact: true }).isVisible())
		) {
			await zoomIn.click();
		}

		await expect(page.getByRole('button', { name: 'Next page' })).toBeVisible();

		const firstTune = page.locator('.tune').first();
		const hideButton = firstTune.getByRole('button', { name: 'Hide tune' });
		await hideButton.click();

		await page.getByRole('button', { name: 'Next page' }).click();

		await expect(
			page.getByText('Upton upon Severn Stick Dance', { exact: true })
		).not.toBeInViewport();

		await page.getByRole('button', { name: 'Hide controls' }).click();

		await expect(page.getByRole('button', { name: 'Previous page' })).not.toBeVisible();
	});
});
