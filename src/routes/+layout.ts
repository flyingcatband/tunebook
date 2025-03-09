import type { LoadEvent } from '@sveltejs/kit';
import type { Folder } from '$lib/types/index.js';

export const prerender = true;

export function load({ fetch }: LoadEvent): Promise<{ folder: Folder }> {
	return fetch('/folder.json')
		.then((res) => res.json())
		.then((folder) => ({
			folder
		}));
}
