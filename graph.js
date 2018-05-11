var nodes = []
var links = []

var width = window.innerWidth
var height = window.innerHeight

var svg = d3.select('svg')
svg.attr('width', width).attr('height', height)

var linkElements, nodeElements, textElements

// we use svg groups to logically group the elements together
var linkGroup = svg.append('g').attr('class', 'links')
var nodeGroup = svg.append('g').attr('class', 'nodes')
var textGroup = svg.append('g').attr('class', 'texts')

// simulation setup with all forces
var linkForce = d3
	.forceLink()
	.id(function(link) {return link.id})
	.strength(function(link) {return link.strength})

var simulation = d3
	.forceSimulation()
	.force('link', linkForce)
	.force('charge', d3.forceManyBody().strength(-75))
	.force('center', d3.forceCenter(width / 2, height / 2))
	.velocityDecay(0.92)

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
	// lapsedZoomFit(5, 0);
}

// var zoom = d3.zoom().on('zoom.zoom', function () {svg.attr("transform", d3.event.transform)})

function zoomFit(paddingPercent, transitionDuration) {
	var bounds = svg.node().getBBox();
	var parent = svg.node().parentElement;
	var fullWidth = parent.clientWidth,
	    fullHeight = parent.clientHeight;
	var width = bounds.width,
	    height = bounds.height;
	var midX = bounds.x + width / 2,
	    midY = bounds.y + height / 2;
	if (width == 0 || height == 0) return; // nothing to fit
	var scale = (paddingPercent || 0.75) / Math.max(width / fullWidth, height / fullHeight);
	var translate = [fullWidth / 2 - scale * midX, fullHeight / 2 - scale * midY];

	svg.transition()
		.duration(transitionDuration || 0) // milliseconds
		.call(zoom.transform,
			d3.zoomIdentity
			// .translate(translate[0], translate[1])
			.translate(0, 0)
			.scale(scale)
		)
}

// Define the div for the tooltip
var tooltip = d3.select("body").append("div").attr("class", "tooltip").style("opacity", 0);

function step(timestamp) {
	zoomFit(0.9)
	window.requestAnimationFrame(step);
}
// window.requestAnimationFrame(step);

svg.call(d3.zoom().scaleExtent([1 / 2, 8]).on("zoom", zoomed));

function zoomed() {
	nodeGroup.attr("transform", d3.event.transform);
	linkGroup.attr("transform", d3.event.transform);
	textGroup.attr("transform", d3.event.transform);
}

// select node is called on every click
// we either update the data according to the selection
// or reset the data if the same node is clicked twice
function selectNode(selectedNode) {
	d3.select(this).attr('fill', 'rgba(127, 127, 127, 0.5)')
	lookup(selectedNode.id, 0, function(result) {updateBlockchain(selectedNode.id, result, 0)}, function(status) {
		console.log("Error", status)
	})
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
		.attr('stroke', 'rgba(127, 127, 127, 0.2)')

	linkElements = linkEnter.merge(linkElements)

	// nodes
	nodeElements = nodeGroup.selectAll('circle')
		.data(nodes, function(node) {return node.id})

	nodeElements.exit().remove()

	var nodeEnter = nodeElements
		.enter()
		.append('circle')
		.attr('r', 10)
		.attr('id', function(node) {return 'node_' + node.id})
		.attr('fill', function(node) {
			return node.level === 1 ? 'rgba(255, 0, 0, 0.85)' : 'rgba(127, 195, 255, 0.85)'}
		)
		.style('cursor', 'pointer')
		.call(dragDrop)
		// we link the selectNode method here
		// to update the graph on every click
		.on('click', selectNode)
		.on("mouseover", function(d) {
			tooltip.transition().duration(200).style("opacity", .9)
			tooltip.html(d.label).style("left", (d3.event.pageX) + "px").style("top", (d3.event.pageY - 28) + "px")
			d3.selectAll(".connects_" + d.id).attr('stroke', 'rgba(127, 127, 127, 1)')
		})
		.on("mouseout", function(d) {
			tooltip.transition().duration(500).style("opacity", 0)
			d3.selectAll(".connects_" + d.id).attr('stroke', 'rgba(127, 127, 127, 0.2)')
		})

	nodeElements = nodeEnter.merge(nodeElements)

	// texts
	textElements = textGroup.selectAll('text').data(nodes, function(node) {return node.id})
	textElements.exit().remove()

	var textEnter = textElements
		.enter()
		.append('text')
		.attr('fill', 'rgab(127, 127, 127, 1)')
		.attr('id', function(node) {return 'text_' + node.label})
		.text(function(node) {return node.label})
		.attr('font-size', 15)
		.attr('dx', 15)
		.attr('dy', 4)

	textElements = textEnter.merge(textElements)
}

function updateSimulation() {
	updateGraph()

	simulation.nodes(nodes).on('tick', function() {
		nodeElements
			.attr('cx', function(node) {return node.x})
			.attr('cy', function(node) {return node.y})
		textElements
			.attr('x', function(node) {return node.x})
			.attr('y', function(node) {return node.y})
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
