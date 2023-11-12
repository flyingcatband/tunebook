export type Folder = {
	name: string;
	content: Section[];
};

export type Section = {
	name: string;
	content: Set[];
};

export type Set = {
	name?: string;
	slug: string;
	notes: string[];
	content: Tune[];
};

export type Tune = {
	filename: string;
	slug: string;
	abc: string;
};
