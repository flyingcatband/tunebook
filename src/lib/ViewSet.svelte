<script lang="ts">
	import { BROWSER } from 'esm-env';
	import { renderAbc, type KeySignature } from 'abcjs';
	import KeySelect from '$lib/KeySelect.svelte';
	import Tune from '$lib/Tune.svelte';
	import { writable, type Writable } from 'svelte/store';
	import { keyedLocalStorage } from './keyedLocalStorage.js';
	import { tick } from 'svelte';
	import type { Set, Tune as TuneTy } from './types/index.js';

	export let folderName: string = 'Tunebook';
	export let set: Set;
	export let fontFamily: string | undefined = undefined;
	export let displayAbcFields: string = 'TNC';

	if (!displayAbcFields.match(/^[A-Z]*$/)) {
		throw Error(`displayAbcFields should be a string of (uppercase) ABC field names`);
	}

	$: preservedFieldRegex = new RegExp(`^[XKML${displayAbcFields}]`);

	function stripUnwantedHeaders(abc: string): string {
		const trimmedAbc = abc.replace(/\n\s*/g, '\n').replace(/%[^\n]*\n/g, '');
		const tuneStartIndex = trimmedAbc.matchAll(/\n(?:[^A-Z]|[A-Z][^:])/g).next()?.value?.index + 1;
		const preservedFields: string[] = trimmedAbc
			.slice(0, tuneStartIndex)
			.split('\n')
			.filter((t) => t.match(preservedFieldRegex));
		return preservedFields.join('\n') + '\n' + trimmedAbc.slice(tuneStartIndex);
	}

	const ROOTS = ['A', 'B♭', 'B', 'C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭'];

	$: slotFilled = $$slots.default;
	$: notesBeside = keyedLocalStorage(`${set.slug}_${orientation}_notesBeside`, false);

	type ExtraTuneProps = { div?: Element; originalKey?: KeySignature; offset: Writable<number> };

	let tunes: (TuneTy & ExtraTuneProps)[] = set.content.map((tune) => {
		const abcDetails = (BROWSER || null) && renderAbc('*', tune.abc)[0];
		return {
			...tune,
			originalKey: abcDetails?.getKeySignature(),
			offset: keyedLocalStorage(`${set.slug}_${tune.slug}_offset`, 0)
		};
	});

	let tunesContainer: Element;
	let visualTranspose = keyedLocalStorage(`globalTransposition`, 0);
	let hideControls = true;
	$: autozoomEnabled = keyedLocalStorage(`${set.slug}_${orientation}_autozoom`, true);

	let innerHeight: number, innerWidth: number;
	$: orientation = innerHeight >= innerWidth ? 'portrait' : 'landscape';
	$: maxWidth = keyedLocalStorage(`${set.slug}_${orientation}_maxWidth`, 95);
	$: updateWidth(maxWidth);

	function updateWidth(maxWidth: Writable<number>) {
		maxWidth.subscribe(async () => {
			$refreshVisibility++;
		});
	}

	let visible = [...Array(set.content.length)];
	let displayFrom = [0];
	$: visible = displayFrom && visible;
	$: visible[displayFrom[displayFrom.length - 1]] =
		visible[displayFrom[displayFrom.length - 1]] || true;
	let refreshVisibility = writable(0);
	$: displayFrom && $refreshVisibility++;

	// Don't allocate scroll space for hidden tunes but
	// briefly add it back in when the zoom level or
	// current page changes
	let zeroHeightIfOverflowing = true;
	refreshVisibility.subscribe(async () => {
		zeroHeightIfOverflowing = false;
		await tick();
		await tick();
		zeroHeightIfOverflowing = true;
	});

	$: innerHeight && innerWidth && fitToPage();

	let autoZooming = false;
	async function fitToPage() {
		if (autoZooming || !BROWSER) {
			return;
		}
		if (!$autozoomEnabled) {
			// We still want to make sure the tunes appear properly
			$refreshVisibility++;
			return;
		}
		autoZooming = true;

		// Show the first page
		displayFrom = [0];
		await tick();
		$refreshVisibility++;
		await tick();

		const div = tunes[0].div;
		if (typeof div === 'undefined') {
			autoZooming = false;
			throw Error('div is undefined');
		}

		// Zoom all the way in so we can no longer see all the tunes
		while (
			visible.every((vis) => vis) &&
			div.getBoundingClientRect().bottom < innerHeight &&
			$maxWidth < 95
		) {
			$maxWidth += 10;
			await tick();
		}

		// Zoom out until we can see all the tunes, and the entirety of the first tune
		// (First tune will always show, no matter whether it fits fully on the page,
		// subsequent tunes won't be visible until they fit)
		while (
			(visible.some((vis) => !vis) || div.getBoundingClientRect().bottom > innerHeight) &&
			$maxWidth > 20
		) {
			$maxWidth -= 5;
			await tick();
		}

		autoZooming = false;
		$maxWidth = $maxWidth;
	}

	$: {
		hideControls;
		orientation;
		fitToPage();
	}
</script>

<svelte:head>
	<title>{set?.name} | {folderName}</title>
</svelte:head>

<svelte:window bind:innerHeight bind:innerWidth />

