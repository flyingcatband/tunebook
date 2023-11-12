import { readFile } from 'fs/promises';
import path from 'path';
import slugify from 'slugify';
import type { Folder, Section, Set } from '$lib/types/index.js';

export async function generateFolderFromLatex(
	folderName: string,
	latexPath: string
): Promise<Folder> {
	const tex = await readFile(latexPath);
	const rootDirectory = path.dirname(latexPath);
	const folder: Folder = {
		name: folderName,
		content: []
	};

	let currentSection: Section | undefined = undefined;
	let currentSet: Set | undefined = undefined;
	let lastSeen: null | 'section' | 'set' | 'tune' = null;

	for (const line of tex.toString().split('\n')) {
		const sectionName = line.match(/\\section\{(.*)\}/)?.[1];
		const subsectionName = line.match(/\\subsection\{(.*)\}/)?.[1];
		const abcFilename = line.match(/\\abcinput\{(.*)\}/)?.[1];
		if (sectionName) {
			currentSection = { name: replaceTexEscapes(sectionName), content: [] };
			lastSeen = 'section';
			folder.content.push(currentSection);
		}
		if (subsectionName) {
			currentSet = {
				content: [],
				notes: [],
				slug: slugify(subsectionName.replaceAll('/', ' '), { strict: true })
			};
			lastSeen = 'set';
			assertExists(currentSection, 'currentSection').content.push(currentSet);
		}
		if (abcFilename) {
			const abc = (await readFile(`${rootDirectory}/${abcFilename}.abc`)).toString();
			lastSeen = 'tune';
			assertExists(currentSet, 'currentSet').content.push({
				abc,
				filename: abcFilename,
				slug: slugify(abcFilename.replaceAll('/', ' '), { strict: true })
			});
		}

		if (!line.trim().startsWith('\\') && lastSeen == 'set') {
			assertExists(currentSet, 'currentSet').notes.push(line.replace('\\\\', ''));
		}
	}

	return folder;
}

export async function generateFolderFromMultiSetAbcFile(
	folderName: string,
	abcPath: string
): Promise<Folder> {
	const folder: Folder = {
		name: folderName,
		content: []
	};

	const abc = (await readFile(abcPath)).toString();
	let sharedHeaders: string[] = [];
	let currentAbc = '';
	let setTitle: string | undefined = undefined;
	let currentSection: Section | undefined;
	let currentSet: Set | undefined = undefined;

	const pushCurrentTune = () => {
		if (!currentSet) throw Error('Not currently in a set');
		if (currentSet?.content.length === 0 && setTitle) {
			currentSet.content.push({
				filename: '',
				slug: slugify(setTitle, { strict: true }),
				abc: ''
			});
		}
		currentSet.content[currentSet?.content.length - 1].abc =
			`X:1` + sharedHeaders.join('\n') + `\n` + currentAbc;
	};

	for (const line of abc.split('\n')) {
		if (line.match(/X: *[0-9]+/)) {
			if (currentAbc && setTitle) {
				pushCurrentTune();
			}
			setTitle = undefined;
			sharedHeaders = [];
		}

		const abcTitle = line.match(/T: *(.+)/)?.[1];
		if (setTitle == null && abcTitle) {
			setTitle = abcTitle;
			let sectionTitle = setTitle.match(/(.+) [1-9][0-9a-d]? +- /)?.[1];
			if (!sectionTitle) {
				sectionTitle = setTitle.match(/(.+) +- /)?.[1];
			}
			if (!sectionTitle) {
				throw new Error(`Couldn't infer section title from "${setTitle}"`);
			}
			if (currentSection?.name != sectionTitle) {
				folder.content.push({
					name: sectionTitle,
					content: []
				});

				currentSection = folder.content[folder.content.length - 1];
			}
			currentSection.content.push({
				name: abcTitle,
				slug: slugify(abcTitle, { strict: true }),
				notes: [],
				content: []
			});
			currentSet = currentSection.content[currentSection.content.length - 1];
			currentAbc = '';
		} else if (abcTitle) {
			if (!currentSet) throw Error('Not currently in a set');
			if (currentSet.content.length > 0) {
				pushCurrentTune();
			}
			currentAbc = '';
			currentSet.content.push({
				filename: '',
				slug: slugify(abcTitle, { strict: true }),
				abc: ''
			});
		}

		const setComment = line.match(/%%text +(.*)/)?.[1].trim();
		if (setComment && currentSet?.content.length == 0) {
			currentSet?.notes.push(setComment);
		}

		if (currentSet?.content.length == 0) {
			if (line.match(/[LMR]:.*/)) {
				sharedHeaders.push(line);
			}
		} else if (!line.match(/P: *[A-Z]/) && line.trim()) {
			currentAbc += line;
			currentAbc += '\n';
		}
	}

	pushCurrentTune();

	return folder;
}

function replaceTexEscapes(input: string): string {
	return input.replaceAll('---', '\u2014');
}

function assertExists<T>(value: T | undefined, name: string): T {
	// TODO cope with tunes not in sets (#18)
	if (typeof value === 'undefined') {
		throw Error(`${name} does not exist, is your LaTeX in a sensible order`);
	} else {
		return value;
	}
}
