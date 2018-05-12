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
			// console.log(transaction)
			for(var inputs of transaction["inputs"]) {
				var addr = inputs["prev_out"]["addr"]
				if(typeof addr == "undefined" || typeof inputs == "undefined") continue

				if(!estimatedAddreses.has(addr)) {
					nodes.push({id: addr, group: 0, label: (addr in addressTags ? addressTags[addr].n : addr), distance: distance+1})
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
					nodes.push({id: addr, group: 0, label: (addr in addressTags ? addressTags[addr].n : addr), distance: distance+1})
				} else {
					estimatedAddreses.set(addr, estimatedAddreses.get(addr) + out["value"])
				}
			}

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

					if(!linkedAddresses.has(source)) linkedAddresses.set(source, {"in": [], "out": []})
					if(!linkedAddresses.has(target)) linkedAddresses.set(target, {"in": [], "out": []})
					linkedAddresses.get(source)["out"].push(transaction)
					linkedAddresses.get(target)["in"].push(transaction)
				}
			}
		}

		updateSimulation()
	}

	if(result["txs"].length == 100) {
		// Recurse
		lookup(address, offset+100, function(result) {updateBlockchain(address, result, offset+100, distance)}, function(status) {
			console.log("Error", status)
		})
	}
}

testLocalStorage()

var trace = function(hash) {
	nodes = []
	links = []

	estimatedAddreses = new Map()
	discoveredAddresses = new Map()
	discoveredLinks = new Set()
	linkedAddresses = new Map()

	lookup(hash, 0, function(result) {updateBlockchain(hash, result, 0)}, function(status) {
		console.log("Error", status)
	})
	return false
}
