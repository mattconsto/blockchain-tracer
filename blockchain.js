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
	// Fallback if localStorage is unavailable
	if(typeof localStorage == "undefined") {
		getJSONAsync(url, callback, error)
		return
	}

	// If data is fresh
	if(localStorage.hasOwnProperty(url)) {
		try {
			var cached = JSON.parse(localStorage.getItem(url))
			if(Date.now() < cached.time + 10 * 60 * 1000) {
				console.log("Serving " + url + " from cache.")
				callback(cached.data)
				return
			}
		} catch(e) {
			// Remove invalid data
			localStorage.removeItem(url)
		}
	}

	// Update cache
	getJSONAsync(url, function(data) {
		console.log("Updating " + url)
		localStorage.setItem(url, JSON.stringify({data: data, time: Date.now()}))
		callback(data)
	}, error)
}

var lookup = function(input, callback, error) {
	input = input.trim() // Strip Whitespace

	if(/^[0-9a-fA-F]{64}$/.test(input)) {
		// Transaction (Only one)
		cachedJSONAsync("https://blockchain.info/rawtx/" + input + "?cors=true", function(transaction) {
			// Extract the address and re-lookup
			lookup(transaction["inputs"][0]["prev_out"]["addr"], callback, error)
		}, error)
	} else if(/^([0-9a-fA-F]{40}|[1-9A-HJ-NP-Za-km-z]{34})(|([0-9a-fA-F]{40}|[1-9A-HJ-NP-Za-km-z]{34}))*$/.test(input)) {
		// Address (One or many)
		cachedJSONAsync("https://blockchain.info/multiaddr?active=" + input + "&cors=true", callback, error)
	} else {
		// Invalid
		error("Invalid Input!")
	}
}

var existingNodeHashes = new Set();
var existingTranHashes = new Set();

var updateBlockchain = function(address, result) {
	nodes = []
	links = []

	existingNodeHashes = new Set();
	existingTranHashes = new Set();

	for(var transaction of result["txs"]) {
		// console.log(transaction)
		for(var inputs of transaction["inputs"]) {
			var addr = inputs["prev_out"]["addr"]
			if(typeof addr != "undefined" && !existingNodeHashes.has(addr)) {
				existingNodeHashes.add(addr)
				nodes.push({id: addr, group: 0, label: addr, level: addr == address ? 1 : 0})
			}
		}

		for(var out of transaction["out"]) {
			var addr = out["addr"]
			if(typeof addr != "undefined" && !existingNodeHashes.has(addr)) {
				existingNodeHashes.add(addr)
				nodes.push({id: addr, group: 0, label: addr, level: addr == address ? 1 : 0})
			}
		}

		for(var inputs of transaction["inputs"]) {
			for(var out of transaction["out"]) {
				var source = inputs["prev_out"]["addr"]
				var target = out["addr"]
				// Only care about valid transactions that involve the target
				if(typeof source != "undefined" && typeof target != "undefined" && (source == address || target == address) && !existingTranHashes.has(source+target)) {
					existingTranHashes.add(addr)
					links.push({source: source, target: target, strength: 0.7})
				}
			}
		}
	}

	updateSimulation()
}

testLocalStorage()

var trace = function(input) {
	lookup(input, function(result) {updateBlockchain(input, result)}, function(status) {
		console.log("Error", status)
	})
	return false
}

lookup("1AJbsFZ64EpEfS5UAjAfcUG8pH8Jn3rn1F", function(result) {updateBlockchain("1AJbsFZ64EpEfS5UAjAfcUG8pH8Jn3rn1F", result)}, function(status) {
	console.log("Error", status)
})

lookup("b6f6991d03df0e2e04dafffcd6bc418aac66049e2cd74b80f14ac86db1e3f0da", function(result) {
	console.log(result)
}, function(status) {
	console.log("Error", status)
})
