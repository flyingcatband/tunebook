import type { LoadEvent } from '@sveltejs/kit';
import type { Folder } from '$lib/types/index.js';
import { base } from '$app/paths';

export const prerender = true;

export function load({ fetch }: LoadEvent): Promise<{ folder: Folder }> {
	return fetch(`${base}/folder.json`)
		.then((res) => res.json())
		.then((folder) => ({
			folder
		}));
}
