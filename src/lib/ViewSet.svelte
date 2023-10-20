<script lang="ts">
	import { browser } from '$app/environment';
	import { renderAbc } from 'abcjs';
	import KeySelect from '$lib/KeySelect.svelte';
	import Tune from '$lib/Tune.svelte';
	import { writable, type Writable } from 'svelte/store';
	import { keyedLocalStorageInt } from './keyedLocalStorage';
	import { tick } from 'svelte';
	import type { Set } from './types';

	export let set: Set & { content: { div?: Element }[] };

	let visualTranspose = 0;
	let hideControls = false;

	let innerHeight: number, innerWidth: number;
	$: orientation = innerHeight >= innerWidth ? 'portrait' : 'landscape';
	$: maxWidth = browser
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

	for (let tune of set.content) {
		const abcDetails = (browser || null) && renderAbc('*', tune.abc, { visualTranspose })[0];
		tune.originalKey = abcDetails?.getKeySignature();
		tune.offset = browser
			? keyedLocalStorageInt(`${set.slug}_${tune.slug}_offset`, 0)
			: writable(0);
		writable(0);
	}

	async function fitToPage() {
		// Show the first page
		displayFrom = [0];
		await tick();

		const div = set.content[0].div;
		if (typeof div === 'undefined') {
			alert();
			throw Error('div is undefined');
		}

		// Zoom in until we can no longer see all the tunes
		while (visible.every((vis) => vis) && $maxWidth < 95) {
			$maxWidth += 1;
			await tick();
		}

		let divRect = div.getBoundingClientRect();

		// Zoom out until we can see all the tunes, and the entirety of the first tune
		// (First tune will always show, no matter whether it fits fully on the page,
		// subsequent tunes won't be visible until they fit)
		while ((visible.some((vis) => !vis) || divRect.bottom > innerHeight) && $maxWidth > 10) {
			$maxWidth -= 1;
			await tick();
			divRect = div.getBoundingClientRect();
		}
	}

	let controlsVisible = false;
</script>

<svelte:head>
	<title>{set?.name} | Choonbook</title>
</svelte:head>

<svelte:window bind:innerHeight bind:innerWidth />

<div id="controls" class:hidden={hideControls}>
	<button class="ml-60" on:click={() => ($maxWidth -= 5)} disabled={$maxWidth == 10}
		>Zoom out</button
	>
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

<div
	class="flex flex-col mx-auto -mt-8"
	class:two-column={$maxWidth <= 50}
	style="max-width: {2 * $maxWidth + 20}%"
>
	{#each set.content as tune, i}
		{#if i >= displayFrom[displayFrom.length - 1]}
			<div
				class="visible-{visible[i]} tune"
				style="max-width: {$maxWidth}%"
				class:zeroHeightIfOverflowing
				bind:this={tune.div}
			>
				{#if tune.originalKey}
					<span class:hidden={hideControls}>
						<KeySelect transposition={tune.offset} originalKey={tune.originalKey} /></span
					>
				{/if}
				<button
					class:hidden={hideControls}
					on:click={() => tune.offset.update((offset) => offset - 12)}>Down an octave</button
				>
				<button
					class:hidden={hideControls}
					on:click={() => tune.offset.update((offset) => offset + 12)}>Up an octave</button
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
<button class="text-xl block p-4 mx-auto bottom-0" on:click={() => (hideControls = !hideControls)}
	>{hideControls ? 'Show' : 'Hide'} controls</button
>

{#if displayFrom.length > 1}
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
{/if}

<style lang="postcss">
	.two-column {
		@apply flex-wrap;
		max-height: 95svh;
	}
	.visible-null,
	.visible-false {
		visibility: hidden;
	}
	.visible-false {
		overflow: hidden;
	}
	.hideOverflow.visible-false {
		height: 0;
	}
	.tune {
		width: 90%;
		margin: auto;
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

	/* .notes {
		position: absolute;
		margin-left: 4.25em;
		margin-top: 0.25em;
	} */
	p {
		margin: 0;
		font-size: 0.8rem;
		text-align: left;
	}
	p:last-of-type {
		margin-bottom: 1em;
	}
</style>
