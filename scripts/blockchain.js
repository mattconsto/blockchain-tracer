class PriorityQueue {
	constructor(comparator = (a, b) => a > b) {
		this._heap = [];
		this._comparator = comparator;
	}
	size() {return this._heap.length;}
	isEmpty() {return this.size() == 0;}
	peek() {return this._heap[0];}
	push(...values) {
		values.forEach(value => {
			this._heap.push(value);
			this._siftUp();
		});
		return this.size();
	}
	pop() {
		const poppedValue = this.peek();
		const bottom = this.size() - 1;
		if (bottom > 0) this._swap(0, bottom);

		this._heap.pop();
		this._siftDown();
		return poppedValue;
	}
	_parent(i) {return ((i + 1) >>> 1) - 1}
	_left(i) {return (i << 1) + 1}
	_right(i) {return (i + 1) << 1}
	replace(value) {
		const replacedValue = this.peek();
		this._heap[0] = value;
		this._siftDown();
		return replacedValue;
	}
	_greater(i, j) {return this._comparator(this._heap[i], this._heap[j]);}
	_swap(i, j) {[this._heap[i], this._heap[j]] = [this._heap[j], this._heap[i]];}
	_siftUp() {
		let node = this.size() - 1;
		while (node > 0 && this._greater(node, this._parent(node))) {
			this._swap(node, this._parent(node));
			node = this._parent(node);
		}
	}
	_siftDown() {
		let node = 0;
		while (
			(this._left(node) < this.size() && this._greater(this._left(node), node)) ||
			(this._right(node) < this.size() && this._greater(this._right(node), node))
		) {
			let maxChild = (this._right(node) < this.size() && this._greater(this._right(node), this._left(node))) ? this._right(node) : this._left(node);
			this._swap(node, maxChild);
			node = maxChild;
		}
	}
}

var getJSONAsync = function(url, callback, error) {
	var request = new XMLHttpRequest()
	request.onreadystatechange = function() {
		if(this.readyState == 4) {
			if(this.status == 200) {
				callback(JSON.parse(this.responseText))
			} else {
				error(request.statusText)
			}
		}
	}
	request.open("GET", url, true)
	request.send()
}

var testLocalStorage = function() {
	var test = "test"
	try {
		localStorage.setItem(test, test)
		localStorage.removeItem(test)
		return true
	} catch(e) {
		delete localStorage // Delete localStorage for faster checking
		return false
	}
}

var cachedJSONAsync = function(url, callback, error) {
	// // Fallback if localStorage is unavailable
	// if(typeof localStorage == "undefined") {
	// 	getJSONAsync(url, callback, error)
	// 	return
	// }

	// // If data is fresh
	// if(localStorage.hasOwnProperty(url)) {
	// 	try {
	// 		var cached = JSON.parse(localStorage.getItem(url))
	// 		if(Date.now() < cached.time + 10 * 60 * 1000) {
	// 			console.log("Serving " + url + " from cache.")
	// 			callback(cached.data)
	// 			return
	// 		}
	// 	} catch(e) {
	// 		// Remove invalid data
	// 		localStorage.removeItem(url)
	// 	}
	// }

	// Update cache
	getJSONAsync(url, function(data) {
		console.log("Updating " + url)
		// localStorage.setItem(url, JSON.stringify({data: data, time: Date.now()}))
		callback(data)
	}, error)
}

var lookup = function(input, offset, callback, error) {
	input = input.trim() // Strip Whitespace

	if(/^[0-9a-fA-F]{64}$/.test(input)) {
		// Transaction (Only one)
		cachedJSONAsync("https://blockchain.info/rawtx/" + input + "?cors=true", function(transaction) {
			// Extract the address and re-lookup
			lookup(transaction["inputs"][0]["prev_out"]["addr"], 0, callback, error)
		}, error)
	} else if(/^([0-9a-fA-F]{40}|[1-9A-HJ-NP-Za-km-z]{33,34})(\|([0-9a-fA-F]{40}|[1-9A-HJ-NP-Za-km-z]{33,34}))*$/.test(input)) {
		// Address (One or many)
		cachedJSONAsync("https://blockchain.info/multiaddr?active=" + input + "&n=100&offset=" + offset + "&cors=true", callback, error)
	} else {
		// Invalid
		error("Invalid Input!")
	}
}

var dollarsToBitcoin = -1;
var blacklistedAddresses = ["1JArS6jzE3AJ9sZ3aFij1BmTcpFGgN86hA"]

var estimatedAddreses = new Map()
var discoveredAddresses = new Map()
var discoveredLinks = new Set()
var linkedAddresses = new Map()
var taintedAddresses = new Map()
var taintOrigin = ""
var taintValue = ""

