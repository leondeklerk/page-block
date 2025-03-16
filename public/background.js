const tabDomains = {};
const pending = {};

browser.tabs.onCreated.addListener((tab) => {
	tabDomains[tab.id] = "";
});

browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
	if (tab.url && tab.url.startsWith("https")) {
		const currentHostname = new URL(tab.url).hostname;

		if (tabDomains[tabId] !== currentHostname) {
			if (pending[tabId]) {
				return;
			}
			pending[tabId] = true;
			const result = await checkIfTabAllowed(tab.url, tabId);
			if (result) {
				tabDomains[tabId] = currentHostname;
			}
			pending[tabId] = false;
		}
	}
});

browser.tabs.onRemoved.addListener((tabId) => {
	delete tabDomains[tabId];
	delete pending[tabId];
});

async function checkIfTabAllowed(url, tabId) {
	const hostname = new URL(url).hostname;

	const data = await browser.storage.local.get(hostname);

	if (data) {
		const siteData = data[hostname];

		if (!siteData) {
			return true;
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
					await closeTab(tabId);
					return false;
				}
			}
		}

		siteData.opened++;
		siteData.lastOpenedOnAt = Date.now();

		await browser.storage.local.set(data);
	}
	return true;
}

// Determine if the current time is inside the interval (last opened + interval)
function isInInterval(now, lastOpenedOnAt, interval) {
	if (interval === "h") {
		return lastOpenedOnAt.setHours(lastOpenedOnAt.getHours() + 1) < now;
	} else if (interval === "d") {
		return lastOpenedOnAt.setDate(lastOpenedOnAt.getDate() + 1) < now;
	} else if (interval === "w") {
		return lastOpenedOnAt.setDate(lastOpenedOnAt.getDate() + 7) < now;
	}
	return true;
}

async function closeTab(tabId) {
	await browser.tabs.remove(tabId);
}
