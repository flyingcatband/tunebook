<script lang="ts">
	import { writable } from 'svelte/store';
	import Tune from './Tune.svelte';

	export let abc: string;
	export let fontFamily: string | undefined = undefined;

	function firstTwoBars(abcTuneSection: string): string {
		const [firstChar, rest] = [abcTuneSection[0], abcTuneSection.slice(1)];
		return firstChar + rest?.split('|').slice(0, 2).join('|') + '|';
	}

	function calculateInciptAbc(abc: string): string {
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
	abc={calculateInciptAbc(abc)}
	{fontFamily}
	staffwidth={250}
	fontSize={8}
	titleSize={12}
	tuneOffset={writable(0)}
/>
