import type { LoadEvent } from '@sveltejs/kit';
import type { Folder, SetWithNextPrev } from '$lib/types/index.js';

export const prerender = true;

export function load({ fetch }: LoadEvent): Promise<{ folder: Folder<SetWithNextPrev> }> {
	return fetch('/folder.json')
		.then((r) => r.json())
		.then((folder) => ({
			folder
		}));
}
