<script lang="ts">
	import { BROWSER } from 'esm-env';
	import { renderAbc } from 'abcjs';
	import { writable, type Writable } from 'svelte/store';
	import { tick } from 'svelte';

	/** a store containing the number of semitones to transpose this tune */
	export let tuneOffset: Writable<number>;
	/** The full abc of a single tune */
	export let abc: string;
	/** If you want to set a custom font for the text that goes around tunes, pass in its name here */
	export let fontFamily: string | undefined = undefined;
	/** This is the width in pixels of the abcjs snippet. You probably don't need to override, the default is 740px  */
	export let staffwidth: number | undefined = undefined;
	/** Font size for most of the text around the rendered abc */
	export let fontSize = 12;
	/** Font size the title the rendered abc */
	export let titleSize = fontSize + 6;
	export let visible = null;
	export let showTransposition = true;
	let dots: HTMLDivElement;
	export let refreshVisibility = writable(0);

	// Normalize repeats to start at the beginning of a line rather than the end of the previous line
	// abcjs displays repeats where written in the abc, so it looks weird if we don't do this
	$: amendedAbc = abc.replace(/\|: *\n/g, '||\n|:').replace(/::.*\n/g, ':|\n|:');
	// TODO might be nice to say what these mean eg +2 = for Bb instruments
	$: transpose_summary = `Transposed ${$tuneOffset > 0 ? '+' : ''}${$tuneOffset}`;
	$: moreAmendedAbc =
		showTransposition && $tuneOffset !== 0
			? amendedAbc.replace(
					/\n(T:[^\n]*)\n/,
					(match, mainTitle) => `\n${mainTitle}\nT: ${transpose_summary}\n`
			  )
			: amendedAbc;

	$: if (dots && BROWSER) {
		renderAbc(dots, moreAmendedAbc, {
			format: fontFamily
				? {
						titlefont: `${fontFamily} Bold ${titleSize}`,
						subtitlefont: `${fontFamily} ${fontSize}`,
						composerfont: `${fontFamily} ${fontSize}`,
						historyfont: `${fontFamily} ${fontSize}`,
						partsfont: `${fontFamily} ${fontSize}`,
						tempofont: `${fontFamily} ${fontSize}`,
						infofont: `${fontFamily} ${fontSize}`
				  }
				: {},
			visualTranspose: $tuneOffset,
			selectTypes: false,
			responsive: 'resize',
			// This makes typescript happy that staffwidth is not undefined
			// If staffwidth is defined, add it as a property, else splat {} to avoid adding staffwidth
			...((staffwidth && { staffwidth }) || {})
		});
		updateSvg();
	}

	let svg: SVGElement | undefined = undefined;
	async function updateSvg() {
		await tick();
		svg = dots?.getElementsByTagName('svg')?.[0];
		if (typeof fontFamily !== 'undefined') {
			let fontStr = fontFamily;
			svg.querySelectorAll('g[data-name=ending] text').forEach((elem) => {
				elem.setAttribute('font-family', fontStr);
			});
		}
	}

	let innerHeight = 0;
	let innerWidth = 0;

	function updateVisible(
		boundingRect: DOMRect | undefined,
		_: number,
		innerHeight: number,
		innerWidth: number
	) {
		if (!boundingRect?.height) {
			visible = false;
		} else {
			visible = boundingRect.bottom <= innerHeight && boundingRect.right <= innerWidth;
		}
	}
	$: updateVisible(svg?.getBoundingClientRect(), $refreshVisibility, innerHeight, innerWidth);
</script>

<svelte:window bind:innerHeight bind:innerWidth />

<div bind:this={dots} class="mx-auto" />

<style>
	div :global(svg) {
		width: 100%;
	}

	div {
		width: max-content;
	}

	div {
		user-select: none;
	}
</style>
