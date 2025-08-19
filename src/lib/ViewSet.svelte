<script lang="ts">
	import { BROWSER } from 'esm-env';
	import pkg, { type KeySignature } from 'abcjs';
	import KeySelect from '$lib/KeySelect.svelte';
	import Tune from '$lib/Tune.svelte';
	import { type Writable } from 'svelte/store';
	import { keyedLocalStorage } from './keyedLocalStorage.js';
	import { untrack, type Snippet } from 'svelte';
	import type { Clef, Set, Tune as TuneTy } from './types/index.js';

	const { renderAbc } = pkg;
	import { onMount } from 'svelte';
	import { calculateMaximumWidth } from './fitting.js';

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

	let tunesContainerHeight: number = $state(0);

	onMount(() => {
		if (!customElements.get('drab-wakelock')) {
			import('drab/wakelock').then(({ WakeLock }) => {
				customElements.define('drab-wakelock', WakeLock);
			});
		}

		if (!BROWSER || !tunesContainer) return;

		const resizeObserver = new ResizeObserver(() => {
			const height = tunesContainer?.clientHeight;
			if (height && hideControls) {
				tunesContainerHeight = height;
			}
			if ($autozoomEnabled) {
				fitToPage();
			} else {
				manuallyPaginate();
			}
		});

		resizeObserver.observe(tunesContainer);

		return () => {
			resizeObserver.disconnect();
		};
	});
	if (!displayAbcFields.match(/^[A-Z]*$/)) {
		throw Error(`displayAbcFields should be a string of (uppercase) ABC field names`);
	}

	let innerHeight: number = $state(0),
		innerWidth: number = $state(0);
	let orientation = $derived(innerHeight >= innerWidth ? 'portrait' : 'landscape');
	let slotFilled = $derived(children !== undefined);
	let notesBeside = $derived(
		keyedLocalStorage(`${settingsScope}${set?.slug}_${orientation}_notesBeside`, false)
	);
	let displayFrom: number[] = $state([0]);
	let visible: boolean[] = $state(new Array(set.content.length).fill(false));

	function manuallyPaginate() {
		if (!BROWSER || !tunesContainer) {
			return;
		}

		const availableWidth = tunesContainer.clientWidth;
		const availableHeight = tunesContainer.clientHeight;
		if (!availableWidth || !availableHeight) return;

		// Max width is a percentage of the viewport width, so we need to convert it to pixels
		const columnWidth = innerWidth * ($maxWidth! / 100);
		const numColumns = Math.max(1, Math.floor(availableWidth / columnWidth));

		const newVisible = new Array(tunes.length).fill(false);
		const columnHeights = new Array(numColumns).fill(0);
		const startIndex = displayFrom.at(-1) ?? 0;
		let columnIndex = 0;

		for (let i = startIndex; i < tunes.length; i++) {
			const tune = tunes[i];
			const tuneHeight = columnWidth / tune.currentAspectRatio!;
			if (i > startIndex && columnHeights[columnIndex] + tuneHeight > availableHeight) {
				columnIndex++;
			}
			if (columnIndex >= numColumns) {
				// No more columns available, so we can't display any more tunes
				break;
			}

			// At this point, either the column is tall enough to fit the tune,
			// or the tune is too tall to fit in any column, so we just put it
			// in the first free column
			columnHeights[columnIndex] += tuneHeight;
			newVisible[i] = true;
		}

		visible = newVisible;
	}

	let notesHidden = $derived(
		keyedLocalStorage(`${settingsScope}${set?.slug}_${orientation}_notesHidden`, false)
	);
	let globalClef: Writable<Clef> = keyedLocalStorage('globalClef', 'treble');
	let clef: Writable<Clef | 'global'> = $derived(
		keyedLocalStorage(`${settingsScope}${set?.slug}_clef`, 'global')
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
		aspectRatio: number;
		widthCorrectionFactor?: number;
		currentAspectRatio: number;
		updateBaseAspectRatio: () => void;
	};

	let tunes: (TuneTy & ExtraTuneProps)[] = $derived(
		(set?.content || []).map((tune) => {
			const abcDetails = (BROWSER || null) && renderAbc('*', tune.abc)[0];
			const svg = abcDetails?.engraver?.renderer.paper.svg;
			let width = svg?.getAttribute('width') ? parseFloat(svg.getAttribute('width')!) : 0;
			let height = svg?.getAttribute('height') ? parseFloat(svg.getAttribute('height')!) : 0;
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
				offset: keyedLocalStorage(`${settingsScope}${set?.slug}_${tune.slug}_offset`, 0),
				aspectRatio: width && height && width / height,
				get currentAspectRatio() {
					const containerAspectRatio = div?.clientHeight
						? div?.clientWidth / div?.clientHeight
						: this.aspectRatio;
					this.updateBaseAspectRatio();
					return containerAspectRatio;
				},

				updateBaseAspectRatio() {
					const containerAspectRatio = div?.clientHeight && div?.clientWidth / div?.clientHeight;
					if (containerAspectRatio && hideControls) {
						this.aspectRatio = containerAspectRatio;
					}
				}
			};
		})
	);

	let tunesContainer: Element | undefined = $state();
	let globalTransposition = keyedLocalStorage(`globalTransposition`, 0);
	let hideControls = $state(true);
	let autozoomEnabled = $derived(
		keyedLocalStorage(`${settingsScope}${set?.slug}_${orientation}_autozoom`, true)
	);
	let maxWidth: Writable<number | null> = $derived(
		keyedLocalStorage(`${settingsScope}${set?.slug}_${orientation}_maxWidth`, null)
	);

	let initialDistance: number | null = null;
	let initialMaxWidth: number | null = null;
	let isPinching = false;

	let lastTapTime = 0;
	let lastTapTouches = 0;
	let swipeStartX: number | null = null;
	let swipeStartY: number | null = null;
	let swipeStartTime: number | null = null;
	let toastMessage = $state('');
	let toastVisible = $state(false);

	function getDistance(touches: TouchList) {
		const [touch1, touch2] = [touches[0], touches[1]];
		return Math.sqrt(
			Math.pow(touch2.clientX - touch1.clientX, 2) + Math.pow(touch2.clientY - touch1.clientY, 2)
		);
	}

	function showToast(message: string) {
		toastMessage = message;
		toastVisible = true;
		setTimeout(() => {
			toastVisible = false;
		}, 2000);
	}

	function handleTouchStart(event: TouchEvent) {
		const currentTime = Date.now();
		const touches = event.touches.length;

		if (touches === 2) {
			// Two-finger double tap detection
			if (currentTime - lastTapTime < 300 && lastTapTouches === 2) {
				event.preventDefault();
				$autozoomEnabled = true;
				fitToPage();
				showToast('Fit to page enabled');
				return;
			}
			lastTapTime = currentTime;
			lastTapTouches = touches;

			// Pinch gesture setup
			initialDistance = getDistance(event.touches);
			initialMaxWidth = $maxWidth;
			isPinching = false;
		} else if (touches === 1) {
			// Single finger swipe setup
			const touch = event.touches[0];
			swipeStartX = touch.clientX;
			swipeStartY = touch.clientY;
			swipeStartTime = currentTime;
		}
	}

	function handleTouchMove(event: TouchEvent) {
		if (event.touches.length === 2 && initialDistance && initialMaxWidth) {
			event.preventDefault();
			const newDistance = getDistance(event.touches);

			if (!isPinching) {
				const distanceChange = Math.abs(newDistance - initialDistance);
				const DEAD_ZONE = 20; // pixels
				if (distanceChange > DEAD_ZONE) {
					isPinching = true;
					if ($autozoomEnabled) {
						$autozoomEnabled = false;
						showToast('Manual zoom enabled');
					}
					// To avoid a jump, we should adjust the initial values
					initialDistance = newDistance;
					initialMaxWidth = $maxWidth;
				}
			}

			if (isPinching && initialMaxWidth !== null) {
				const scale = newDistance / initialDistance;
				let newMaxWidth = Math.round(initialMaxWidth * scale);
				newMaxWidth = Math.max(20, Math.min(95, newMaxWidth));
				$maxWidth = newMaxWidth;
			}
		}
	}

	function handleTouchEnd(event: TouchEvent) {
		const currentTime = Date.now();

		// Handle swipe gesture
		if (
			event.changedTouches.length === 1 &&
			swipeStartX !== null &&
			swipeStartY !== null &&
			swipeStartTime !== null
		) {
			const touch = event.changedTouches[0];
			const deltaX = touch.clientX - swipeStartX;
			const deltaY = touch.clientY - swipeStartY;
			const deltaTime = currentTime - swipeStartTime;

			const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
			const velocity = distance / deltaTime;

			// Detect horizontal swipe (minimum distance, speed, and horizontal dominance)
			if (distance > 50 && velocity > 0.3 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
				event.preventDefault();
				if (deltaX > 0) {
					// Swipe right - previous page
					previousPage();
				} else {
					// Swipe left - next page
					nextPage();
				}
			}
		}

		// Reset swipe tracking
		swipeStartX = null;
		swipeStartY = null;
		swipeStartTime = null;

		// Reset pinch tracking
		if (event.touches.length < 2) {
			initialDistance = null;
			initialMaxWidth = null;
			isPinching = false;
		}
	}

	$effect(() => {
		if (!hideControls) {
			tunes.forEach((tune) => {
				if (tune.div && tune.aspectRatio && !tune.widthCorrectionFactor) {
					const rect = tune.div.getBoundingClientRect();
					const currentAspectRatio = rect.width / rect.height;
					tune.widthCorrectionFactor = currentAspectRatio / tune.aspectRatio;
				}
			});
		}
	});

	$effect(() => {
		if ($autozoomEnabled) {
			if (hideControls || $maxWidth === null) {
				visible = new Array(tunes.length).fill(true);
				displayFrom = [0];
			}
		}
	});

	$effect(() => {
		if ($autozoomEnabled) {
			if (hideControls || $maxWidth === null) {
				fitToPage();
			} else {
				// If we're autozooming, we don't need to paginate manually
				untrack(updateMaxWidth);
				// But we still need to manually paginate if the maxWidth is set
				manuallyPaginate();
			}
		} else {
			manuallyPaginate();
		}
	});

	let autoZooming = false;
	$effect(() => {
		tunes;
		displayFrom = [0];
	});
	async function fitToPage() {
		if (!$autozoomEnabled || autoZooming || !BROWSER) {
			return;
		}
		if (!hideControls && $maxWidth !== null) {
			return manuallyPaginate();
		}
		for (const tune of tunes) {
			if (!tune.div) {
				return;
			}
			tune.updateBaseAspectRatio();
		}
		autoZooming = true;
		visible = new Array(tunes.length).fill(true);

		// Wait for the tunesContainer to have a height before calculating the best zoom level
		await new Promise<void>((resolve) => {
			let attempts = 0;
			const interval = setInterval(() => {
				if (tunesContainer && tunesContainer.clientHeight > 0) {
					clearInterval(interval);
					resolve();
				} else if (attempts > 10) {
					clearInterval(interval);
					resolve();
				}
				attempts++;
			}, 50);
		});

		updateMaxWidth();
		autoZooming = false;
	}

	function updateMaxWidth() {
		const availableWidth = tunesContainer?.clientWidth;
		const availableHeight = tunesContainerHeight || tunesContainer?.clientHeight;
		if (!availableWidth || !availableHeight) {
			autoZooming = false;
			return;
		}

		let bestMaxWidth = calculateMaximumWidth(tunes, availableWidth, availableHeight);
		bestMaxWidth = (bestMaxWidth * availableWidth) / innerWidth;
		$maxWidth = Math.floor(bestMaxWidth / 5) * 5;
	}

	function nextPage() {
		if (!visible[visible.length - 1]) {
			displayFrom = [...displayFrom, visible.lastIndexOf(true) + 1];
		}
	}

	function previousPage() {
		if (displayFrom.length > 1) {
			window.scrollBy(0, -25);
			displayFrom.pop();
		}
	}

	function onkeydown(event: KeyboardEvent) {
		if (event.target instanceof HTMLSelectElement) {
			return;
		} else if (['ArrowRight', 'PageDown', 'ArrowDown'].includes(event.key)) {
			nextPage();
		} else if (['ArrowLeft', 'PageUp', 'ArrowUp'].includes(event.key)) {
			previousPage();
		} else if (event.key === 'Escape') {
			hideControls = true;
		}
	}
