<script lang="ts">
	import { browser } from '$app/environment';
	import { renderAbc } from 'abcjs';
	import '@fontsource/saira-condensed/800.css';
	import '@fontsource/saira-condensed/400.css';
	import { writable, type Writable } from 'svelte/store';
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
	export let refreshVisibility = writable(null);

	// Normalize repeats to start at the beginning of a line rather than the end of the previous line
	// abcjs displays repeats where written in the abc, so it looks weird if we don't do this
	$: amendedAbc = abc.replace(/\|: *\n/g, '||\n|:').replace(/:: .*\n/g, ':|\n|:');
	$: dots && browser
		? renderAbc(dots, amendedAbc, {
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
		  })
		: undefined;
	$: svg = dots?.getElementsByTagName('svg')?.[0];
	$: svg?.querySelectorAll('g[data-name=ending] text').forEach((elem) => {
		elem.setAttribute('font-family', fontFamily);
	});

	let innerHeight = 0; // = browser ? window.innerHeight : 1000;
	let innerWidth = 0;
	let scrollX, scrollY;
	let touchingScreen = false;
	$: scrolledToZero = !scrollX && !scrollY;
	$: visible = !scrolledToZero || touchingScreen
		? visible
		: svg?.getBoundingClientRect().height == 0
		? null
		: ($refreshVisibility || true) && innerHeight && innerWidth
		? svg?.getBoundingClientRect().bottom <= innerHeight &&
		  svg?.getBoundingClientRect().right <= innerWidth
			? true
			: false
		: false;
</script>

<svelte:window
	bind:innerHeight
	bind:innerWidth
	bind:scrollX
	bind:scrollY
	on:touchstart={() => (touchingScreen = true)}
	on:touchcancel={() => (touchingScreen = false)}
	on:touchend={() => (touchingScreen = false)}
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
