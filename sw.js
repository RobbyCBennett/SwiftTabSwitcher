// Default options
async function setDefaults() {
	// Get options
	const renamedOptions = {
		switchWindows: 'dual',
		wrapFirstLast: 'skip',
	};
	const defaultOptions = {
		skipCollapsed: false,
		switchWindows: false,
		wrapFirstLast: false,
	};
	const currentOptions = await chrome.storage.sync.get();

	// Get keys of bad options
	const removingOptions = [];
	for (const key of Object.keys(currentOptions)) {
		if (! (key in defaultOptions)) {
			removingOptions.push(key);
		}
	}

	// Remove bad options
	if (Object.keys(removingOptions).length) {
		chrome.storage.sync.remove(removingOptions);
	}

	// Get keys & values of unsaved options
	const unsavedOptions = {};
	for (const [key, value] of Object.entries(defaultOptions)) {
		if (currentOptions[key] === undefined) {
			// Get value from old key
			const oldKey = renamedOptions[key];
			if (oldKey in currentOptions) {
				unsavedOptions[key] = currentOptions[oldKey];
			}
			// Get value from default
			else {
				unsavedOptions[key] = value;
			}
		}
	}

	// Save unsaved options
	if (Object.keys(unsavedOptions).length) {
		chrome.storage.sync.set(unsavedOptions);
	}
}
setDefaults();



// Tab switching
async function switchTab(command) {
	// Get options, windows with tabs, & collapsed groups
	let [options, windows, collapsedGroups] = await Promise.allSettled([
		chrome.storage.sync.get(),
		chrome.windows.getAll({ populate: true }),
		chrome.tabGroups.query({ collapsed: true }),
	]);

	// Get values from fulfilled promises
	options = options.value;
	windows = windows.value;
	if (collapsedGroups.status == 'fulfilled') {
		collapsedGroups = collapsedGroups.value;
	}

	// If a PWA was open, get the collapsed groups using each other window id
	else {
		collapsedGroups = [];
		if (options.skipCollapsed) {
			collapsedGroups = [];
			for (const window of windows) {
				if (window.type == 'app') continue;
				collapsedGroups.push(chrome.tabGroups.query({ windowId: window.id, collapsed: true }));
			}
			collapsedGroups = (await Promise.all(collapsedGroups)).flat();
		}
	}

	// Sort windows according to horizontal position
	windows.sort((a, b) => a.left - b.left);

	// Get all collapsed group ids
	const collapsedGroupIds = {};
	for (const group of collapsedGroups) {
		collapsedGroupIds[group.id] = true;
	}

	// Make a continuous array of only some tabs
	const tabs = [];
	let currentIndex = null;
	for (let i = 0; i < windows.length; i++) {
		const window = windows[i];

		// Filter out minimized windows
		if (window.state == 'minimized') continue;

		// Filter out other windows if window-switching option is disabled
		if (! options.switchWindows && ! window.focused) continue;

		for (let j = 0; j < window.tabs.length; j++) {
			const tab = window.tabs[j];

			// Filter out tabs in collapsed groups
			if (options.skipCollapsed && tab.groupId in collapsedGroupIds) continue;

			// Remember where the current tab is in the array
			if (window.focused && tab.active) {
				currentIndex = tabs.length;
			}

			// Push important tab info to array
			tabs.push({
				windowId: window.id,
				tabId: tab.id,
			});
		}
	}

	// Skip if there is no current tab, like in DevTools
	if (currentIndex == null) return;

	// Change the index
	let newIndex = currentIndex + ((command == 'leftTab') ? -1 : 1);
	if (newIndex < 0) {
		newIndex = (options.wrapFirstLast) ? (tabs.length - 1) : 0;
	}
	else if (newIndex >= tabs.length) {
		newIndex = (options.wrapFirstLast) ? 0 : (tabs.length - 1);
	}

	// Get id for new window & new tab
	const windowId = tabs[newIndex].windowId;
	const tabId = tabs[newIndex].tabId;

	// Switch window & tab
	if (windowId) {
		await chrome.windows.update(windowId, {focused: true});
	}
	chrome.tabs.update(tabId, {active: true});
}
chrome.commands.onCommand.addListener(switchTab);
