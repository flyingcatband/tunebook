import { BROWSER } from 'esm-env';

/**
 * Calculates the maximum width for a set of SVGs to fit in a container.
 * The SVGs are arranged in columns, wrapping when a column is full.
 * All SVGs are scaled to the same calculated width.
 *
 * @param svgs An array of objects, each with an aspectRatio.
 * @param containerWidth The width of the available space.
 * @param containerHeight The height of the available space.
 * @returns The width each SVG should be, as a percentage of the containerWidth.
 */
export function calculateMaximumWidth(
	svgs: { aspectRatio: number }[],
	containerWidth: number,
	containerHeight: number
): number {
	/**
	 * A helper function that checks if a given candidate width (`w`) allows
	 * all SVGs to be laid out within the container's bounds.
	 * It simulates the flexbox column-wrap behavior.
	 * @param w The candidate width in pixels for each SVG.
	 * @returns True if the layout fits, false otherwise.
	 */
	const canFit = (w: number): boolean => {
		// A width of 0 or less is always considered to fit.
		if (w <= 0) {
			return true;
		}

		let numColumns = 1;
		let currentColumnHeight = 0;

		for (const svg of svgs) {
			const svgHeight = w / svg.aspectRatio;

			// If any single SVG is taller than the container, this width is impossible.
			if (svgHeight > containerHeight) {
				return false;
			}

			// Check if the SVG fits in the current column.
			if (currentColumnHeight + svgHeight <= containerHeight) {
				// Add it to the current column.
				currentColumnHeight += svgHeight;
			} else {
				// It doesn't fit, so start a new column for this SVG.
				numColumns++;
				currentColumnHeight = svgHeight;
			}
		}

		// After arranging all SVGs, check if the total width of all columns fits.
		const totalWidthNeeded = numColumns * w;
		return totalWidthNeeded <= containerWidth;
	};

	// --- Binary Search for the Optimal Width ---
	// We search for the best width in pixels, from 0 to the container's full width.
	let low = 0;
	let high = containerWidth;
	let bestWidth = 0;

	// A fixed number of iterations (e.g., 100) is sufficient for high precision
	// in a binary search, avoiding issues with floating-point comparisons.
	for (let i = 0; i < 100; i++) {
		const mid = low + (high - low) / 2;
		if (canFit(mid)) {
			// This width is viable. Let's save it and try for an even larger width.
			bestWidth = mid;
			low = mid;
		} else {
			// This width is too large. We need to try a smaller one.
			high = mid;
		}
	}

	// Avoid division by zero if the container has no width.
	if (containerWidth === 0) {
		return 0;
	}

	// Convert the final optimal width (in pixels) to a percentage.
	return (bestWidth / containerWidth) * 100;
}

export function manuallyPaginate(
	tunes: { aspectRatio: number }[],
	availableWidth: number,
	availableHeight: number,
	tuneWidth: number
) {
	if (!BROWSER) return null;
	// Tune width is a percentage of the viewport width, so we need to convert it to pixels
	// Round column width to 2dp to prevent errors with 3 columns getting rounded down to 2
	const columnWidth = Math.floor(availableWidth * tuneWidth) / 100;
	const numColumns = Math.max(1, Math.floor(availableWidth / columnWidth));
	if (isNaN(numColumns)) return null;

	const pages = [];
	let firstTuneOnPage = 0;

	pages: for (let page = 0; firstTuneOnPage < tunes.length; page++) {
		const columnHeights = new Array(numColumns).fill(0);
		let columnIndex = 0;
		for (let i = firstTuneOnPage; i < tunes.length; i++) {
			const tune = tunes[i];
			const tuneHeight = columnWidth / tune.aspectRatio;
			if (i > firstTuneOnPage && columnHeights[columnIndex] + tuneHeight > availableHeight) {
				columnIndex++;
			}
			if (columnIndex >= numColumns) {
				// No more columns available, so we can't display any more tunes
				pages.push({ start: firstTuneOnPage, end: i - 1 });
				firstTuneOnPage = i;
				continue pages;
			}

			// At this point, either the column is tall enough to fit the tune,
			// or the tune is too tall to fit in any column, so we just put it
			// in the first free column
			columnHeights[columnIndex] += tuneHeight;
		}
		if (firstTuneOnPage < tunes.length) {
			pages.push({ start: firstTuneOnPage, end: tunes.length - 1 });
			break;
		}
	}

	return pages;
}
