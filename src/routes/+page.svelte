<script lang="ts">
	import Incipit from '$lib/Incipit.svelte';

	export let data;
	$: folder = {
		...data.folder,
		content: data.folder.content.map((section) => ({ ...section, visible: true }))
	};
	$: visibleSections = folder.content.filter((f) => f.visible == true);
	function resetFilters() {
		folder.content.forEach((f) => (f.visible = true));
		folder.content = folder.content;
	}
</script>

<svelte:head>
	<title>Choonbook</title>
</svelte:head>

<h1>Welcome to Choonbook</h1>
<ul>
	{#each folder.content as section}
		<li><label><input bind:checked={section.visible} type="checkbox" />{section.name}</label></li>
	{/each}
	<li><button on:click={resetFilters}>Any type of tune</button></li>
</ul>

<div class="set-list">
	{#each visibleSections as section}
		{#each section.content as set}
			<div class="set-incipit">
				<h2><a href={set.slug}>{set.name}</a></h2>
				{#if set.notes.length}
					{#each set.notes as n}<p>{n}</p>{/each}
				{/if}
				{#each set.content as tune}
					<Incipit abc={tune.abc} />
				{/each}
			</div>
		{/each}
	{/each}
</div>

<style lang="postcss">
	.set-incipit {
		@apply ring-1 rounded-md;
		@apply w-80 py-4 px-2;
		@apply text-center;
	}
	.set-list {
		@apply flex flex-wrap gap-6 justify-evenly;
		@apply max-w-6xl mx-auto;
	}

	ul {
		@apply p-2;
	}
	input[type='checkbox'] {
		@apply mr-1;
	}
	li {
		@apply my-2;
	}
</style>