<div class="page-container" class:notes-beside={$notesBeside && slotFilled}>
	<div class="controls-container">
		<span class="key-reminder"
			>Folder key: {ROOTS[(ROOTS.length + 3 - $visualTranspose) % ROOTS.length]}</span
		>
		<button class="toggle-controls" on:click={() => (hideControls = !hideControls)}
			>{hideControls ? 'Show' : 'Hide'} controls</button
		>
		<div id="controls" class:hidden={hideControls}>
			<button
				on:click={() => {
					$autozoomEnabled = false;
					$maxWidth -= 5;
				}}
				disabled={$maxWidth <= 20}>Zoom out</button
			>
			<button
				on:click={() => {
					$autozoomEnabled = false;
					$maxWidth += 5;
				}}
				disabled={$maxWidth >= 95}>Zoom in</button
			>
			{#if !$autozoomEnabled}
				<button
					on:click={() => {
						$autozoomEnabled = true;
						fitToPage();
					}}>Fit to page</button
				>
			{/if}
			{#if slotFilled}
				<button
					on:click={() => {
						$notesBeside = !$notesBeside;
						$refreshVisibility++;
					}}>Notes {$notesBeside ? 'below' : 'beside'}</button
				>
			{/if}
			<p>Current zoom level {$maxWidth}%</p>
		</div>
	</div>

	<div class="tunes" bind:this={tunesContainer} class:two-column={$maxWidth <= 50}>
		{#each tunes as tune, i}
			{#if i >= displayFrom[displayFrom.length - 1]}
				<div
					class="visible-{visible[i]} tune"
					style="max-width: {$maxWidth}vw"
					class:zeroHeightIfOverflowing
					bind:this={tune.div}
				>
					{#if tune.originalKey}
						<span class="inline-block" class:hidden={hideControls}>
							<KeySelect
								transposition={tune.offset}
								originalKey={tune.originalKey}
								tuneSlug={tune.slug}
							/></span
						>
					{/if}
					<button
						class:hidden={hideControls}
						on:click={() => tune.offset?.update((offset) => offset - 12)}>Down an octave</button
					>
					<button
						class:hidden={hideControls}
						on:click={() => tune.offset?.update((offset) => offset + 12)}>Up an octave</button
					>
					<Tune
						abc={stripUnwantedHeaders(tune.abc)}
						visualTranspose={$visualTranspose}
						tuneOffset={tune.offset}
						bind:visible={visible[i]}
						{refreshVisibility}
						{fontFamily}
						{tunesContainer}
						on:rerendered-abc={fitToPage}
					/>
				</div>
			{/if}
		{/each}
	</div>

	<div class="notes-container"><slot /></div>
</div>

{#if displayFrom.length > 1}
	<button
		on:click={() => {
			window.scrollBy(0, -25);
			displayFrom.pop();
			displayFrom = displayFrom;
		}}
		class="page back"
		aria-label="Previous page"
	>
		<div />
	</button>
{/if}
{#if !visible[visible.length - 1]}
	<button
		on:click={() => (displayFrom = [...displayFrom, visible.indexOf(false)])}
		class="page next"
		aria-label="Next page"
	>
		<div />
	</button>
{/if}

<style lang="postcss">
	.toggle-controls {
		@apply block mx-auto text-xl p-4 top-0;
	}
	button:not(.page) {
		@apply relative z-10;
	}
	div {
		@apply block;
	}
	#controls {
		@apply mx-auto;
	}

	.page-container {
		display: grid;
		height: 100svh;
		width: 100svw;
		@apply pt-3;
		box-sizing: border-box;
	}

	.tunes {
		grid-area: tunes;
	}

	.notes-container {
		grid-area: notes;
	}
	.controls-container {
		grid-area: controls;
	}
	.controls-container button {
		@apply relative z-10;
	}

	.page-container:not(.notes-beside) {
		grid-template-rows: auto 1fr auto;
		grid-template-columns: 1fr;
		grid-template-areas:
			'controls'
			'tunes'
			'notes';
	}

	.page-container.notes-beside {
		grid-template-columns: var(--notes-width, 33svw) 1fr;
		grid-template-rows: auto 1fr;
		grid-template-areas:
			'controls controls'
			'notes tunes';
	}

	/* TUNE CONTAINERS */
	.tunes {
		@apply flex flex-col;
		min-height: 100%;
		width: 100%;
	}

	.two-column {
		@apply flex-wrap mx-auto;
	}

	.tune :global(select) {
		@apply relative z-10;
	}

	/* HIDING TUNES THAT AREN'T DISPLAYED */
	.visible-null,
	.visible-false {
		visibility: hidden;
	}
	.visible-false {
		overflow: hidden;
	}
	.hidden {
		display: none;
	}
	.zeroHeightIfOverflowing.visible-false {
		height: 0;
	}
	.tune {
		@apply mx-auto w-[90%];
	}

	/* PAGE TURN BUTTONS */
	button.page {
		position: fixed;
		bottom: 0;
		height: 100%;
		width: min(15%, 10vw);
		border: none;
		background: none;
	}

	button.back {
		left: 0;
	}

	button.next {
		right: 0;
	}

	button.page div {
		width: 0;
		height: 0;
		border-top: 30px solid transparent;
		border-bottom: 30px solid transparent;
	}

	button.page.back div {
		border-right: 30px solid lightgray;
		position: absolute;
		left: 0.5em;
	}

	button.page.next div {
		border-left: 30px solid lightgray;
		position: absolute;
		right: 0.5em;
	}

	p {
		margin: 0;
		font-size: 0.8rem;
		text-align: left;
	}
	p:last-of-type {
		margin-bottom: 1em;
	}
	.key-reminder {
		@apply absolute sm:right-5 top-5 right-1;
	}
</style>