var dateMin = new Date("2000").getTime()/1000
var dateMax = new Date("3000").getTime()/1000

var linksMax = 200;

var updateBlockchain = function(address, result, offset, distance) {
	console.log(address, offset)
	window.location.hash = "!" + address
	document.getElementById('hash').value = address

	// Colour the very first one differently
	if(!estimatedAddreses.has(address)) {
		nodes.push({id: address, group: 0, label: (address in addressTags ? addressTags[address].n : address), distance: distance})
		estimatedAddreses.set(address, 0)
	}

	dollarsToBitcoin = result["info"]["symbol_local"]["conversion"]

	for(var addr of result["addresses"]) {
		discoveredAddresses.set(addr.address, addr)
	}

	if(result["txs"].length > 0) {
		for(var transaction of result["txs"]) {
			if(transaction["time"] < dateMin || transaction["time"] > dateMax) continue

			// Compute links first, so we know which is the source and which is the target
			for(var inputs of transaction["inputs"]) {
				for(var out of transaction["out"]) {
					var source = inputs["prev_out"]["addr"]
					var target = out["addr"]
					// Only care about valid transactions that involve the target
					if(typeof source == "undefined" || typeof target == "undefined") continue

					if(!discoveredLinks.has(source+target)) {
						discoveredLinks.add(source+target)
						links.push({source: source, target: target, strength: 0.7})
					}

					if(!linkedAddresses.has(source)) linkedAddresses.set(source, {"in": new Map(), "out": new Map(), "all" : new Map()})
					if(!linkedAddresses.has(target)) linkedAddresses.set(target, {"in": new Map(), "out": new Map(), "all" : new Map()})
					linkedAddresses.get(source)["out"].set(transaction['hash'], transaction)
					linkedAddresses.get(target)["in"].set(transaction['hash'], transaction)
					linkedAddresses.get(source)["all"].set(transaction['hash'], transaction)
					linkedAddresses.get(target)["all"].set(transaction['hash'], transaction)
				}
			}

			for(var inputs of transaction["inputs"]) {
				var addr = inputs["prev_out"]["addr"]
				if(typeof addr == "undefined" || typeof inputs == "undefined") continue

				if(!estimatedAddreses.has(addr)) {
					var actualDistance = distance + (discoveredLinks.has(address+addr) ? (discoveredLinks.has(addr+address) ? 0 : 1) : (discoveredLinks.has(addr+address) ? - 1 : 0))
					nodes.push({id: addr, group: 1, label: (addr in addressTags ? addressTags[addr].n : addr), distance: actualDistance})
					estimatedAddreses.set(addr, 0)
				} else {
					estimatedAddreses.set(addr, Math.max(0, estimatedAddreses.get(addr) - inputs["prev_out"]["value"]))
				}
			}

			for(var out of transaction["out"]) {
				var addr = out["addr"]
				if(typeof addr == "undefined" || typeof out == "undefined") continue
				if(!estimatedAddreses.has(addr)) {
					estimatedAddreses.set(addr, out["value"])
					var actualDistance = distance + (discoveredLinks.has(address+addr) ? (discoveredLinks.has(addr+address) ? 0 : 1) : (discoveredLinks.has(addr+address) ? - 1 : 0))
					nodes.push({id: addr, group: 1, label: (addr in addressTags ? addressTags[addr].n : addr), distance: actualDistance})
				} else {
					estimatedAddreses.set(addr, estimatedAddreses.get(addr) + out["value"])
				}
			}
		}

		// For somewhat better performance
		while(links.length > linksMax) links.shift();

		updateSimulation()
	}

	if(result["txs"].length == 100) {
		// Recurse
		if(offset == 0 || offset % 100 != 0 || (offset % 100 == 0 && confirm("Do you wish to continue loading addresses? This may cause significant slowdown!"))) {
			lookup(address, offset+100, function(result) {updateBlockchain(address, result, offset+100, distance)}, function(status) {
				console.error("Error", status)
				M.toast({html: "Error:" + status, displayLength: Infinity})
			})
		}
	}
}

testLocalStorage()

var trace = function(hash) {
	M.toast({html: 'Loading ' + hash, displayLength: 2000})

	nodes = []
	links = []

	estimatedAddreses = new Map()
	discoveredAddresses = new Map()
	discoveredLinks = new Set()
	linkedAddresses = new Map()

	lookup(hash, 0, function(result) {updateBlockchain(hash, result, 0, 0)}, function(status) {
		console.error("Error", status)
		M.toast({html: "Error:" + status, displayLength: Infinity})
	})
	return false
}

