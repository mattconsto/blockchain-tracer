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
	.force('charge', d3.forceManyBody().strength(-120))
	.force('center', d3.forceCenter(width / 2, height / 2))

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

// select node is called on every click
// we either update the data according to the selection
// or reset the data if the same node is clicked twice
function selectNode(selectedNode) {
	console.log(selectedNode)

	lookup(selectedNode.id, 0, function(result) {updateBlockchain(selectedNode.id, result, maxDepth, 0)}, function(status) {
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
		.attr('stroke', 'rgba(50, 50, 50, 0.2)')

	linkElements = linkEnter.merge(linkElements)

	// nodes
	nodeElements = nodeGroup.selectAll('circle')
		.data(nodes, function(node) {return node.id})

	nodeElements.exit().remove()

	var nodeEnter = nodeElements
		.enter()
		.append('circle')
		.attr('r', 10)
		.attr('fill', function(node) {return node.level === 1 ? 'red' : 'gray'})
		.call(dragDrop)
		// we link the selectNode method here
		// to update the graph on every click
		.on('click', selectNode)

	nodeElements = nodeEnter.merge(nodeElements)

	// texts
	textElements = textGroup.selectAll('text')
		.data(nodes, function(node) {return node.id})

	textElements.exit().remove()

	var textEnter = textElements
		.enter()
		.append('text')
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
