// Links

// Main click, other click, and keypress
function clickAndKeypress(el, fn) {
	el.onclick = fn;
	el.onauxclick = fn;
	el.onkeypress = fn;
}

// Link: Keyboard shortcuts
async function keyboardShortcuts(e) {
	// Skip other keys or right click
	if ((e.code && e.code != 'Enter') || e.button == 2)
		return;

	// Tab createData
	const url = 'chrome://extensions/shortcuts';
	const middleClick = e.button == 1;
	const newWindow = e.shiftKey && ! e.ctrlKey && ! middleClick;

	// New window
	if (newWindow) {
		// Create tab in new window
		chrome.windows.create({ url: url });
	}
	// Same window
	else {
		// Query the current tab in order to create a new adjacent tab
		const tabs = await chrome.tabs.query({active: true});
		const index = tabs[0].index + 1;

		// Tab createData
		const active = (! middleClick && ! (e.ctrlKey ^ e.shiftKey)) || (middleClick && e.shiftKey);

		// Create tab
		chrome.tabs.create({ url: url, index: index, active: active });
	}
}
clickAndKeypress(document.getElementById('keyboardShortcuts'), keyboardShortcuts);

// Link: Big options page
function bigOptions(e) {
	// Skip other keys or right click
	if ((e.code && e.code != 'Enter') || e.button == 2) {
		return;
	}

	// Create tab
	chrome.runtime.openOptionsPage();
}
const bigOptionsLink = document.getElementById('bigOptions');
clickAndKeypress(bigOptionsLink, bigOptions);
if (location.hash != '#popup') {
	bigOptionsLink.className = 'hidden';
}



// Options

// Load all options
async function loadOptions() {
	const items = await chrome.storage.sync.get();

	for (const [key, value] of Object.entries(items)) {
		document.getElementById(key).checked = value;
	}
}
loadOptions();

// Save changed option
function saveOption(e) {
	const target = e.currentTarget;
	const key = target.id;
	const value = target.checked;

	chrome.storage.sync.set({ [key]: value });
}
for (const input of document.getElementsByTagName('input')) {
	input.onclick = saveOption;
}
