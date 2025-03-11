import type { LoadEvent } from '@sveltejs/kit';
import type { MungedFolder } from './folder.json/+server';

export const prerender = true;

export function load({ fetch }: LoadEvent): Promise<{ folder: MungedFolder }> {
	return fetch('/folder.json')
		.then((r) => r.json())
		.then((folder) => ({
			folder
		}));
}
