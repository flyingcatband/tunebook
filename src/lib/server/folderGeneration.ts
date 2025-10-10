import { readFile } from 'fs/promises';
import path from 'path';
import slugify from 'slugify';
import type { Folder, Section, Set, NextPreviousSlugs } from '$lib/types/index.js';

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
		if (!line.trim().startsWith('%')) {
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
					name: replaceTexEscapes(subsectionName),
					content: [],
					notes: [],
					slug: slugify(subsectionName.replaceAll('/', ' '), { strict: true }),
					tags: []
				};
				lastSeen = 'set';
				assertExists(currentSection, 'currentSection').content.push(currentSet);
			}
			if (abcFilename) {
				const abc = (await readFile(`${rootDirectory}/${abcFilename}.abc`)).toString();
				lastSeen = 'tune';
				const set = assertExists(currentSet, 'currentSet');
				set.content.push({
					abc,
					filename: abcFilename,
					slug: slugify(abcFilename.replaceAll('/', ' '), { strict: true })
				});
				addTagsFrom(abc, set.tags);
			}
			if (!line.trim().startsWith('\\') && lastSeen == 'set') {
				assertExists(currentSet, 'currentSet').notes.push(line.replace('\\\\', ''));
			}
		}
	}

	return folder;
}

export function addNextPreviousSlugs<S extends Set>(
	folder: Folder<S>
): Folder<S & NextPreviousSlugs> {
	const allSets = folder.content.flatMap((section) => section.content);
	return {
		...folder,
		content: folder.content.map((section) => ({
			name: section.name,
			content: section.content.map((set) => {
				const index = allSets.findIndex((s) => s.slug == set.slug);
				return {
					...set,
					nextSlug: allSets.at((index + 1) % allSets.length)!.slug,
					previousSlug: allSets.at(index - 1)!.slug
				};
			})
		}))
	};
}

function addTagsFrom(abc: string, tags: string[]) {
	for (const tag of extractTags(abc)) {
		if (!tags.includes(tag)) {
			tags.push(tag);
		}
	}
}

/** Extract the tags from the `G` fields in the abc string */
export function extractTags(abc: string): string[] {
	const results = [];
	for (const line of abc.split('\n')) {
		if (line.startsWith('G:') && !line.startsWith('G:|')) {
			const tag = line.slice(2).trim();
			results.push(tag);
		}
	}
	return results;
}

export async function generateFolderFromMultiSetAbcFile(
	folderName: string,
	abcPath: string
): Promise<Folder> {
	const abc = (await readFile(abcPath)).toString();
	return generateFolderFromMultiSetAbcString(folderName, abc);
}

