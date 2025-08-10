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

	type ExtraTuneProps = {
		div?: Element;
		originalKey?: KeySignature;
		offset: Writable<number>;
		aspectRatio?: number;
	};

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
	let calculatingAspectRatio = $state(false);
	let aspectRatiosCalculated = $state(false);
	let globalTransposition = keyedLocalStorage(`globalTransposition`, 0);
	let hideControls = $state(true);
	let autozoomEnabled = $derived(
		keyedLocalStorage(`${settingsScope}${set.slug}_${orientation}_autozoom`, true)
	);

	let maxWidth = $derived(
		keyedLocalStorage(`${settingsScope}${set.slug}_${orientation}_maxWidth`, 95)
	);

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
		if (!aspectRatiosCalculated) {
			calculatingAspectRatio = true;
			await tick();
			calculatingAspectRatio = false;
			aspectRatiosCalculated = true;
		}
		if (!$autozoomEnabled) {
			return;
		}
		autoZooming = true;

		const availableWidth = tunesContainer?.clientWidth;
		const availableHeight = tunesContainer?.clientHeight;

		if (!availableWidth || !availableHeight) {
			autoZooming = false;
			return;
		}

		let bestMaxWidth = 0;

		for (let numColumns = 1; numColumns <= tunes.length; numColumns++) {
			const columnWidth = availableWidth / numColumns;
			let maxHeight = 0;
			for (let i = 0; i < numColumns; i++) {
				let columnHeight = 0;
				for (let j = i; j < tunes.length; j += numColumns) {
					const tune = tunes[j];
					if (tune.aspectRatio) {
						columnHeight += columnWidth / tune.aspectRatio;
					}
				}
				maxHeight = Math.max(maxHeight, columnHeight);
			}

			if (maxHeight <= availableHeight) {
				const currentMaxWidth = (columnWidth / availableWidth) * 100;
				if (currentMaxWidth > bestMaxWidth) {
					bestMaxWidth = currentMaxWidth;
				}
			} else {
				// Tunes don't fit, so let's try making them narrower
				const requiredWidth = (availableHeight / maxHeight) * columnWidth;
				const currentMaxWidth = (requiredWidth / availableWidth) * 100;
				if (currentMaxWidth > bestMaxWidth) {
					bestMaxWidth = currentMaxWidth;
				}
			}
		}
		$maxWidth = bestMaxWidth;
		autoZooming = false;
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
					}}>Notes {$notesBeside ? 'below' : 'beside'}</button
				>
				<button
					onclick={() => {
						$notesHidden = !$notesHidden;
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
			<div class="tune" style="max-width: {$maxWidth}vw" bind:this={tune.div}>
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
					{fontFamily}
					{tunesContainer}
				/>
			</div>
		{/each}
	</div>

	{#if calculatingAspectRatio}
		<div class="offscreen-tunes">
			{#each tunes as tune, i}
				<Tune
					abc={applyClef($clef, stripUnwantedHeaders(tune.abc))}
					globalTransposition={$globalTransposition}
					tuneOffset={tune.offset}
					{fontFamily}
					onrerenderedAbc={async (tuneDiv) => {
						const svg = tuneDiv?.getElementsByTagName('svg')?.[0];
						if (svg) {
							const viewBox = svg.getAttribute('viewBox');
							if (viewBox) {
								const [, , width, height] = viewBox.split(' ').map(parseFloat);
								console.log(`Width & height for tune ${tune.slug}:`, width, height);
								tune.aspectRatio = width / height;
								if (tunes.every((t) => t.aspectRatio)) {
									fitToPage();
								}
							}
						}
					}}
				/>
			{/each}
		</div>
	{/if}

	{#if !$notesHidden}
		<div class="notes-container">{@render children?.()}</div>
	{/if}
</div>

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
	.hidden {
		display: none;
	}

	.tune {
		margin: 0 auto;
		width: 90%;
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
