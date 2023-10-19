if (!String.prototype.matchAll) {
	class ArrayIter {
		constructor(arr) {
			this.arr = arr;
			this.idx = 0;
		}
		next() {
			if (this.idx < this.arr.length) {
				return this.arr[this.idx++];
			}
		}
	}

	String.prototype.matchAll = function (rx) {
		if (typeof rx === 'string') rx = new RegExp(rx, 'g'); // coerce a string to be a global regex
		rx = new RegExp(rx); // Clone the regex so we don't update the last index on the regex they pass us
		let cap = []; // the single capture
		let all = []; // all the captures (return this)
		while ((cap = rx.exec(this)) !== null) all.push(cap); // execute and add
		return new ArrayIter(all); // profit!
	};
}
