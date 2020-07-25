var nodes = []
var links = []

var width = window.innerWidth
var height = window.innerHeight

String.prototype.trunc = String.prototype.trunc || function (n) {return (this.length > n) ? this.substr(0, n) + '...' : this}

Number.prototype.formatMoney = function (c, d, t) {
	var n = this,
		c = isNaN(c = Math.abs(c)) ? 2 : c,
		d = d == undefined ? "." : d,
		t = t == undefined ? "," : t,
		s = n < 0 ? "-" : "",
		i = String(parseInt(n = Math.abs(Number(n) || 0).toFixed(c))),
		j = (j = i.length) > 3 ? j % 3 : 0;
	return s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
}

var svg = d3.select('svg')
svg.attr('width', width).attr('height', height)

svg.append('defs').append('marker')
	.attr('id', 'arrowhead')
	.attr('viewBox', '-0 -5 10 10')
	.attr('refX', 20)
	.attr('refY', 0)
	.attr('orient', 'auto')
	.attr('markerWidth', 10)
	.attr('markerHeight', 10)
	.attr('xoverflow', 'visible')
	.append('svg:path')
	.attr('d', 'M 0,-5 L 10 ,0 L 0,5')
	.attr('fill', 'rgb(127, 127, 127)')
	.style('stroke','none')

var linkElements, nodeElements

// we use svg groups to logically group the elements together
var linkGroup = svg.append('g').attr('class', 'links')
var nodeGroup = svg.append('g').attr('class', 'nodes')

// simulation setup with all forces
var collide = d3.forceCollide().radius(function(node) {
		var balance = (discoveredAddresses.has(node.id) ? discoveredAddresses.get(node.id)["final_balance"] : estimatedAddreses.get(node.id)) / 100000000.0
		return 2*(Math.log(Math.max(1, balance)) * 10 + 10)
})

var simulation = d3
	.forceSimulation()
	.force("collide", collide)
	.force('link', d3.forceLink().id(function(link) {return link.id}))
	.force('charge', d3.forceManyBody().strength(-100).distanceMax(200))
	.force('center', d3.forceCenter(width / 2, height / 2))
	.velocityDecay(0.95)

var dragDrop = d3.drag().on('start', function(node) {
	node.fx = node.x
	node.fy = node.y
}).on('drag', function(node) {
	simulation.alphaTarget(0.7).restart()
	node.fx = d3.event.x
	node.fy = d3.event.y
}).on('end', function(node) {
	if(!d3.event.active) simulation.alphaTarget(0)
	node.fx = null
	node.fy = null
})

d3.select(window).on('resize', resize);
function resize() {
	var width = window.innerWidth, height = window.innerHeight;
	svg.size([width, height]);
	simulation.force('center', d3.forceCenter(width / 2, height / 2))
	simulation.restart()
}

// Define the div for the tooltip
var tooltip = d3.select("#tooltip")
var tooltipActive = false

svg.call(d3.zoom().scaleExtent([1 / 8, 8]).on("zoom", zoomed));
function zoomed() {
	nodeGroup.attr("transform", d3.event.transform);
	linkGroup.attr("transform", d3.event.transform);
}

// select node is called on every click
// we either update the data according to the selection
// or reset the data if the same node is clicked twice
function selectNode(selectedNode) {
	d3.select(this).attr('fill', 'rgba(127, 127, 127, 0.5)')
	M.toast({html: 'Loading ' + selectedNode.id, displayLength: 2000})
	lookup(selectedNode.id, 0, function(result) {updateBlockchain(selectedNode.id, result, 0, selectedNode.distance)}, function(status) {
		M.toast({html: "Error:" + status, displayLength: Infinity})
		console.error("Error", status)
	})
}

var fillStyle = 0;
var updateFillStyle = function(choosen) {
	fillStyle = choosen
	nodeElements.remove()
	updateSimulation()
}

