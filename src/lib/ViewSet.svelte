<script lang="ts">
	import { BROWSER } from 'esm-env';
	import pkg, { type KeySignature } from 'abcjs';
	import KeySelect from '$lib/KeySelect.svelte';
	import Tune from '$lib/Tune.svelte';
	import { writable, type Writable } from 'svelte/store';
	import { keyedLocalStorage } from './keyedLocalStorage.js';
	import { tick, untrack, type Snippet } from 'svelte';
	import type { Clef, Set, Tune as TuneTy } from './types/index.js';

	const { renderAbc } = pkg;
	import { onMount } from 'svelte';

	onMount(async () => {
		if (!customElements.get('drab-wakelock')) {
			const { WakeLock } = await import('drab/wakelock');
			customElements.define('drab-wakelock', WakeLock);
		}
	});
	interface Props {
		/** The name of the tunebook you're displaying, used in the page title */
		folderName?: string;
		/** The Set to display */
		set: Set;
		/** Optionally a custom font to use in the rendered music */
		fontFamily?: string;
		/** Optionally specify which ABC information header fields to display */
		displayAbcFields?: string;
		/** Whether to show a clef switcher alongside the other controls */
		showClefSwitcher?: boolean;
		/** Whether to keep the device screen on when viewing the set */
		preventWakelock?: boolean;
		/** Use this to scope the settings for the set (key, clef, transposition, zoom level etc)
		 * You might want to do this if you have the same set appearing in multiple
		 * tunebooks on the same domain, and with different settings.
		 * */
		settingsScope?: string;
		/** Optionally hide the button which allows users to copy the abc notation of each tune*/
		hideCopyAbc?: boolean;
		children: Snippet;
	}

	let {
		children,
		folderName = 'Tunebook',
		set,
		fontFamily,
		showClefSwitcher = false,
		displayAbcFields = 'TNC',
		preventWakelock = false,
		settingsScope = '',
		hideCopyAbc = false
	}: Props = $props();
	if (!displayAbcFields.match(/^[A-Z]*$/)) {
		throw Error(`displayAbcFields should be a string of (uppercase) ABC field names`);
	}

	let innerHeight: number = $state(0),
		innerWidth: number = $state(0);
	let orientation = $derived(innerHeight >= innerWidth ? 'portrait' : 'landscape');
	let slotFilled = $derived(children !== undefined);
	let notesBeside = $derived(
		keyedLocalStorage(`${settingsScope}${set.slug}_${orientation}_notesBeside`, false)
	);

	let notesHidden = $derived(
		keyedLocalStorage(`${settingsScope}${set.slug}_${orientation}_notesHidden`, false)
	);
	let globalClef: Writable<Clef> = keyedLocalStorage('globalClef', 'treble');
	let clef: Writable<Clef | 'global'> = $derived(
		keyedLocalStorage(`${settingsScope}${set.slug}_clef`, 'global')
	);
	let preservedFieldRegex = $derived(
		new RegExp(
			`^[XKML${displayAbcFields
				.split('')
				.filter((f) => !$notesHidden || !'BNSF'.includes(f))
				.join('')}]`
		)
	);

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

	function applyClef(clef: Clef | 'global', abc: string) {
		if (clef === 'global') {
			clef = $globalClef;
		}
		if (clef === 'bass') {
			return abc.replaceAll(/K: ?[^ \r\n]+/g, (match) => `${match} clef=bass octave=-2`);
		} else {
			return abc;
		}
	}

	const ROOTS = ['A', 'B♭', 'B', 'C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭'];

	type ExtraTuneProps = { div?: Element; originalKey?: KeySignature; offset: Writable<number> };

	let tunes: (TuneTy & ExtraTuneProps)[] = $derived(
		set.content.map((tune) => {
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
				offset: keyedLocalStorage(`${settingsScope}${set.slug}_${tune.slug}_offset`, 0)
			};
		})
	);

	let tunesContainer: Element | undefined = $state();
	let globalTransposition = keyedLocalStorage(`globalTransposition`, 0);
	let hideControls = $state(true);
	let autozoomEnabled = $derived(
		keyedLocalStorage(`${settingsScope}${set.slug}_${orientation}_autozoom`, true)
	);

	let maxWidth = $derived(
		keyedLocalStorage(`${settingsScope}${set.slug}_${orientation}_maxWidth`, 95)
	);
	$effect(() => maxWidth.subscribe(() => untrack(() => $refreshVisibility++)));

	let visible = $state([...Array(set.content.length)]);
	let displayFrom = $state([0]);

	$effect(() => {
		untrack(() => (displayFrom = [0]));
		visible = [...Array(set.content.length)];
	});

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

{#if !preventWakelock}
	<drab-wakelock locked auto-lock></drab-wakelock>
{/if}
<svelte:window bind:innerHeight bind:innerWidth />

<div class="page-container" class:notes-beside={$notesBeside && slotFilled && !$notesHidden}>
	<div class="controls-container">
		<span class="key-reminder"
			>Folder key: {ROOTS[(ROOTS.length + 3 - $globalTransposition) % ROOTS.length]}</span
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
			{#if showClefSwitcher}
				<select bind:value={$clef}>
					<option value="global">Use global clef ({$globalClef})</option>
					<option value="treble">Treble clef</option>
					<option value="bass">Bass clef</option>
				</select>
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
						<span class="original-key" class:hidden={hideControls}>
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
					{#if !hideCopyAbc}
						<button
							id={`copy-${tune.slug}`}
							class:hidden={hideControls}
							onclick={async () => {
								try {
									await navigator.clipboard.writeText(tune.abc);
									const thisButton = document.getElementById(`copy-${tune.slug}`);
									if (thisButton != null) {
										thisButton.textContent = 'Copied!';
										setTimeout(() => (thisButton.textContent = 'Copy ABC'), 2000);
									}
								} catch (e) {
									console.error(e);
								}
							}}
						>
							Copy ABC
						</button>
					{/if}
					<Tune
						abc={applyClef($clef, stripUnwantedHeaders(tune.abc))}
						globalTransposition={$globalTransposition}
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

<style>
	.toggle-controls {
		position: absolute;
		top: 0;
		left: 50%;
		transform: translateX(-50%);
		font-size: 1.5rem;
		padding: 1rem;
	}
	button:not(.page) {
		position: relative;
		z-index: 10;
	}
	div {
		display: block;
	}
	#controls {
		margin: 0 auto;
	}

	.page-container {
		display: grid;
		height: 100svh;
		width: 100svw;
		padding-top: 1rem;
		box-sizing: border-box;
	}

	.tunes {
		grid-area: tunes;
	}

	.notes-container {
		grid-area: notes;
		padding: 0.2em 1em;
	}
	.controls-container {
		grid-area: controls;
	}
	.controls-container button {
		position: relative;
		z-index: 10;
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
		flex-direction: column;
		min-height: 100%;
		width: 100%;
		display: flex;
	}

	.two-column {
		flex-wrap: wrap;
		margin: 0 auto;
	}

	.tune :global(select) {
		position: relative;
		z-index: 10;
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
		margin: 0 auto;
		width: 90%;
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
		position: absolute;
		top: 1.25rem;
		right: 1.25rem;
	}
</style>
