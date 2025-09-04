<script lang="ts">
	import type { Writable } from 'svelte/store';
	import { calculateMaximumWidth, manuallyPaginate } from './fitting';
	import { keyedLocalStorage } from './keyedLocalStorage';
	import Tune from './Tune.svelte';
	import { type Set } from './types';
	import { onMount, type Snippet } from 'svelte';
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

	let tunesContainer: HTMLDivElement | undefined = $state();
	let containerWidth: number | undefined = $state();
	let containerHeight: number | undefined = $state();
	let hiddenTuneSlugs: string[] = $state([]);
	let controlsVisible = $state(true);
	let visibleTunes = $derived(
		controlsVisible ? set.content : set.content.filter((t) => !hiddenTuneSlugs.includes(t.slug))
	);
	let fitToPageWidth = $derived(
		calculateMaximumWidth(visibleTunes, containerWidth, containerHeight)
	);
	let orientation = $derived(containerHeight! >= containerWidth! ? 'portrait' : 'landscape');
	let autozoomEnabled = $derived(
		keyedLocalStorage(`${settingsScope}${set?.slug}_${orientation}_autozoom`, true)
	);
	let manualWidth: Writable<number | null> = $derived(
		keyedLocalStorage(`${settingsScope}${set?.slug}_${orientation}_maxWidth`, null)
	);
	let width = $derived($autozoomEnabled ? fitToPageWidth : $manualWidth);
	let currentPage = $state(0);
	let pages = $derived(
		manuallyPaginate(visibleTunes, containerWidth, containerHeight, $manualWidth) || []
	);
	let currentPageTunes = $derived(
		pages?.[currentPage] && !$autozoomEnabled
			? visibleTunes.slice(pages[currentPage].start, pages[currentPage].end + 1)
			: visibleTunes
	);

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
		// TODO consider trying to preserve which page is current
	}

	function zoomOut() {
		const previousWidth = width || 25;
		$autozoomEnabled = false;
		$manualWidth = previousWidth - 5;
		// TODO consider trying to preserve which page is current
	}

	function fitToPage() {
		$autozoomEnabled = true;
		currentPage = 0;
	}

	function nextPage() {
		currentPage += 1;
	}

	function previousPage() {
		currentPage -= 1;
	}

	onMount(() => {
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

	$effect.pre(() => {
		set.content.forEach((tune) => {
			if (!tune.aspectRatio) {
				const localStorageValue = localStorage.getItem(
					`tune-aspect-ratio-${settingsScope}-${set.slug}-${tune.slug}`
				);
				tune.aspectRatio = parseFloat(localStorageValue || '0');
			}
		});
	});

	$effect(() => {
		set.content.forEach((tune) => {
			if (tune.aspectRatio) {
				localStorage.setItem(
					`tune-aspect-ratio-${settingsScope}-${set.slug}-${tune.slug}`,
					tune.aspectRatio.toString()
				);
			}
		});
	});
</script>

<div class="controls">
	{#if controlsVisible}
		<button onclick={zoomOut} disabled={width <= MIN_WIDTH}>-</button>
		<button onclick={zoomIn} disabled={width >= MAX_WIDTH}>+</button>
		<button onclick={fitToPage}>Fit to page</button>
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
<div class="tunes" bind:this={tunesContainer}>
	{#each currentPageTunes as tune (tune.slug)}
		{@const thisTuneHidden = hiddenTuneSlugs.includes(tune.slug)}
		<div class="tune" style="width: {width}vw" class:hidden={thisTuneHidden}>
			<Tune
				abc={tune.abc}
				{fontFamily}
				tuneOffset={tune.offset}
				bind:aspectRatio={tune.aspectRatio}
			/>
			{#if controlsVisible}
				<button style="bottom: 0.5em" onclick={() => toggleHidden(tune)}
					>{thisTuneHidden ? 'Show' : 'Hide'} tune</button
				>
			{/if}
		</div>
	{/each}
</div>

<style>
	.tune {
		position: relative;
		height: max-content;
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
		margin-top: 2rem;
		height: calc(100dvh - 2rem);
		width: 100dvw;
		max-width: 100dvw;
		display: flex;
		flex-direction: column;
		flex-wrap: wrap;
		align-items: center;
	}
	.controls {
		position: absolute;
		right: 0.5rem;
		top: 0.5rem;
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
</style>
