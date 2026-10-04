const FILTER_IDS = {
  ads: 'ads_basic',
  trackers: 'trackers_basic',
  social: 'social_basic'
};

const DEFAULTS = {
  enabledFilters: ['ads'],
  exceptions: [],
  thirdPartyCookies: false
};

async function getSettings() {
  return await browser.storage.local.get(DEFAULTS);
}

async function applyFilters() {
  const { enabledFilters } = await getSettings();

  const enableRulesetIds = [];
  const disableRulesetIds = [];

  for (const [key, id] of Object.entries(FILTER_IDS)) {
    (enabledFilters.includes(key) ? enableRulesetIds : disableRulesetIds).push(id);
  }

  await browser.declarativeNetRequest.updateEnabledRulesets({
    enableRulesetIds,
    disableRulesetIds
  });
}

async function applyThirdPartyCookies() {
  const { thirdPartyCookies } = await getSettings();
  if (!browser.privacy?.websites?.thirdPartyCookiesAllowed) return;

  try {
    await browser.privacy.websites.thirdPartyCookiesAllowed.set({
      value: !thirdPartyCookies
    });
  } catch (error) {
    // Incognito mode or a managed Chrome profile may reject this setting.
    console.warn('3. taraf çerez ayarı uygulanamadı:', error);
  }
}

async function applyAll() {
  await applyFilters();
  await applyThirdPartyCookies();
}

browser.runtime.onInstalled.addListener(async () => {
  const current = await browser.storage.local.get(DEFAULTS);
  await browser.storage.local.set({
    enabledFilters: current.enabledFilters || DEFAULTS.enabledFilters,
    exceptions: current.exceptions || DEFAULTS.exceptions,
    thirdPartyCookies: current.thirdPartyCookies ?? DEFAULTS.thirdPartyCookies
  });
  await applyAll();
});

browser.runtime.onStartup.addListener(applyAll);

browser.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes.enabledFilters || changes.thirdPartyCookies) {
    applyAll().catch(console.error);
  }
});

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'apply-settings') {
    applyAll().then(() => sendResponse({ ok: true })).catch((error) => {
      console.error(error);
      sendResponse({ ok: false, error: String(error) });
    });
    return true;
  }

  if (message?.type === 'clear-cookies') {
    browser.browsingData.remove({}, { cookies: true })
      .then(() => sendResponse({ ok: true }))
      .catch((error) => {
        console.error(error);
        sendResponse({ ok: false, error: String(error) });
      });
    return true;
  }
});
