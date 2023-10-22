import { json } from '@sveltejs/kit';
import { generateFolderFromLatex } from '$lib/folderGeneration.js';

export const prerender = true;

export function GET(): Promise<Response> {
	return generateFolderFromLatex("Trip Hazard", "../cat-tunes/trip-hazard.tex").then(json)
}
