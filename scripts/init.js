function saveSvg(svgEl, name) {
	svgEl.setAttribute("xmlns", "http://www.w3.org/2000/svg");
	var svgData = svgEl.outerHTML;
	var preface = '<?xml version="1.0" standalone="no"?>\r\n';
	var svgBlob = new Blob([preface, svgData], {type:"image/svg+xml;charset=utf-8"});
	var downloadLink = document.createElement("a");
	downloadLink.href = URL.createObjectURL(svgBlob);
	downloadLink.download = name;
	downloadLink.setAttribute('readonly', '');
	downloadLink.style.position = 'absolute';
	downloadLink.style.left = '-9999px';
	document.body.appendChild(downloadLink);
	downloadLink.click();
	document.body.removeChild(downloadLink);
}

function saveText(text, name) {
	var file = new Blob([text], {type: 'text/plain;charset=utf-8'});
	var downloadLink = document.createElement("a");
	downloadLink.href = URL.createObjectURL(file);
	downloadLink.download = name;
	downloadLink.setAttribute('readonly', '');
	downloadLink.style.position = 'absolute';
	downloadLink.style.left = '-9999px';
	document.body.appendChild(downloadLink);
	downloadLink.click();
	document.body.removeChild(downloadLink);
}

const copyToClipboard = function(text) {
	const textarea = document.createElement('textarea');
	textarea.value = text;
	textarea.setAttribute('readonly', '');
	textarea.style.position = 'absolute';
	textarea.style.left = '-9999px';
	document.body.appendChild(textarea);
	textarea.select();
	document.execCommand('copy');
	document.body.removeChild(textarea);
}

document.addEventListener('DOMContentLoaded', function() {
	M.Dropdown.init(document.querySelectorAll('.dropdown-trigger', {'alignment': 'right', 'constrainWidth': false, 'coverTrigger': false}))
	M.FormSelect.init(document.querySelectorAll('select'))
	M.Modal.init(document.querySelectorAll('.modal'))
	M.Datepicker.init(document.querySelectorAll('.datepicker'))
	M.toast({html: 'Powered by Blockchain.info', displayLength: 2000})

	// Automatically navigate on load.
	var addresshash = document.getElementById('hash')
	if(window.location.hash.startsWith("#!")) addresshash.value = window.location.hash.substr(2)
	trace(addresshash.value)
})
