<script lang="ts">
	import type { KeyAccidentalName, KeyRoot, KeySignature } from 'abcjs';
	import type { Readable } from 'svelte/store';

	export let originalKey: KeySignature;
	export let transposition: Readable<number>;
	export let tuneSlug: string;

	const ROOTS = ['A', 'B♭', 'B', 'C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭'];

	type WrittenKey = `${KeyRoot}${KeyAccidentalName}`;

	// @ts-expect-error WrittenKey covers some really weird (or invalid) cases (#11 is tracking this, but it's *very* low priority)
	const ROOT_NUMBERS: Record<WrittenKey, number> = {
		A: 0,
		'A#': 1,
		Bb: 1,
		B: 2,
		Cb: 2,
		'B#': 3,
		C: 3,
		'C#': 4,
		Db: 4,
		D: 5,
		'D#': 6,
		Eb: 6,
		E: 7,
		Fb: 7,
		'E#': 8,
		F: 8,
		'F#': 9,
		Gb: 9,
		G: 10,
		'G#': 11,
		Ab: 11,
		none: 0,
		noneb: 0,
		'none#': 0
	};

	function displayTransposition(transposition: number): string {
		if (transposition > 0) {
			return `(+${transposition})`;
		} else if (transposition < 0) {
			return `(${transposition})`;
		} else {
			return `(concert)`;
		}
	}

	$: writtenKey = (originalKey.root + originalKey.acc) as WrittenKey;
	$: availableKeys = [...Array(24).keys()].map((i) => {
		const transposition = i - 11;
		const root = ROOTS[(ROOT_NUMBERS[writtenKey] + 12 + transposition) % 12];
		let mode: string = originalKey.mode;
		if (!mode.match(/m?/)) {
			mode = ` ${mode}`;
		}

		return [`${root}${mode}`, transposition] as const;
	});
</script>

<select bind:value={$transposition} aria-label="Transpose {tuneSlug}">
	{#each availableKeys.reverse() as [key, transposition]}
		<option value={transposition}>{key} {displayTransposition(transposition)}</option>
	{/each}
</select>
