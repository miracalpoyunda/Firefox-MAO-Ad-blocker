const GOOGLE_DOMAINS = [
  'youtube.com', 'youtu.be', 'google.com', 'google.com.tr',
  'drive.google.com', 'docs.google.com', 'mail.google.com', 'meet.google.com'
];

const $ = (id) => document.getElementById(id);

function hasThirdPartyCookieSetting() {
  return Boolean(browser.privacy?.websites?.thirdPartyCookiesAllowed);
}

function updateCookieUI() {
  const supported = hasThirdPartyCookieSetting();
  $('thirdPartyCookies').disabled = !supported;
  $('clearCookies').disabled = false;
  if (!supported) {
    $('mobileNotice').style.display = 'block';
    $('mobileNotice').textContent = 'Firefox for Android bu özel çerez ayarını sunmuyorsa yalnızca filtreler ve çerez temizleme özelliği kullanılabilir.';
  } else {
    $('mobileNotice').style.display = 'none';
  }
}

async function load() {
  const data = await browser.storage.local.get({
    enabledFilters: ['ads'],
    exceptions: [],
    thirdPartyCookies: false
  });

  for (const id of ['ads', 'trackers', 'social']) {
    $(id).checked = data.enabledFilters.includes(id);
  }

  const googleEnabled = GOOGLE_DOMAINS.every(d => data.exceptions.includes(d));
  $('googleServices').checked = googleEnabled;
  updateCookieUI();
  $('thirdPartyCookies').checked = hasThirdPartyCookieSetting() && data.thirdPartyCookies;
  renderSites(data.exceptions.filter(d => !GOOGLE_DOMAINS.includes(d)));
}

function renderSites(sites) {
  const box = $('sites');
  box.innerHTML = '';
  for (const site of sites) {
    const row = document.createElement('div');
    row.className = 'site';
    const span = document.createElement('span');
    span.textContent = site;
    span.style.flex = '1';
    const btn = document.createElement('button');
    btn.className = 'danger';
    btn.textContent = 'Sil';
    btn.onclick = async () => {
      const data = await browser.storage.local.get({ exceptions: [] });
      await browser.storage.local.set({ exceptions: data.exceptions.filter(x => x !== site) });
      load();
    };
    row.append(span, btn);
    box.appendChild(row);
  }
}

$('add').onclick = async () => {
  let domain = $('domain').value.trim().toLowerCase();
  domain = domain.replace(/^https?:\/\//, '').split('/')[0];
  if (!domain || !domain.includes('.')) return;

  const data = await browser.storage.local.get({ exceptions: [] });
  if (!data.exceptions.includes(domain)) data.exceptions.push(domain);
  await browser.storage.local.set({ exceptions: data.exceptions });
  $('domain').value = '';
  load();
};

$('save').onclick = async () => {
  const enabledFilters = ['ads', 'trackers', 'social'].filter(id => $(id).checked);
  const data = await browser.storage.local.get({ exceptions: [] });
  let exceptions = data.exceptions.filter(d => !GOOGLE_DOMAINS.includes(d));
  if ($('googleServices').checked) exceptions = [...new Set([...exceptions, ...GOOGLE_DOMAINS])];

  await browser.storage.local.set({
    enabledFilters,
    exceptions,
    thirdPartyCookies: $('thirdPartyCookies').checked
  });

  const result = await browser.runtime.sendMessage({ type: 'apply-settings' });
  $('status').textContent = result?.ok ? 'Ayarlar uygulandı.' : 'Ayarlar uygulanamadı.';
  load();
};

$('clearCookies').onclick = async () => {
  $('cookieStatus').textContent = 'Çerezler temizleniyor...';
  const result = await browser.runtime.sendMessage({ type: 'clear-cookies' });
  $('cookieStatus').textContent = result?.ok
    ? 'Tüm kayıtlı çerezler temizlendi.'
    : 'Çerezler temizlenemedi.';
};

load();
