<script lang="ts">
	import { browser } from '$app/environment';
	import { renderAbc } from 'abcjs';
	import '@fontsource/saira-condensed/800.css';
	import '@fontsource/saira-condensed/400.css';
	import { writable, type Writable } from 'svelte/store';
	import { tick } from 'svelte';
	export let visualTranspose = 0;
	export let tuneOffset: Writable<number>;
	export let abc: string;
	export let fullAbc: string | undefined = undefined;
	export let fontFamily = 'Saira Condensed';
	export let staffwidth: number | undefined = undefined;
	export let fontSize = 12;
	export let titleSize = fontSize + 6;
	export let visible = null;
	let dots: HTMLDivElement;
	export let refreshVisibility = writable(0);

	// Normalize repeats to start at the beginning of a line rather than the end of the previous line
	// abcjs displays repeats where written in the abc, so it looks weird if we don't do this
	$: amendedAbc = abc.replace(/\|: *\n/g, '||\n|:').replace(/:: .*\n/g, ':|\n|:');
	// TODO might be nice to say what these mean eg +2 = for Bb instruments
	$: transpose_summary =
		$tuneOffset == 0 ? 'Concert pitch' : `Transposed ${$tuneOffset > 0 ? '+' : ''}${$tuneOffset}`;
	$: moreAmendedAbc = amendedAbc.replace(
		/\n(T:[^\n]*)\n/,
		(match, mainTitle) => `\n${mainTitle}\nT: ${transpose_summary}\n`
	);

	$: if (dots && browser) {
		renderAbc(dots, moreAmendedAbc, {
			format: {
				titlefont: `${fontFamily} Bold ${titleSize}`,
				subtitlefont: `${fontFamily} ${fontSize}`,
				composerfont: `${fontFamily} ${fontSize}`,
				historyfont: `${fontFamily} ${fontSize}`,
				partsfont: `${fontFamily} ${fontSize}`,
				tempofont: `${fontFamily} ${fontSize}`,
				infofont: `${fontFamily} ${fontSize}`
			},
			visualTranspose: visualTranspose + $tuneOffset,
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
		svg.querySelectorAll('g[data-name=ending] text').forEach((elem) => {
			elem.setAttribute('font-family', fontFamily);
		});
	}

	let innerHeight = 0;
	let innerWidth = 0;
	let touchingScreen = false;
	let touchScreenTimeout: undefined = undefined;

	function updateVisible(boundingRect: DOMRect | undefined, _: number, innerHeight: number, innerWidth: number) {
		// if (touchingScreen) return;
		if (!boundingRect?.height) {
			visible = false;
		} else {
			visible = boundingRect.bottom <= innerHeight && boundingRect.right <= innerWidth;
		}
	}
	$: updateVisible(svg?.getBoundingClientRect(), $refreshVisibility, innerHeight, innerWidth);
</script>

<svelte:window
	bind:innerHeight
	bind:innerWidth
	on:touchstart={() => { clearTimeout(touchScreenTimeout) ; touchingScreen = true }}
	on:touchcancel={() => { touchScreenTimeout = setTimeout(() => touchingScreen = false,  1000)}}
	on:touchend={() => { touchScreenTimeout = setTimeout(() => touchingScreen = false,  1000)}}
/>

<div bind:this={dots} class="mx-auto" />

<style>
	div :global(svg) {
		width: 100%;
	}

	div {
		width: max-content;
	}
</style>
