const lastVisitedHostnames = {};

// eslint-disable-next-line no-undef
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
	if (changeInfo.status && changeInfo.status === "complete" && tab.url.startsWith("http")) {
		const currentHostname = new URL(tab.url).hostname;

		if (lastVisitedHostnames[tabId] && lastVisitedHostnames[tabId] === currentHostname) {
			return; // Do not proceed further as it's not considered a new navigation
		}

		lastVisitedHostnames[tabId] = currentHostname;
		checkIfTabAllowed(tab.url, tab.id);
	}
});

// eslint-disable-next-line no-undef
browser.tabs.onRemoved.addListener((tabId) => {
	delete lastVisitedHostnames[tabId];
});

function checkIfTabAllowed(url, tabId) {
	const hostname = new URL(url).hostname;
	// eslint-disable-next-line no-undef
	browser.storage.local.get(hostname).then((data) => {
		if (data) {
			const siteData = data[hostname];

			if (!siteData) {
				return;
			}

			const interval = siteData.interval;

			// If it was opened at some point
			if (siteData.lastOpenedOnAt) {
				const now = new Date(Date.now());
				const lastOpenedOnAt = new Date(siteData.lastOpenedOnAt);

				// Reset if the last opened time was already outside an interval
				if (isInInterval(now, lastOpenedOnAt, interval)) {
					siteData.opened = 0;
				} else {
					// If it is in the interval check if its within limits
					if (siteData.opened >= siteData.limit) {
						closeTab(tabId);
						return;
					}
				}
			}

			siteData.opened++;
			siteData.lastOpenedOnAt = Date.now();
			// eslint-disable-next-line no-undef
			browser.storage.local.set(data);
		}
	});
}

// Determine if the current time is inside the interval (last opened + interval)
function isInInterval(now, lastOpenedOnAt, interval) {
	if (interval === "h") {
		return lastOpenedOnAt.setHours(lastOpenedOnAt.getHours() + 1) < now;
	} else if (interval === "d") {
		return lastOpenedOnAt.setHours(lastOpenedOnAt.getHours() + 24) < now;
	}
	return true;
}

function closeTab(tabId) {
	// eslint-disable-next-line no-undef
	browser.tabs.remove(tabId);
}
