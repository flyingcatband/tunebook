<script lang="ts">
	import type { Writable } from 'svelte/store';
	import { calculateMaximumWidth, manuallyPaginate } from './fitting';
	import { keyedLocalStorage } from './keyedLocalStorage';
	import Tune from './Tune.svelte';
	import { type Clef, type Set, type Tune as TuneTy } from './types';
	import { onMount, type Snippet } from 'svelte';
	import abcjsPkg, { type KeySignature } from 'abcjs';
	import { BROWSER } from 'esm-env';
	import KeySelect from './KeySelect.svelte';
	const { renderAbc } = abcjsPkg;
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

	const MAX_WIDTH = 95;
	const MIN_WIDTH = 25;

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

	type ExtraTuneProps = {
		originalKey?: KeySignature;
		offset: Writable<number>;
		aspectRatio: number;
	};

	let tunes: (TuneTy & ExtraTuneProps)[] = $derived(
		(set?.content || []).map((tune) => {
			const abcDetails = (BROWSER || null) && renderAbc('*', tune.abc)[0];
			return {
				...tune,
				originalKey: abcDetails?.getKeySignature(),
				offset: keyedLocalStorage(`${settingsScope}${set?.slug}_${tune.slug}_offset`, 0),
				aspectRatio: 0
			};
		})
	);

	let tunesContainer: HTMLDivElement | undefined = $state();
	let containerWidth: number | undefined = $state();
	let containerHeight: number | undefined = $state();
	let hiddenTuneSlugs: string[] = $state([]);
	let globalTransposition = keyedLocalStorage(`globalTransposition`, 0);
	let controlsVisible = $state(false);
	let visibleTunes = $derived(
		controlsVisible ? tunes : tunes.filter((t) => !hiddenTuneSlugs.includes(t.slug))
	);
	let aspectRatioRecalculated = $state(0);
	let slotFilled = $derived(children !== undefined);
	let fitToPageWidth = $derived.by(() => {
		aspectRatioRecalculated; // Recalculate when this changes
		if (!containerWidth || !containerHeight) {
			return 0;
		} else {
			const idealWidth = calculateMaximumWidth(visibleTunes, containerWidth, containerHeight);
			const width = Math.floor(idealWidth / 5) * 5;
			return Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, width));
		}
	});

	function persistedLayoutVar<T>(name: string, defaultValue: T) {
		return keyedLocalStorage(`${settingsScope}${set?.slug}_${orientation}_${name}`, defaultValue);
	}

	let orientation = $derived(containerHeight! >= containerWidth! ? 'portrait' : 'landscape');
	let autozoomEnabled = $derived(persistedLayoutVar(`autozoom`, true));
	let manualWidth = $derived(persistedLayoutVar(`maxWidth`, 0));
	let width = $derived($autozoomEnabled ? fitToPageWidth : $manualWidth);
	let widthAdjustment = $derived(containerWidth && innerWidth ? containerWidth / innerWidth : 1);
	let currentPage = $state(0);
	let pages = $derived.by(() => {
		aspectRatioRecalculated; // Recalculate when this changes
		if ($autozoomEnabled) {
			// All tunes on one page
			return [{ start: 0, end: visibleTunes.length - 1 }];
		} else {
			return manuallyPaginate(visibleTunes, containerWidth, containerHeight, $manualWidth) || [];
		}
	});
	let currentPageTunes = $derived(
		pages?.[currentPage] && !$autozoomEnabled
			? visibleTunes.slice(pages[currentPage].start, pages[currentPage].end + 1)
			: visibleTunes
	);
	let globalClef: Writable<Clef> = keyedLocalStorage('globalClef', 'treble');
	let clef: Writable<Clef | 'global'> = $derived(
		keyedLocalStorage(`${settingsScope}${set?.slug}_clef`, 'global')
	);
	let notesBeside = $derived(persistedLayoutVar(`notesBeside`, false));
	let notesHidden = $derived(persistedLayoutVar(`notesHidden`, false));

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

	function toggleHidden(tune: Set['content'][number]) {
		if (hiddenTuneSlugs.includes(tune.slug)) {
			hiddenTuneSlugs = hiddenTuneSlugs.filter((slug) => tune.slug != slug);
		} else {
			hiddenTuneSlugs.push(tune.slug);
		}
	}

	function zoomIn() {
		const previousWidth = width || 25;
		$autozoomEnabled = false;
		$manualWidth = previousWidth + 5;
	}

	function zoomOut() {
		const currentVisibleTune = pages[currentPage]?.start || 0;
		const previousWidth = width || 25;
		$autozoomEnabled = false;
		$manualWidth = previousWidth - 5;
		// Ensure we stay on the same tune after zooming in
		for (let i = 0; i < pages.length; i++) {
			if (pages[i].start <= currentVisibleTune && pages[i].end >= currentVisibleTune) {
				currentPage = i;
				break;
			}
		}
	}

	function fitToPage() {
		$autozoomEnabled = true;
		currentPage = 0;
	}

	function nextPage() {
		if (currentPage + 1 < pages.length) {
			currentPage += 1;
		}
	}

	function previousPage() {
		if (currentPage > 0) {
			currentPage -= 1;
		}
	}

	$effect(() => {
		// Scroll to first page when using next/previous set buttons
		set;
		currentPage = 0;
	});

	onMount(() => {
		if (!customElements.get('drab-wakelock')) {
			import('drab/wakelock').then(({ WakeLock }) => {
				customElements.define('drab-wakelock', WakeLock);
			});
		}

		if (tunesContainer) {
			const observer = new ResizeObserver((entries) => {
				for (const entry of entries) {
					const { width, height } = entry.contentRect;
					containerWidth = width;
					containerHeight = height;
				}
			});
			observer.observe(tunesContainer);

			return () => {
				observer.disconnect();
			};
		}
	});

	// Gestures for zooming and page turning
	let initialDistance: number | null = null;
	let initialWidth: number | null = null;
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
				fitToPage();
				showToast('Fit to page enabled');
				return;
			}
			lastTapTime = currentTime;
			lastTapTouches = touches;

			// Pinch gesture setup
			initialDistance = getDistance(event.touches);
			initialWidth = width;
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
		if (event.touches.length === 2 && initialDistance && initialWidth) {
			event.preventDefault();
			const newDistance = getDistance(event.touches);

			if (!isPinching) {
				const distanceChange = Math.abs(newDistance - initialDistance);
				const DEAD_ZONE = 20; // pixels
				if (distanceChange > DEAD_ZONE) {
					isPinching = true;
					initialWidth = width;
					if ($autozoomEnabled) {
						$autozoomEnabled = false;
						showToast('Manual zoom enabled');
					}
					// To avoid a jump, we should adjust the initial values
					initialDistance = newDistance;
				}
			}

			if (isPinching && initialWidth !== null) {
				const scale = newDistance / initialDistance;
				let newManualWidth = Math.round(initialWidth * scale);
				newManualWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newManualWidth));
				$manualWidth = newManualWidth;
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
	}

	// Keyboard navigation (for page turner pedals)
	function onkeydown(event: KeyboardEvent) {
		if (event.target instanceof HTMLSelectElement) {
			return;
		} else if (['ArrowRight', 'PageDown', 'ArrowDown'].includes(event.key)) {
			nextPage();
		} else if (['ArrowLeft', 'PageUp', 'ArrowUp'].includes(event.key)) {
			previousPage();
		} else if (event.key === 'Escape') {
			controlsVisible = false;
		}
	}
