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
		if (!(key in defaultOptions)) {
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
const collapsedGroupIds = new Set();
async function switchTab(command) {
	// Get options, windows with tabs, & collapsed groups
	const [options, windows, collapsedGroups] = await Promise.all([
		chrome.storage.sync.get(),
		chrome.windows.getAll({ populate: true }),
		chrome.tabGroups.query({ collapsed: true }),
	]);

	// Sort windows according to horizontal position
	if (windows.length)
		windows.sort((a, b) => a.left - b.left);

	// Get all collapsed group ids
	for (let i = 0; i < collapsedGroups.length; i++)
		collapsedGroupIds.add(collapsedGroups[i].id);

	// Make a continuous array of only some tabs
	const tabs = [];
	let currentIndex = null;
	// Each window
	for (let i = 0; i < windows.length; i++) {
		const window = windows[i];

		// Filter out minimized windows
		if (window.state === 'minimized')
			continue;

		// Filter out other windows if window-switching option is disabled
		if (!options.switchWindows && !window.focused)
			continue;

		// Each tab
		for (let j = 0; j < window.tabs.length; j++) {
			const tab = window.tabs[j];

			// Filter out tabs in collapsed groups
			if (options.skipCollapsed && collapsedGroupIds.has(tab.groupId))
				continue;

			// Remember where the current tab is in the array
			if (window.focused && tab.active)
				currentIndex = tabs.length;

			// Push important tab info to array
			tabs.push({
				windowId: window.id,
				tabId: tab.id,
			});
		}
	}

	// Skip if there is no current tab, like in DevTools
	if (currentIndex === null)
		return;

	// Change the index
	let newIndex = currentIndex + ((command === 'leftTab') ? -1 : 1);
	if (newIndex < 0)
		newIndex = (options.wrapFirstLast) ? (tabs.length - 1) : 0;
	else if (newIndex >= tabs.length)
		newIndex = (options.wrapFirstLast) ? 0 : (tabs.length - 1);

	// Get id for new window & new tab
	const windowId = tabs[newIndex].windowId;
	const tabId = tabs[newIndex].tabId;

	// Switch window & tab
	if (windowId)
		await chrome.windows.update(windowId, {focused: true});
	chrome.tabs.update(tabId, {active: true});

	// Clear all collapsed group ids
	collapsedGroupIds.clear();
}
chrome.commands.onCommand.addListener(switchTab);
