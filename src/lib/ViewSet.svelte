<script lang="ts">
	import { BROWSER } from 'esm-env';
	import { renderAbc, type KeySignature } from 'abcjs';
	import KeySelect from '$lib/KeySelect.svelte';
	import Tune from '$lib/Tune.svelte';
	import { writable, type Writable } from 'svelte/store';
	import { keyedLocalStorageInt } from './keyedLocalStorage.js';
	import { tick } from 'svelte';
	import type { Set, Tune as TuneTy } from './types/index.js';

	export let set: Set;

	type ExtraTuneProps = { div?: Element; originalKey?: KeySignature; offset: Writable<number> };

	let tunes: (TuneTy & ExtraTuneProps)[] = set.content.map((tune) => {
		const abcDetails = (BROWSER || null) && renderAbc('*', tune.abc)[0];
		return {
			...tune,
			originalKey: abcDetails?.getKeySignature(),
			offset: BROWSER ? keyedLocalStorageInt(`${set.slug}_${tune.slug}_offset`, 0) : writable(0)
		};
	});

	let visualTranspose = 0;
	let hideControls = true;

	let innerHeight: number, innerWidth: number;
	$: orientation = innerHeight >= innerWidth ? 'portrait' : 'landscape';
	$: maxWidth = BROWSER
		? keyedLocalStorageInt(`${set.slug}_${orientation}_maxWidth`, 95)
		: writable(95);
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
		zeroHeightIfOverflowing = true;
	});

	// $: innerHeight && innerWidth && fitToPage();

	let autoZooming = false;
	async function fitToPage() {
		if (autoZooming || !BROWSER) {
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
		$maxWidth = 95;
		await tick();

		// Zoom out until we can see all the tunes, and the entirety of the first tune
		// (First tune will always show, no matter whether it fits fully on the page,
		// subsequent tunes won't be visible until they fit)
		while (
			(visible.some((vis) => !vis) || div.getBoundingClientRect().bottom > innerHeight) &&
			$maxWidth > 10
		) {
			$maxWidth -= 1;
			await tick();
		}
		autoZooming = false;
	}

	$: {
		hideControls;
		orientation;
		fitToPage();
	}
</script>

<svelte:head>
	<title>{set?.name} | Choonbook</title>
</svelte:head>

<svelte:window bind:innerHeight bind:innerWidth />

<button class="toggle-controls" on:click={() => (hideControls = !hideControls)}
	>{hideControls ? 'Show' : 'Hide'} controls</button
>
<div id="controls" class:hidden={hideControls}>
	<button on:click={() => ($maxWidth -= 5)} disabled={$maxWidth == 10}>Zoom out</button>
	<button on:click={() => ($maxWidth += 5)} disabled={$maxWidth >= 95}>Zoom in</button>
	<button on:click={() => ($maxWidth = 95)}>Reset zoom</button>
	<button on:click={fitToPage}>Fit to page</button>
	<p>Current zoom level {$maxWidth}%</p>
	<div class="notes">
		{#each set?.notes || [] as note}
			<p>{note}</p>
		{/each}
	</div>
</div>

<div class="tunes" class:two-column={$maxWidth <= 50} style="max-width: {2 * $maxWidth + 20}%">
	{#each tunes as tune, i}
		{#if i >= displayFrom[displayFrom.length - 1]}
			<div
				class="visible-{visible[i]} tune"
				style="max-width: {$maxWidth}%"
				class:zeroHeightIfOverflowing
				bind:this={tune.div}
			>
				{#if tune.originalKey}
					<span class="inline-block" class:hidden={hideControls}>
						<KeySelect transposition={tune.offset} originalKey={tune.originalKey} /></span
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
					abc={tune.abc}
					{visualTranspose}
					tuneOffset={tune.offset}
					bind:visible={visible[i]}
					{refreshVisibility}
				/>
			</div>
		{/if}
	{/each}
</div>

<!-- {#if displayFrom.length > 1}
	<button
		on:click={() => {
			window.scrollBy(0, -25);
			displayFrom.pop();
			displayFrom = displayFrom;
		}}
		class="page back"><div /></button
	>{:else}<button disabled class="page back" />
{/if}
{#if !visible[visible.length - 1]}
	<button
		on:click={() => (displayFrom = [...displayFrom, visible.indexOf(false)])}
		class="page next"><div /></button
	>
{:else}
	<button class="page next" disabled />
{/if} -->

<style lang="postcss">
	.toggle-controls {
		@apply block mx-auto text-xl p-4 top-0;
	}
	div {
		@apply block;
	}
	#controls {
		@apply mx-auto;
	}
	.tunes {
		@apply flex flex-col;
	}
	.two-column {
		@apply flex-wrap mx-auto;
		/* TODO replace the following with something that works as part of #10 */
		max-height: 95svh;
	}
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
	.hideOverflow.visible-false {
		height: 0;
	}
	.tune {
		@apply mx-auto w-[90%];
	}

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
</style>
