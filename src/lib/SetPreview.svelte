<script lang="ts">
	import Incipit from '$lib/Incipit.svelte';
	import type { Set } from '$lib/types/index.js';

	interface Props {
		/** The path to where your sets pages will be */
		basePath?: string;
		/** The set to show in the preview */
		set: Set;
		/** Should the set-level text notes be displayed? */
		showNotes?: boolean;
		/** Should the set-level tags be displayed? */
		showTags?: boolean;
		/** The font family to use for text rendered as part of the ABC */
		tuneFont?: string | undefined;
		/** A list of ABC headers to display, specified as a string (e.g. 'TCBN') */
		displayAbcFields?: string | undefined;
		/** The element to use for the heading. Set to undefined to hide the heading. */
		headingTy?: string | undefined;
	}

	let {
		basePath = '/',
		set,
		showNotes = true,
		showTags = true,
		tuneFont = undefined,
		displayAbcFields = undefined,
		headingTy = 'h2'
	}: Props = $props();
</script>

<a href={basePath + set.slug}>
	<div class="set-preview">
		{#if set.name != undefined && headingTy}
			<svelte:element this={headingTy} class="set-title">{set.name}</svelte:element>
		{/if}
		{#if showTags && set.tags.length}
			<ul class="tag-list">
				{#each set.tags as tag}
					<li class="tag" data-tag={tag}>{tag}</li>
				{/each}
			</ul>
		{/if}
		{#if showNotes && set.notes.length}
			{#each set.notes as n}<p>{n}</p>{/each}
		{/if}
		{#each set.content as tune}
			<Incipit abc={tune.abc} fontFamily={tuneFont} {displayAbcFields} />
		{/each}
	</div>
</a>

<style>
	a {
		text-decoration: none;
		color: inherit;
	}
	.set-preview {
		padding: 1rem;
		width: var(--set-preview-width, 20rem);
		text-align: center;
		box-sizing: border-box;
	}
	.tag-list {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.5rem;
		list-style-type: none;
		margin: 0.5rem 0;
		padding: 0;
	}
	.tag {
		width: fit-content;
	}
	.set-title {
		margin: 0.2em 0 0.5em;
	}
	p {
		margin: 0.2em 0;
	}
</style>
