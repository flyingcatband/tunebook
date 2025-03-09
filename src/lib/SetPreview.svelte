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
		tuneFont = undefined,
		displayAbcFields = undefined,
		headingTy = 'h2'
	}: Props = $props();
</script>

<a href={basePath + set.slug}>
	<div class="set-preview">
		{#if set.name != undefined && headingTy}
			<svelte:element this={headingTy}>{set.name}</svelte:element>
		{/if}
		{#if set.tags.length}
			<ul class="tag-list">
				{#each set.tags as tag}
					<li class="tag">{tag}</li>
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

<style lang="postcss">
	.set-preview {
		@apply py-4 px-2;
		width: var(--set-preview-width, 20rem);
		@apply text-center;
		@apply box-border;
	}
	.tag-list {
		@apply flex gap-x-2 gap-y-1 justify-center;
	}
	.tag {
		@apply w-fit;
	}
</style>
