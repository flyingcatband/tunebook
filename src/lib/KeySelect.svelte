<script>
	export let originalKey;
	export let transposition;

	const ROOTS = ['A', 'Bb', 'B', 'C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab'];

	const ROOT_NUMBERS = {
		A: 0,
		'A#': 1,
		Bb: 1,
		B: 2,
		C: 3,
		'C#': 4,
		Db: 4,
		D: 5,
		'D#': 6,
		Eb: 6,
		E: 7,
		F: 8,
		'F#': 9,
		Gb: 9,
		G: 10,
		'G#': 11,
		Ab: 11
	};

	function displayTransposition(transposition) {
		if (transposition > 0) {
			return `(+${transposition})`;
		} else if (transposition < 0) {
			return `(${transposition})`;
		} else {
			return ``;
		}
	}

	$: writtenKey = originalKey.root + originalKey.acc;
	$: availableKeys = [...Array(24).keys()].map((i) => {
		const transposition = i - 11;
		const root = ROOTS[(ROOT_NUMBERS[writtenKey] + 12 + transposition) % 12];
		let mode = originalKey.mode;
		if (!mode.match(/m?/)) {
			mode = ` ${mode}`;
		}

		return [`${root}${mode}`, transposition];
	});
</script>

<select bind:value={transposition}>
	{#each availableKeys as [key, transposition]}
		<option value={transposition}>{key} {displayTransposition(transposition)}</option>
	{/each}
</select>
