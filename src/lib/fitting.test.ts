import { describe, expect, test } from 'vitest';
import { calculateMaximumWidth, maximiseWidth } from './fitting';

describe('fitting', () => {
	test('it fits so it sits', () => {
		const tunes = [
			[770, 647.7550048828125],
			[770, 463.5450134277344],
			[770, 469.2689208984375],
			[770, 459.6700134277344]
		].map(([width, height]) => ({ aspectRatio: width / height }));
		const tuneContainerDimensions = {
			width: 1504,
			height: 614.433349609375
		};

		const result = calculateMaximumWidth(
			tunes,
			tuneContainerDimensions.width,
			tuneContainerDimensions.height
		);

		expect(result).toBeGreaterThan(30);
		expect(result).toBeLessThan(35);
	});
});
