<script lang="ts">
	import { browser } from '$app/environment';
	import { renderAbc } from 'abcjs';
	import KeySelect from '$lib/KeySelect.svelte';
	import Tune from '$lib/Tune.svelte';
	import { writable, type Writable } from 'svelte/store';
	import { keyedLocalStorageInt } from './keyedLocalStorage';
	import { tick } from 'svelte';

	let visualTranspose = 0;
	export let set;

	let innerHeight: number, innerWidth: number;
	$: orientation = innerHeight >= innerWidth ? 'portrait' : 'landscape';
	$: maxWidth = browser ? keyedLocalStorageInt(`${set.slug}_${orientation}_maxWidth`, 95) : writable(95);
	$: updateWidth(maxWidth);

	function updateWidth(maxWidth: Writable<number>) {
		maxWidth.subscribe(async () => {
			refreshVisibility++
		});
	}

	let visible = [...Array(set.content.length)];
	let displayFrom = [0];
	$: visible = displayFrom && visible;
	$: visible[displayFrom[displayFrom.length - 1]] =
		visible[displayFrom[displayFrom.length - 1]] || true;
	let refreshVisibility = 0;
	$: displayFrom && refreshVisibility++;

	for (let tune of set.content) {
		const abcDetails = (browser || null) && renderAbc('*', tune.abc, { visualTranspose })[0];
		tune.originalKey = abcDetails?.getKeySignature();
		tune.offset = writable(0);
	}
</script>

<svelte:window bind:innerHeight bind:innerWidth />

<button class="ml-60" on:click={() => $maxWidth -= 5} disabled={$maxWidth == 10}>Zoom out</button>
<button on:click={() => $maxWidth += 5} disabled={$maxWidth >= 95}>Zoom in</button>
<button on:click={() => $maxWidth = 95}>Reset zoom</button>{$maxWidth}%

<div class="notes">
	{#each set?.notes || [] as note}
		<p>{note}</p>
	{:else}
		<p>TODO notes</p>
	{/each}
</div>
<div class="flex flex-col mx-auto -mt-8" class:two-column={$maxWidth <= 50} style="max-width: {2 * $maxWidth + 20}%">
{#each set.content as tune, i}
	{#if i >= displayFrom[displayFrom.length - 1]}
		<div class="visible-{visible[i]} tune" style="max-width: {$maxWidth}%">
			{#if tune.originalKey}
				<!-- <KeySelect bind:transposition={visualTranspose} originalKey={tune.originalKey} /> -->
			{/if}
			<!-- <button on:click={() => tune.offset.update((offset) => offset - 12)}>Down an octave</button>
			<button on:click={() => tune.offset.update((offset) => offset + 12)}>Up an octave</button> -->
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
