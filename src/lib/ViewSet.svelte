<script lang="ts">
	import { BROWSER } from 'esm-env';
	import pkg, { type KeySignature } from 'abcjs';
	import KeySelect from '$lib/KeySelect.svelte';
	import Tune from '$lib/Tune.svelte';
	import { writable, type Writable } from 'svelte/store';
	import { keyedLocalStorage } from './keyedLocalStorage.js';
	import { tick, untrack, type Snippet } from 'svelte';
	import type { Set, Tune as TuneTy } from './types/index.js';

	const { renderAbc } = pkg;

	interface Props {
		folderName: string;
		set: Set;
		fontFamily?: string;
		displayAbcFields: string;
		children: Snippet;
	}

	let { children, folderName, set, fontFamily, displayAbcFields }: Props = $props();

	if (!displayAbcFields.match(/^[A-Z]*$/)) {
		throw Error(`displayAbcFields should be a string of (uppercase) ABC field names`);
	}

	let preservedFieldRegex = $derived(new RegExp(`^[XKML${displayAbcFields}]`));

	function stripUnwantedHeaders(abc: string): string {
		const trimmedAbc = abc.replace(/\n\s*/g, '\n').replace(/%[^\n]*\n/g, '');
		const tuneStartIndex =
			(trimmedAbc.matchAll(/\n(?:[^A-Z]|[A-Z][^:])/g).next()?.value?.index ?? 0) + 1;
		const preservedFields: string[] = trimmedAbc
			.slice(0, tuneStartIndex)
			.split('\n')
			.filter((t) => t.match(preservedFieldRegex));
		return preservedFields.join('\n') + '\n' + trimmedAbc.slice(tuneStartIndex);
	}

	const ROOTS = ['A', 'B♭', 'B', 'C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭'];

	let innerHeight: number = $state(0),
		innerWidth: number = $state(0);
	let orientation = $derived(innerHeight >= innerWidth ? 'portrait' : 'landscape');
	let slotFilled = $derived(children !== undefined);
	let notesBeside = $derived(keyedLocalStorage(`${set.slug}_${orientation}_notesBeside`, false));
	let notesHidden = $derived(keyedLocalStorage(`${set.slug}_${orientation}_notesHidden`, false));

	type ExtraTuneProps = { div?: Element; originalKey?: KeySignature; offset: Writable<number> };

	let tunes: (TuneTy & ExtraTuneProps)[] = set.content.map((tune) => {
		const abcDetails = (BROWSER || null) && renderAbc('*', tune.abc)[0];
		let div = $state<Element>();
		return {
			...tune,
			get div() {
				return div;
			},
			set div(value) {
				div = value;
			},
			originalKey: abcDetails?.getKeySignature(),
			offset: keyedLocalStorage(`${set.slug}_${tune.slug}_offset`, 0)
		};
	});

	let tunesContainer: Element | undefined = $state();
	let visualTranspose = keyedLocalStorage(`globalTransposition`, 0);
	let hideControls = $state(true);
	let autozoomEnabled = $derived(keyedLocalStorage(`${set.slug}_${orientation}_autozoom`, true));

	let maxWidth = $derived(keyedLocalStorage(`${set.slug}_${orientation}_maxWidth`, 95));
	$effect(() => updateWidth(maxWidth));

	function updateWidth(maxWidth: Writable<number>) {
		maxWidth.subscribe(() => {
			untrack(() => $refreshVisibility++);
		});
	}

	let visible = $state([...Array(set.content.length)]);
	let displayFrom = $state([0]);
	$effect(() => {
		let index = displayFrom.at(-1)!;
		visible[index] = visible[index] || true;
	});
	let refreshVisibility = writable(0);
	$effect(() => {
		displayFrom && untrack(() => $refreshVisibility++);
	});

	// Don't allocate scroll space for hidden tunes but
	// briefly add it back in when the zoom level or
	// current page changes
	let zeroHeightIfOverflowing = $state(true);
	$effect(() => {
		// react to refreshVisibility
		$refreshVisibility;
		(async () => {
			zeroHeightIfOverflowing = false;
			await tick();
			await tick();
			zeroHeightIfOverflowing = true;
		})();
	});

	$effect(() => {
		hideControls;
		orientation;
		innerHeight && innerWidth && untrack(fitToPage);
	});

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
</script>

<svelte:head>
	<title>{set?.name} | {folderName}</title>
</svelte:head>

<svelte:window bind:innerHeight bind:innerWidth />

<div class="page-container" class:notes-beside={$notesBeside && slotFilled && !$notesHidden}>
	<div class="controls-container">
		<span class="key-reminder"
			>Folder key: {ROOTS[(ROOTS.length + 3 - $visualTranspose) % ROOTS.length]}</span
		>
		<button class="toggle-controls" onclick={() => (hideControls = !hideControls)}
			>{hideControls ? 'Show' : 'Hide'} controls</button
		>
		<div id="controls" class:hidden={hideControls}>
			<button
				onclick={() => {
					$autozoomEnabled = false;
					$maxWidth -= 5;
				}}
				disabled={$maxWidth <= 20}>Zoom out</button
			>
			<button
				onclick={() => {
					$autozoomEnabled = false;
					$maxWidth += 5;
				}}
				disabled={$maxWidth >= 95}>Zoom in</button
			>
			{#if !$autozoomEnabled}
				<button
					onclick={() => {
						$autozoomEnabled = true;
						fitToPage();
					}}>Fit to page</button
				>
			{/if}
			{#if slotFilled}
				<button
					onclick={() => {
						$notesBeside = !$notesBeside;
						$refreshVisibility++;
					}}>Notes {$notesBeside ? 'below' : 'beside'}</button
				>
				<button
					onclick={() => {
						$notesHidden = !$notesHidden;
						$refreshVisibility++;
					}}>{$notesHidden ? 'Show' : 'Hide'} notes</button
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
						onclick={() => tune.offset?.update((offset) => offset - 12)}>Down an octave</button
					>
					<button
						class:hidden={hideControls}
						onclick={() => tune.offset?.update((offset) => offset + 12)}>Up an octave</button
					>
					<Tune
						abc={stripUnwantedHeaders(tune.abc)}
						visualTranspose={$visualTranspose}
						tuneOffset={tune.offset}
						bind:visible={visible[i]}
						{refreshVisibility}
						{fontFamily}
						{tunesContainer}
						onrerenderedAbc={fitToPage}
					/>
				</div>
			{/if}
		{/each}
	</div>

	{#if !$notesHidden}
		<div class="notes-container">{@render children?.()}</div>
	{/if}
</div>

{#if displayFrom.length > 1}
	<button
		onclick={() => {
			window.scrollBy(0, -25);
			displayFrom.pop();
		}}
		class="page back"
		aria-label="Previous page"
	>
		<div></div>
	</button>
{/if}
{#if !visible[visible.length - 1]}
	<button
		onclick={() => (displayFrom = [...displayFrom, visible.indexOf(false)])}
		class="page next"
		aria-label="Next page"
	>
		<div></div>
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
