import { BROWSER } from 'esm-env';
import { get, writable, type Writable } from 'svelte/store';

const stores = new Map<string, Writable<any>>();

export function keyedLocalStorage<T>(key: string, defaultValue: T): Writable<T> {
	if (!BROWSER) {
		return writable(defaultValue);
	}
	const existingStore = stores.get(key);
	if (existingStore) {
		return existingStore;
	} else {
		const rawValue = localStorage.getItem(key);
		const currentValue = rawValue ? JSON.parse(rawValue) : defaultValue;
		const store = writable(currentValue);
		const { subscribe, set, update } = store;
		const state = { updatedFromStorageEvent: false };

		subscribe((value) => {
			if (!state.updatedFromStorageEvent) localStorage.setItem(key, JSON.stringify(value));
		});

		window.addEventListener('storage', (e) => {
			if (key === e.key && e.newValue) {
				const newValue = JSON.parse(e.newValue);
				if (newValue != get(store)) {
					state.updatedFromStorageEvent = true;
					store.update(() => newValue);
					state.updatedFromStorageEvent = false;
				}
			}
		});

		stores.set(key, {
			subscribe,
			set,
			update
		});

		return {
			subscribe,
			set,
			update
		};
	}
}
