<script lang="ts">
	import Incipit from "$lib/Incipit.svelte";

    export let data
    $: folder = data.folder;
    $: visibleSections = folder.content;
</script>

<h1>Welcome to Choonbook</h1>
<ul>
    {#each folder.content as section}
        <li>{section.name}</li>
    {/each}
</ul>

<div class="set-list">
{#each visibleSections as section}
    {#each section.content as set}
    <div class="set-incipit">
        <h2><a href="{set.slug}">{set.name}</a></h2>
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
</style>