function generateFolderFromMultiSetAbcString(
	folderName: string,
	abc: string,
	options?: { per_tune_fields?: string[] }
): Folder {
	const perTuneFields = options?.per_tune_fields || ['W', 'w'];
	const lines = abc.split('\n');
	let lineNumber = 0;

	const folder: Folder = {
		name: folderName,
		content: []
	};

	const inheritableHeaders = new Map<string, string>();
	let currentSection: Section | undefined;
	let currentSet: Set | undefined;
	let currentTuneTitle = '';
	let currentTuneContent: string[] = [];
	let currentTuneHeaders = new Map<string, string>();
	let tuneNumber = 1;
	let isInFirstSetTitle = false;
	const sectionsOrder: string[] = [];
	let composerValidations: string[] = [];
	let inTuneBody = false; // true when we've started collecting tune body content

	const createSlug = (name: string): string => {
		return slugify(name, { strict: true });
	};

	const commitTuneHeaders = () => {
		if (!inTuneBody && currentTuneTitle) {
			// We're about to start the tune body, so commit the headers in the specified order
			const orderedHeaders: string[] = [];

			// Merge inherited headers with tune-specific headers (tune-specific take precedence)
			const finalHeaders = new Map(inheritableHeaders);
			for (const [key, value] of currentTuneHeaders) {
				finalHeaders.set(key, value);
			}

			// Check if there's a composer validation for this tune
			let tuneComposer: string | undefined;
			for (const validation of composerValidations) {
				const composerMatch = validation.match(/^(.*?)\s*\(([^)]+)\)$/);
				if (composerMatch) {
					const [, composer, tuneTitle] = composerMatch;
					if (createSlug(tuneTitle) === createSlug(currentTuneTitle)) {
						tuneComposer = composer.trim();
						break;
					}
				}
			}

			// Standard header order: X:, T:, C:, M:, L:, K:, followed by others
			orderedHeaders.push(`X:${tuneNumber++}`);
			orderedHeaders.push(`T:${currentTuneTitle}`);

			// Add headers in specified order
			const headerOrder = ['C', 'M', 'L', 'K'];
			for (const headerKey of headerOrder) {
				if (finalHeaders.has(headerKey)) {
					if (headerKey === 'C' && tuneComposer) {
						orderedHeaders.push(`C:${tuneComposer}`);
					} else {
						orderedHeaders.push(`${headerKey}:${finalHeaders.get(headerKey)}`);
					}
				}
			}

			// Add any other headers not in the standard order
			for (const [key, value] of finalHeaders) {
				if (!['X', 'T', 'C', 'M', 'L', 'K'].includes(key)) {
					orderedHeaders.push(`${key}:${value}`);
				}
			}

			if (tuneComposer && !finalHeaders.has('C')) {
				orderedHeaders.push(`C:${tuneComposer}`);
			}

			// Add the committed headers to tune content
			currentTuneContent.unshift(...orderedHeaders);
			inTuneBody = true;
		}
	};

	const addTune = () => {
		if (!currentSet || !currentTuneTitle) return;

		// Clean up any inheritable headers that appear after the tune body is complete
		// (trim from the end while we have inheritable header patterns)
		while (currentTuneContent.length > 0) {
			const lastLine = currentTuneContent[currentTuneContent.length - 1];
			const headerMatch = lastLine.match(/^([A-Za-z]):/);
			if (headerMatch && !perTuneFields.includes(headerMatch[1])) {
				// This is an inheritable header at the end, remove it
				currentTuneContent.pop();
			} else {
				break;
			}
		}

		const abc = currentTuneContent.join('\n');

		currentSet.content.push({
			filename: '',
			slug: createSlug(currentTuneTitle),
			abc: abc.trim()
		});

		addTagsFrom(abc, currentSet.tags);
	};

	const processHeader = (line: string) => {
		const match = line.match(/^([A-Za-z]):(.*)$/);
		if (!match) return false;

		const [, field, value] = match;
		const cleanValue = value.trim();

		if (field === 'P') return true;

		if (field === 'C' && cleanValue.includes('(') && cleanValue.includes(')')) {
			const composerMatch = cleanValue.match(/^(.*?)\s*\(([^)]+)\)$/);
			if (composerMatch) {
				composerValidations.push(cleanValue);
				// Don't set this as inheritable, let it be processed per-tune
				return true;
			}
		}

		if (perTuneFields.includes(field)) {
			// Per-tune fields are never inherited, but should be included in current tune
			if (currentTuneTitle && !inTuneBody) {
				// We're in header collection phase for current tune
				currentTuneHeaders.set(field, cleanValue);
			} else if (currentTuneTitle && inTuneBody) {
				// We're in tune body, copy header verbatim (but don't update inheritance)
				currentTuneContent.push(line);
			}
			// If not in a tune, ignore per-tune fields completely
		} else {
			// Regular inheritable fields
			if (currentTuneTitle && !inTuneBody) {
				// We're in header collection phase for current tune
				currentTuneHeaders.set(field, cleanValue);
			} else if (currentTuneTitle && inTuneBody) {
				// We're in tune body, copy header verbatim and update inheritance
				currentTuneContent.push(line);
				inheritableHeaders.set(field, cleanValue);
			} else {
				// We're not in a tune, so this is an inheritable header
				inheritableHeaders.set(field, cleanValue);
			}
		}

		return true;
	};

	for (const line of lines) {
		lineNumber++;

		if (line.trim() === '' || line.startsWith('%') || line.startsWith('%%abc')) continue;

		const xMatch = line.match(/^X:\s*(\d+)/);
		if (xMatch) {
			if (currentTuneTitle) {
				addTune();
				currentTuneTitle = '';
				currentTuneContent = [];
			}
			isInFirstSetTitle = true;
			continue;
		}

		const tMatch = line.match(/^T:\s*(.+)$/);
		if (tMatch && isInFirstSetTitle) {
			const title = tMatch[1].trim();

			// Try the original parsing logic first for backwards compatibility
			let sectionName = title.match(/(.+) [1-9][0-9a-d]? +- /)?.[1];
			if (!sectionName) {
				sectionName = title.match(/(.+) +- /)?.[1];
			}

			if (!sectionName) {
				throw new Error(
					`Invalid set title format at line ${lineNumber}: "${title}". Expected "Section Name - Set Name"`
				);
			}

			if (
				sectionsOrder.includes(sectionName) &&
				sectionsOrder[sectionsOrder.length - 1] !== sectionName
			) {
				throw new Error(`Non-contiguous sections: "${sectionName}" appears out of order`);
			}

			if (!sectionsOrder.includes(sectionName)) {
				sectionsOrder.push(sectionName);
				currentSection = {
					name: sectionName,
					content: []
				};
				folder.content.push(currentSection);
			} else if (currentSection?.name !== sectionName) {
				currentSection = folder.content.find((s) => s.name === sectionName);
			}

			// Validate any pending composer references from previous set
			if (currentSet && composerValidations.length > 0) {
				for (const validation of composerValidations) {
					const composerMatch = validation.match(/^(.*?)\s*\(([^)]+)\)$/);
					if (composerMatch) {
						const [, , tuneTitle] = composerMatch;
						if (!currentSet.content.some((tune) => tune.slug === createSlug(tuneTitle))) {
							throw new Error(
								`Invalid composer reference: tune "${tuneTitle}" not found in current set`
							);
						}
					}
				}
				composerValidations = [];
			}

			currentSet = {
				name: title,
				slug: createSlug(title),
				notes: [],
				content: [],
				tags: []
			};
			if (currentSection) {
				currentSection.content.push(currentSet);
			}
			isInFirstSetTitle = false;
			continue;
		}

		if (tMatch && !isInFirstSetTitle) {
			if (currentTuneTitle) {
				addTune();
			}
			currentTuneTitle = tMatch[1].trim();
			currentTuneContent = [];
			currentTuneHeaders = new Map();
			inTuneBody = false;
			continue;
		}

		if (processHeader(line)) {
			continue;
		}

		if (!currentSet && line.match(/^[A-Za-z]:/)) {
			throw new Error(`Headers not allowed before first X: field at line ${lineNumber}`);
		}

		if (currentTuneTitle) {
			// This is a non-header line, so commit headers if not already done
			commitTuneHeaders();
			currentTuneContent.push(line);
		}
	}

	if (currentTuneTitle) {
		addTune();
	}

	// Validate any remaining composer references at the end
	if (currentSet && composerValidations.length > 0) {
		for (const validation of composerValidations) {
			const composerMatch = validation.match(/^(.*?)\s*\(([^)]+)\)$/);
			if (composerMatch) {
				const [, , tuneTitle] = composerMatch;
				if (!currentSet.content.some((tune) => tune.slug === createSlug(tuneTitle))) {
					throw new Error(
						`Invalid composer reference: tune "${tuneTitle}" not found in current set`
					);
				}
			}
		}
	}

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