</script>

{#if !preventWakelock}
	<drab-wakelock locked auto-lock></drab-wakelock>
{/if}
<svelte:window {onkeydown} />
<div class="page-container" class:notes-beside={$notesBeside && slotFilled && !$notesHidden}>
	<div class="controls" class:open={controlsVisible}>
		{#if controlsVisible}
			<span>Current zoom level {width}%</span>
			{#if !$autozoomEnabled}
				<button onclick={fitToPage}>Fit to page</button>
			{/if}
			<button onclick={zoomOut} disabled={width <= MIN_WIDTH} aria-label="Zoom out">-</button>
			<button onclick={zoomIn} disabled={width >= MAX_WIDTH} aria-label="Zoom in">+</button>
			<button onclick={() => ($notesBeside = !$notesBeside)}
				>Notes {$notesBeside ? 'below' : 'beside'}</button
			>
			<button onclick={() => ($notesHidden = !$notesHidden)}
				>{$notesHidden ? 'Show' : 'Hide'} notes</button
			>
		{/if}
		<button onclick={() => (controlsVisible = !controlsVisible)}
			>{controlsVisible ? 'Hide' : 'Show'} controls</button
		>
	</div>
	{#if currentPage > 0}
		<button onclick={previousPage} class="page back" aria-label="Previous page">
			<div></div>
		</button>
	{/if}
	{#if pages.length > currentPage + 1}
		<button onclick={nextPage} class="page next" aria-label="Next page">
			<div></div>
		</button>
	{/if}
	<div
		class="tunes"
		bind:this={tunesContainer}
		ontouchstart={handleTouchStart}
		ontouchmove={handleTouchMove}
		ontouchend={handleTouchEnd}
	>
		{#each currentPageTunes as tune (tune.slug)}
			{@const thisTuneHidden = hiddenTuneSlugs.includes(tune.slug)}
			<div class="tune" style="width: {width * widthAdjustment}vw" class:hidden={thisTuneHidden}>
				<Tune
					abc={applyClef($clef, stripUnwantedHeaders(tune.abc))}
					{fontFamily}
					tuneOffset={tune.offset}
					globalTransposition={$globalTransposition}
					onrerenderedAbc={(aspectRatio) => {
						tune.aspectRatio = aspectRatio;
						aspectRatioRecalculated++;
					}}
				/>
				{#if controlsVisible}
					{#if tune.originalKey}
						<span class="original-key">
							<KeySelect
								transposition={tune.offset}
								originalKey={tune.originalKey}
								tuneSlug={tune.slug}
							/>
						</span>
					{/if}
					{#if !hideCopyAbc}
						<button
							id={`copy-${tune.slug}`}
							class="copy-abc"
							style="bottom: 2.5em; left: 0; right: auto"
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
					<button style="bottom: 0.5em" onclick={() => toggleHidden(tune)}
						>{thisTuneHidden ? 'Show' : 'Hide'} tune</button
					>
				{/if}
			</div>
		{/each}
	</div>

	{#if !$notesHidden}
		<div class="notes-container">
			{@render children?.()}
		</div>
	{:else}
		<div class="spacer" style="height: 3em;"></div>
	{/if}
</div>

{#if toastVisible}
	<div class="toast">{toastMessage}</div>
{/if}

<style>
	.tune {
		position: relative;
		height: max-content;
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
	.spacer {
		grid-area: notes;
	}
	.page-container:not(.notes-beside) {
		grid-template-rows: 1fr auto;
		grid-template-columns: 1fr;
		grid-template-areas:
			'tunes'
			'notes';
	}

	.page-container.notes-beside {
		grid-template-columns: var(--notes-width, 33svw) 1fr;
		grid-template-rows: 1fr;
		grid-template-areas: 'notes tunes';
	}

	.original-key {
		position: absolute;
		bottom: 2.5rem;
		right: 0.5rem;
		background: white;
		padding: 0.1rem 0.3rem;
		border-radius: 0.3rem;
		font-size: 0.8rem;
		box-shadow: 0 0 5px rgba(0, 0, 0, 0.2);
	}
	.tune button {
		position: absolute;
		bottom: 0.5rem;
		left: 0;
		right: 0;
		width: auto;
	}
	.tune.hidden {
		opacity: 0.5;
	}
	.tunes {
		min-height: 100%;
		width: 100%;
		display: flex;
		flex-direction: column;
		flex-wrap: wrap;
		align-items: center;
	}
	.controls {
		position: absolute;
		right: 0rem;
		bottom: 0rem;
		z-index: 10;
		background: white;
		padding: 0.4rem;
	}
	.controls.open {
		box-shadow: 0 0 5px rgba(0, 0, 0, 0.2);
	}
	/* PAGE TURN BUTTONS */
	button.page {
		position: fixed;
		bottom: 0;
		height: 100%;
		width: min(15%, 10vw);
		border: none;
		background: none;
		z-index: 5;
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
