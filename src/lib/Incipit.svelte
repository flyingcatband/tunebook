<script lang="ts">
	import { writable } from 'svelte/store';
	import Tune from './Tune.svelte';

	/** The full abc of the tune you want to render */
	export let abc: string;
	/** If you want to set a custom font for the title of the tune, pass in its name here */
	export let fontFamily: string | undefined = undefined;

	function firstTwoBars(abcTuneSection: string): string {
		const [firstChar, rest] = [abcTuneSection[0], abcTuneSection.slice(1)];
		return firstChar + rest?.split('|').slice(0, 2).join('|') + '|';
	}

	function calculateIncipitAbc(abc: string): string {
		const trimmedAbc = abc.replace(/\n\s*/g, '\n').replace(/%[^\n]*\n/g, '\n');
		const tuneStartIndex = trimmedAbc.matchAll(/\n(?:[^A-Z]|[A-Z][^:])/g).next()?.value?.index + 1;
		const preservedFields: string[] = trimmedAbc
			.slice(0, tuneStartIndex)
			.split('\n')
			.filter((t) => t.match(/^[XTKML]/));

		return preservedFields.join('\n') + '\n' + firstTwoBars(trimmedAbc.slice(tuneStartIndex));
	}
</script>

<Tune
	abc={calculateIncipitAbc(abc)}
	{fontFamily}
	staffwidth={250}
	fontSize={8}
	titleSize={12}
	tuneOffset={writable(0)}
	showTransposition={false}
/>