if (import.meta.vitest) {
	const { describe, it, expect } = import.meta.vitest;

	describe('extractTags', () => {
		const sut = extractTags;
		it('returns no tags when no G fields are present', () => {
			const abc = `X:1\nT:A set\n%...`;
			expect(sut(abc)).toEqual([]);
		});

		it('pulls out single tag', () => {
			const abc = `X:1\nG: test\nT:A set\n%...`;
			expect(sut(abc)).toEqual(['test']);
		});

		it('pulls out tags in multiple G fields', () => {
			const abc = `X:1\nG: test\nG: test2\nT:A set\n%...`;
			expect(sut(abc)).toEqual(['test', 'test2']);
		});

		it('pulls out tag with no leading space', () => {
			const abc = `X:1\nG:test\nT:A set\n%...`;
			expect(sut(abc)).toEqual(['test']);
		});

		it('ignores tune lines', () => {
			const abc = `X:1\nT:A set\nABcd|ef\nG:|`;
			expect(sut(abc)).toEqual([]);
		});

		it('pulls out tag containing a forward-slash', () => {
			const abc = `X:1\nG:James/happy\nT:A set\n%...`;
			expect(sut(abc)).toEqual(['James/happy']);
		});
	});

	describe('addTagsFrom', () => {
		const sut = (abc: string, tags: string[]): string[] => {
			addTagsFrom(abc, tags);
			return tags;
		};

		it('does not add tags if they are already set', () => {
			expect(sut(`X:1\nG:tag\nT:A tune`, ['tag'])).toEqual(['tag']);
		});
	});

	describe('generateFolderFromMultiSetAbcString', () => {
		const sut = generateFolderFromMultiSetAbcString;

		it('extracts tags from set-level headers', () => {
			const abc = `X:1\nT:Jigs 1 - Som jigs\nG:Show set\nP:A\nT:A tune\n% ...\nabcdef\nX:2`;

			const folder = sut('Test folder', abc);

			expect(folder.content[0].content[0].tags).toEqual(['Show set']);
		});

		it('applies global key to first tune', () => {
			const abc = `X:1\nT:Jigs 1 - Som jigs\nK:G\nP:A\nT:A tune\n% ...\nabcdef\nX:2`;

			const folder = sut('Test folder', abc);

			expect(folder.content[0].content[0].content[0].abc).toContain('K:G');
		});

		it('applies tune-specific key to first tune', () => {
			const abc = `X:1\nT:Jigs 1 - Som jigs\nP:A\nT:A tune\nK:G\n% ...\nabcdef\nX:2`;

			const folder = sut('Test folder', abc);

			expect(folder.content[0].content[0].content[0].abc).toContain('K:G');
		});

		it('does not override tune specific key with global key', () => {
			const abc = `X:1\nT:Jigs 1 - Som jigs\nK:G\nP:A\nT:A tune\nK:A\n% ...\nabcdef\nX:2`;

			const folder = sut('Test folder', abc);

			expect(folder.content[0].content[0].content[0].abc).not.toContain('K:G');
		});

		it('extracts tags from tune-level headers', () => {
			const abc = `X:1\nT:Jigs 1 - Som jigs\nP:A\nT:A tune\nG:English\n% ...\nabcdef\nX:2`;

			const folder = sut('Test folder', abc);

			expect(folder.content[0].content[0].tags).toEqual(['English']);
		});

		it('processes composer field with tune title reference', () => {
			const abc = `X:1\nT:Jigs 1 - Som jigs\nC:Traditional (The High Reel)\nT:A tune\n% ...\nabcdef\nT:The High Reel\n% ...\nabcdef`;

			const folder = sut('Test folder', abc);

			expect(folder.content[0].content[0].content[1].abc).toContain('C:Traditional');
			expect(folder.content[0].content[0].content[0].abc).not.toContain('C:Traditional');
		});

		it('throws error for invalid composer tune reference', () => {
			const abc = `X:1\nT:Jigs 1 - Som jigs\nC:Traditional (Nonexistent Tune)\nT:A tune\n% ...\nabcdef`;

			expect(() => sut('Test folder', abc)).toThrow(
				'Invalid composer reference: tune "Nonexistent Tune" not found in current set'
			);
		});

		it('processes multiple composer fields with different tune references', () => {
			const abc = `X:1\nT:Jigs 1 - Som jigs\nC:O'Neill (First Tune)\nC:Traditional (Second Tune)\nT:First Tune\n% ...\nabcdef\nT:Second Tune\n% ...\nabcdef`;

			const folder = sut('Test folder', abc);

			expect(folder.content[0].content[0].content[0].abc).toContain("C:O'Neill");
			expect(folder.content[0].content[0].content[1].abc).toContain('C:Traditional');
			expect(folder.content[0].content[0].content[0].abc).not.toContain('C:Traditional');
			expect(folder.content[0].content[0].content[1].abc).not.toContain("C:O'Neill");
		});

		it('applies different time signatures to tunes based on header order', () => {
			const abc = `X:1\nT:Odd sets 1 - Mixed time\nM:6/8\nT:First Tune\n% ...\nabcdef\nM:4/4\nT:Second Tune\n% ...\nabcdef\nT:Third Tune\n% ...\nabcdef`;

			const folder = sut('Test folder', abc);

			expect(folder.content[0].content[0].content[0].abc).toContain('M:6/8');
			expect(folder.content[0].content[0].content[1].abc).toContain('M:4/4');
			expect(folder.content[0].content[0].content[2].abc).toContain('M:4/4');
			expect(folder.content[0].content[0].content[0].abc).not.toContain('M:4/4');
			expect(folder.content[0].content[0].content[1].abc).not.toContain('M:6/8');
		});

		it('handles time signature change within tune body', () => {
			const abc = `X:1\nT:Complex tunes 1 - Mixed internal time\nM:4/4\nT:Changing Tune\nABCD|EFGH|\nM:6/8\nijk|lmn|\nT:Next Tune\nopqr|`;

			const folder = sut('Test folder', abc);

			// First tune should have both time signatures in its body
			const firstTuneAbc = folder.content[0].content[0].content[0].abc;
			expect(firstTuneAbc).toContain('M:4/4');
			expect(firstTuneAbc).toContain('M:6/8');
			// The M:6/8 should appear in the middle of the tune content between music lines
			expect(firstTuneAbc).toContain('ABCD|EFGH|\nM:6/8\nijk|lmn|');
			// Second tune should inherit the last time signature (6/8)
			expect(folder.content[0].content[0].content[1].abc).toContain('M:6/8');
			expect(folder.content[0].content[0].content[1].abc).not.toContain('M:4/4');
		});

		it('does not inherit default per-tune fields (W and w)', () => {
			const abc = `X:1\nT:Songs 1 - With lyrics\nT:First Song\nW:First verse line\nABCD|EFGH|\nw:first note syllables\nT:Second Song\nIJKL|MNOP|`;

			const folder = sut('Test folder', abc);

			// First tune should have the W and w fields
			expect(folder.content[0].content[0].content[0].abc).toContain('W:First verse line');
			expect(folder.content[0].content[0].content[0].abc).toContain('w:first note syllables');
			// Second tune should NOT inherit these fields
			expect(folder.content[0].content[0].content[1].abc).not.toContain('W:First verse line');
			expect(folder.content[0].content[0].content[1].abc).not.toContain('w:first note syllables');
		});
	});

	describe('addNextPreviousSlugs', () => {
		const sut = addNextPreviousSlugs;

		it('adds next and previous slugs to sets', () => {
			const abc = `X:1\nT:Jigs 1 - Som jigs\nG:Show set\nP:A\nT:A tune\n% ...\nabcdef\nX:2\nT: Jigs 2 - test\nP:A\nT:Another tune\n% ...\nabcdef\nX:3\nT: Jigs 3 - mor choon\nP:A\nT:Yet another tune\n% ...\nabcdef`;
			const folder = generateFolderFromMultiSetAbcString('Test folder', abc);

			const result = sut(folder);

			expect(result.content[0].content[1].nextSlug).toEqual('Jigs-3-mor-choon');
			expect(result.content[0].content[1].previousSlug).toEqual('Jigs-1-Som-jigs');
		});

		it('previous set for first tune wraps to end', () => {
			const abc = `X:1\nT:Jigs 1 - Som jigs\nG:Show set\nP:A\nT:A tune\n% ...\nabcdef\nX:2\nT: Jigs 2 - test\nP:A\nT:Another tune\n% ...\nabcdef\nX:3\nT: Jigs 3 - mor choon\nP:A\nT:Yet another tune\n% ...\nabcdef`;
			const folder = generateFolderFromMultiSetAbcString('Test folder', abc);

			const result = sut(folder);

			expect(result.content[0].content[0].previousSlug).toEqual('Jigs-3-mor-choon');
		});

		it('next set for last tune wraps to start', () => {
			const abc = `X:1\nT:Jigs 1 - Som jigs\nG:Show set\nP:A\nT:A tune\n% ...\nabcdef\nX:2\nT: Jigs 2 - test\nP:A\nT:Another tune\n% ...\nabcdef\nX:3\nT: Jigs 3 - mor choon\nP:A\nT:Yet another tune\n% ...\nabcdef`;
			const folder = generateFolderFromMultiSetAbcString('Test folder', abc);

			const result = sut(folder);

			expect(result.content[0].content[2].nextSlug).toEqual('Jigs-1-Som-jigs');
		});

		it('crosses section boundaries', () => {
			const abc = `X:1\nT:Jigs 1 - Som jigs\nG:Show set\nP:A\nT:A tune\n% ...\nabcdef\nX:2\nT: Jigs 2 - test\nP:A\nT:Another tune\n% ...\nabcdef\nX:3\nT: Reels 3 - mor choon\nP:A\nT:Yet another tune\n% ...\nabcdef`;
			const folder = generateFolderFromMultiSetAbcString('Test folder', abc);

			const result = sut(folder);

			expect(result.content[1].content[0].nextSlug).toEqual('Jigs-1-Som-jigs');
			expect(result.content[1].content[0].previousSlug).toEqual('Jigs-2-test');
			expect(result.content[0].content[1].nextSlug).toEqual('Reels-3-mor-choon');
		});
	});
}
