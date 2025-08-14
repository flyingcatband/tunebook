import { describe, expect, test } from 'vitest';
import { calculateMaximumWidth } from './fitting';

describe('fitting', () => {
	const jigs2 = [
		[770, 647.7550234533238],
		[770, 463.54499999999996],
		[770, 469.2689191608682],
		[770, 459.66999999999996]
	].map(([width, height]) => ({ aspectRatio: width / height }));

	test('it fits so it sits', () => {
		const tuneContainerDimensions = {
			width: 1504,
			height: 614.433349609375
		};

		const result = calculateMaximumWidth(
			jigs2,
			tuneContainerDimensions.width,
			tuneContainerDimensions.height
		);

		expect(result).toBeGreaterThan(30);
		expect(result).toBeLessThan(35);
	});

	test('it maximises width according to height constraints', () => {
		const tuneContainerDimensions = { width: 363, height: 622 };
		const result = calculateMaximumWidth(
			jigs2,
			tuneContainerDimensions.width,
			tuneContainerDimensions.height
		);

		expect(result).toBeGreaterThan(60);
		expect(result).toBeLessThan(65);
	});
});