var traceTransactionOut = function(address, hash, index) {
	// Fill the queue
	var item = linkedAddresses.get(address)["all"].get(hash)
	var firstelement = {"data": item["out"][index], "time": item["time"], "haircut": 1.0, "fifo": item["out"][index]["value"]}
	var queue = new PriorityQueue()
	var seen = new Set()
	queue.push(firstelement)
	seen.add(hash)

	// Reset variables
	taintedAddresses = new Map()
	taintOrigin = address
	taintValue = item["out"][index]["value"]

	// Go!
	while(queue.size() > 0) {
		var item = queue.pop()

		var balance = (discoveredAddresses.has(item["data"]["addr"]) ? discoveredAddresses.get(item["data"]["addr"])["final_balance"] : estimatedAddreses.get(item["data"]["addr"]))
		var total = balance
		var fifobalance = item["fifo"]

		if(linkedAddresses.has(item["data"]["addr"])) {
			var transactions = Array.from(linkedAddresses.get(item["data"]["addr"])["out"].values())
			transactions.sort(function(a, b) {return a["time"] - b["time"]})

			for(var transaction of transactions) {
				if(seen.has(transaction["hash"])) continue
				seen.add(transaction["hash"])
			
				if(transaction["time"] > item["time"]) continue

				for(var out of transaction["out"]) total += out["value"]

				for(var i = 0; i < transaction["out"].length; i++) {
					var fifoout = Math.min(fifobalance, transaction["out"][i]["value"])
					fifobalance -= fifoout

					queue.push({
						"data": transaction["out"][i],
						"time": transaction["time"],
						"haircut": item["haircut"] * transaction["out"][i]["value"] / total,
						"fifo": fifoout
					})
				}
			}
		}

		if(!taintedAddresses.has(item["data"]["addr"])) {
			taintedAddresses.set(item["data"]["addr"], {"poison": true, "haircut": item["haircut"] * balance / total, "fifo": fifobalance})
		} else {
			var oldvalues = taintedAddresses.get(item["data"]["addr"])
			taintedAddresses.set(item["data"]["addr"], {"poison": true, "haircut": oldvalues["haircut"] + item["haircut"] * balance / total, "fifo": oldvalues["fifo"] + fifobalance})
		}
	}

	// Update colouring, and switch to poison if on distance
	if(fillStyle < 2) fillStyle = 2
	updateFillStyle(fillStyle)
}

var traceTransactionIn = function(address, hash, index) {
	// Fill the queue
	var item = linkedAddresses.get(address)["all"].get(hash)
	var firstelement = {"data": item["inputs"][index]["prev_out"], "time": item["time"], "haircut": 1.0, "fifo": item["inputs"][index]["prev_out"]["value"]}
	var queue = new PriorityQueue()
	var seen = new Set()
	queue.push(firstelement)
	seen.add(hash)

	// Reset variables
	taintedAddresses = new Map()
	taintOrigin = address
	taintValue = item["inputs"][index]["prev_out"]["value"]

	// Go!
	while(queue.size() > 0) {
		var item = queue.pop()

		var balance = (discoveredAddresses.has(item["data"]["addr"]) ? discoveredAddresses.get(item["data"]["addr"])["final_balance"] : estimatedAddreses.get(item["data"]["addr"]))
		var total = balance
		var fifobalance = item["fifo"]

		if(linkedAddresses.has(item["data"]["addr"])) {
			var transactions = Array.from(linkedAddresses.get(item["data"]["addr"])["in"].values())
			transactions.sort(function(a, b) {return a["time"] - b["time"]})

			for(var transaction of transactions) {
				if(seen.has(transaction["hash"])) continue
				seen.add(transaction["hash"])
			
				if(transaction["time"] < item["time"]) continue

				for(var inpu of transaction["inputs"]) total += inpu["prev_out"]["value"]

				for(var i = 0; i < transaction["inputs"].length; i++) {
					var fifoout = Math.min(fifobalance, transaction["inputs"][i]["prev_out"]["value"])
					fifobalance -= fifoout

					queue.push({
						"data": transaction["inputs"][i]["prev_out"],
						"time": transaction["time"],
						"haircut": item["haircut"] * transaction["inputs"][i]["prev_out"]["value"] / total,
						"fifo": fifoout
					})
				}
			}
		}

		if(!taintedAddresses.has(item["data"]["addr"])) {
			taintedAddresses.set(item["data"]["addr"], {"poison": true, "haircut": item["haircut"] * balance / total, "fifo": fifobalance})
		} else {
			var oldvalues = taintedAddresses.get(item["data"]["addr"])
			taintedAddresses.set(item["data"]["addr"], {"poison": true, "haircut": oldvalues["haircut"] + item["haircut"] * balance / total, "fifo": oldvalues["fifo"] + fifobalance})
		}
	}

	// Update colouring, and switch to poison if on distance
	if(fillStyle < 2) fillStyle = 2
	updateFillStyle(fillStyle)
}
