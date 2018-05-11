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

var blacklistedAddresses = ["1JArS6jzE3AJ9sZ3aFij1BmTcpFGgN86hA"]

var existingAddresses = new Set()
var existingNodeHashes = new Set()
var existingTranHashes = new Set()

var updateBlockchain = function(address, result, offset) {
	console.log(address, offset)
	window.location.hash = "!" + address

	if(result["txs"].length > 0) {
		existingAddresses.add(address) // Mark current

		for(var transaction of result["txs"]) {
			// console.log(transaction)
			for(var inputs of transaction["inputs"]) {
				var addr = inputs["prev_out"]["addr"]
				if(typeof addr != "undefined" && !existingNodeHashes.has(addr)) {
					existingNodeHashes.add(addr)
					nodes.push({id: addr, group: 0, label: (addr in addressTags ? addressTags[addr].n : addr), level: addr == address ? 1 : 0})
				}
			}

			for(var out of transaction["out"]) {
				var addr = out["addr"]
				if(typeof addr != "undefined" && !existingNodeHashes.has(addr)) {
					existingNodeHashes.add(addr)
					if(addr in addressTags) {}
					nodes.push({id: addr, group: 0, label: (addr in addressTags ? addressTags[addr].n : addr), level: addr == address ? 1 : 0})
				}
			}

			for(var inputs of transaction["inputs"]) {
				for(var out of transaction["out"]) {
					var source = inputs["prev_out"]["addr"]
					var target = out["addr"]
					// Only care about valid transactions that involve the target
					if(typeof source != "undefined" && typeof target != "undefined" && !existingTranHashes.has(source+target)) {
						existingTranHashes.add(source+target)
						links.push({source: source, target: target, strength: 0.7})
					}
				}
			}
		}

		updateSimulation()
	}

	if(result["txs"].length == 100) {
		// Recurse
		lookup(address, offset+100, function(result) {updateBlockchain(address, result, offset+100)}, function(status) {
			console.log("Error", status)
		})
	}
}

testLocalStorage()

var trace = function(hash) {
	nodes = []
	links = []

	existingAddresses = new Set()
	existingNodeHashes = new Set()
	existingTranHashes = new Set()

	lookup(hash, 0, function(result) {updateBlockchain(hash, result, 0)}, function(status) {
		console.log("Error", status)
	})
	return false
}