function updateGraph() {
	// links
	linkElements = linkGroup.selectAll('line')
		.data(links, function(link) {return link.target.id + link.source.id})

	linkElements.exit().remove()

	var linkEnter = linkElements
		.enter().append('line')
		.attr('stroke-width', 1)
		.attr('id', function(node) {return 'link_' + node.source + '_' + node.target})
		.attr('class', function(node) {return 'connects_' + node.source + ' connects_' + node.target})
		.attr('stroke', 'rgb(127, 127, 127)')
		.attr('opacity', '0.25')
		.attr('marker-end','url(#arrowhead)')

	linkElements = linkEnter.merge(linkElements)

	// nodes
	nodeElements = nodeGroup.selectAll('circle')
		.data(nodes, function(node) {return node.id})

	nodeElements.exit().remove()

	var nodeEnter = nodeElements
		.enter()
		.append('circle')
		.attr('r', function(node) {
			var balance = (discoveredAddresses.has(node.id) ? discoveredAddresses.get(node.id)["final_balance"] : estimatedAddreses.get(node.id)) / 100000000.0
			return Math.log(Math.max(1, balance)) * 10 + 10
		})
		.attr('id', function(node) {return 'node_' + node.id})
		.attr('fill', function(node) {
			switch(fillStyle) {
				default:
				case 0: return 'hsla(' + node.distance*15 + ', 90%, 50%, 0.85';
				case 1: return 'rgba(127, 127, 255, 0.85)';
				case 2: return node.id == taintOrigin ? 'rgba(127, 127, 255, 0.85)' : (taintedAddresses.has(node.id) && taintedAddresses.get(node.id)["poison"] ? 'rgba(255, 0, 0, 0.85)' : 'rgba(127, 196, 127, 0.85)');
				case 3: return node.id == taintOrigin ? 'rgba(127, 127, 255, 0.85)' : (taintedAddresses.has(node.id) && taintedAddresses.get(node.id)["haircut"] > 0 ? 'rgba(' + Math.floor(taintedAddresses.get(node.id)["haircut"] * 255) + ', 0, 0, 0.85)' : 'rgba(127, 196, 127, 0.85)');
				case 4: return node.id == taintOrigin ? 'rgba(127, 127, 255, 0.85)' : (taintedAddresses.has(node.id) && taintedAddresses.get(node.id)["fifo"] > 0 ? 'rgba(' + Math.floor(taintedAddresses.get(node.id)["fifo"]/taintValue * 255) + ', 0, 0, 0.85)' : 'rgba(127, 196, 127, 0.85)');
			}
		})
		.style('cursor', 'pointer')
		.call(dragDrop)
		// we link the selectNode method here
		// to update the graph on every click
		.on('click', selectNode)
		.on("mouseover", function(d) {
			var balance = (discoveredAddresses.has(d.id) ? discoveredAddresses.get(d.id)["final_balance"] : estimatedAddreses.has(d.id) ? estimatedAddreses.get(d.id) : 0) / 100000000.0

			tooltip.select('#tooltip-title').html(d.label)
			tooltip.select('#tooltip-value').html((!discoveredAddresses.has(d.id) ? "Estimated: " : "") + "<b>" + balance.toLocaleString() + " BTC </b> (" + (balance * dollarsToBitcoin).formatMoney(2, '.', ',') + " USD)")

			if(taintedAddresses.has(d.id)) {
				var taintedness = taintedAddresses.get(d.id)
				tooltip.select('#tooltip-value').html(tooltip.select('#tooltip-value').html() +
					(taintedness["poison"] ? "<br />Poisoned" : "") +
					(taintedness["haircut"] > 0 ? "<br />Haircut: " + (taintedness["haircut"]*100).toFixed(3) + "%" : "") +
					(taintedness["fifo"] > 0 ? "<br />LIFO: " + (taintedness["fifo"] / 100000000.0).toLocaleString() + " BTC" : "")
				)
			}

			tooltip.select('#tooltip-allcount').html(linkedAddresses.get(d.id)["out"].size + linkedAddresses.get(d.id)["in"].size)
			tooltip.select('#tooltip-outcount').html(linkedAddresses.get(d.id)["out"].size)
			tooltip.select('#tooltip-incount').html(linkedAddresses.get(d.id)["in"].size)

			var tx_log = "";

			linkedAddresses.get(d.id)["all"].forEach(function (value, key, map) {
				if(linkedAddresses.get(d.id)["out"].has(value['hash'])) {
					for(var i = 0; i < value['out'].length; i++) {
						var y = value['out'][i]

						var txt = '<b>' + (y['value'] / 100000000.0) + '</b> ';
						tx_log += "<button style='width: 100%; margin: 2px;' class=\"btn waves-effect waves-light red\" onclick=\"traceTransactionOut('"+d.id+"', '"+value["hash"] + "'," + i + ")\" title=\"Trace\">" +
							"<i class=\"material-icons left\">keyboard_arrow_left</i> " + txt + " (" + ("addr" in y ? y['addr'].trunc(10) : "???") + ")</button><br />";
					}
				} else {
					for(var i = 0; i < value['out'].length; i++) {
						var y = value['out'][i]

						var address = y['addr'];
						if (address === d.label) {
							var txt = '<b>' + (y['value'] / 100000000.0) + '</b> ';
							tx_log += "<button style='width: 100%; margin: 2px;' class=\"btn waves-effect waves-light\" onclick=\"traceTransactionIn('"+d.id+"', '"+value["hash"] + "'," + i + ")\" title=\"Trace\">" +
								"<i class=\"material-icons left\">keyboard_arrow_right</i> " + txt.trunc(10) + " (" + address.trunc(10) + ")</button><br />";
						}
					}
				}
			});

			tooltip.select('#tooltip-log').html(tx_log)

			tooltip.style("left", (d3.event.pageX + 15) + "px").style("top", (d3.event.pageY - 28) + "px")
			tooltipActive = true
			d3.selectAll(".connects_" + d.id).attr('opacity', '1')
			tooltip.style("display", "block")
		})
		.on("mouseout", function(d) {
			tooltipActive = false
			setTimeout(function() {
				if(!tooltipActive) tooltip.style("display", "none")
			}, 500)
			d3.selectAll(".connects_" + d.id).attr('opacity', '0.25')
		})

	nodeElements = nodeEnter.merge(nodeElements)
}

document.getElementById('tooltip').addEventListener("mouseenter", function() {
	tooltipActive = true
})
document.getElementById('tooltip').addEventListener("mouseleave", function() {
	tooltipActive = false
})

function KeyPress(e) {
    var evtobj = window.event? event : e
    if (evtobj.keyCode == 84 && evtobj.shiftKey) toggleTooltip();
}

document.onkeydown = KeyPress;

function toggleTooltip(){
    var tooltip = document.getElementById('tooltip');
    if(tooltip.style.visibility == 'hidden'){
        tooltip.style.visibility = 'visible';
    } else {
        tooltip.style.visibility = 'hidden';
    }

}

function updateSimulation() {
	updateGraph()

	simulation.nodes(nodes).on('tick', function() {
		nodeElements
			.attr('cx', function(node) {return node.x})
			.attr('cy', function(node) {return node.y})
		linkElements
			.attr('x1', function(link) {return link.source.x})
			.attr('y1', function(link) {return link.source.y})
			.attr('x2', function(link) {return link.target.x})
			.attr('y2', function(link) {return link.target.y})
	})

	simulation.force('link').links(links)
	simulation.alphaTarget(0.7).restart()
}

// last but not least, we call updateSimulation
// to trigger the initial render
updateSimulation()