</script>

<svelte:head>
	<title>{set?.name} | {folderName}</title>
</svelte:head>

{#if !preventWakelock}
	<drab-wakelock locked auto-lock></drab-wakelock>
{/if}
<svelte:window bind:innerHeight bind:innerWidth {onkeydown} />

<div class="page-container" class:notes-beside={$notesBeside && slotFilled && !$notesHidden}>
	<div class="controls-container">
		<span class="key-reminder"
			>Folder key: {ROOTS[(ROOTS.length + 3 - $globalTransposition) % ROOTS.length]}</span
		>
		<button
			class="toggle-controls"
			onclick={async () => {
				hideControls = !hideControls;
			}}>{hideControls ? 'Show' : 'Hide'} controls</button
		>
		<div id="controls" class:hidden={hideControls}>
			<button
				onclick={() => {
					$autozoomEnabled = false;
					$maxWidth! -= 5;
				}}
				disabled={$maxWidth! <= 20}>Zoom out</button
			>
			<button
				onclick={() => {
					$autozoomEnabled = false;
					$maxWidth! += 5;
				}}
				disabled={$maxWidth! >= 95}>Zoom in</button
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

	<div
		class="tunes"
		bind:this={tunesContainer}
		class:two-column={$maxWidth! <= 50}
		ontouchstart={handleTouchStart}
		ontouchmove={handleTouchMove}
		ontouchend={handleTouchEnd}
	>
		{#each tunes as tune, i}
			<div
				class="tune"
				class:hidden={!visible[i]}
				style="max-width: {$maxWidth}vw"
				class:loading={!$maxWidth}
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
				<div
					style="max-width: {($maxWidth || 0) *
						(!hideControls && tune.widthCorrectionFactor ? tune.widthCorrectionFactor : 1)}vw"
				>
					<Tune
						abc={applyClef($clef, stripUnwantedHeaders(tune.abc))}
						globalTransposition={$globalTransposition}
						tuneOffset={tune.offset}
						{fontFamily}
					/>
				</div>
			</div>
		{/each}
	</div>

	{#if !$notesHidden}
		<div class="notes-container">{@render children?.()}</div>
	{/if}
</div>

{#if displayFrom.length > 1}
	<button onclick={previousPage} class="page back" aria-label="Previous page">
		<div></div>
	</button>
{/if}
{#if !visible[visible.length - 1]}
	<button onclick={nextPage} class="page next" aria-label="Next page">
		<div></div>
	</button>
{/if}

{#if toastVisible}
	<div class="toast">{toastMessage}</div>
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
		max-width: 100svw;
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
	.loading {
		display: none;
	}

	.toast {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		background: rgba(0, 0, 0, 0.8);
		color: white;
		padding: 0.8rem 1.2rem;
		border-radius: 0.5rem;
		font-size: 1rem;
		z-index: 1000;
		pointer-events: none;
		animation: fadeInOut 2s ease-in-out;
	}

	@keyframes fadeInOut {
		0% {
			opacity: 0;
			transform: translate(-50%, -50%) scale(0.8);
		}
		20% {
			opacity: 1;
			transform: translate(-50%, -50%) scale(1);
		}
		80% {
			opacity: 1;
			transform: translate(-50%, -50%) scale(1);
		}
		100% {
			opacity: 0;
			transform: translate(-50%, -50%) scale(0.8);
		}
	}
</style>
