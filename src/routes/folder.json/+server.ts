import { json } from '@sveltejs/kit';
import { generateFolderFromLatex } from '$lib/server/folderGeneration.js';

export const prerender = true;

export function GET(): Promise<Response> {
	return generateFolderFromLatex('Demo folder', './data/folder.tex').then(json);
}
