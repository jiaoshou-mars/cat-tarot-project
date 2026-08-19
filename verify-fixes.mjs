const port = 9225;
const appUrl = 'http://127.0.0.1:5173/';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const target = await (await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(appUrl)}`, { method: 'PUT' })).json();
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});
let id = 0;
const pending = new Map();
socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (!message.id || !pending.has(message.id)) return;
  const { resolve, reject } = pending.get(message.id);
  pending.delete(message.id);
  message.error ? reject(new Error(message.error.message)) : resolve(message.result);
});
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const requestId = ++id;
  pending.set(requestId, { resolve, reject });
  socket.send(JSON.stringify({ id: requestId, method, params }));
});
const evaluate = async (expression) => {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text + JSON.stringify(result.exceptionDetails.exception?.description || ''));
  return result.result.value;
};
const waitFor = async (expression, timeout = 8000) => {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await evaluate(expression)) return;
    await sleep(50);
  }
  throw new Error(`Timeout: ${expression}`);
};

await send('Page.enable');
await send('Runtime.enable');
await send('Page.navigate', { url: appUrl });
await waitFor(`document.querySelectorAll('.site-nav button').length === 3`);

const report = {};

// Fix 3: include-minor checkbox default checked on reading page
await evaluate(`document.querySelectorAll('.site-nav button')[1].click()`);
await waitFor(`!!document.querySelector('#question')`);
report.minorCheckboxDefaultChecked = await evaluate(`document.querySelector('.switch-row input[type=checkbox]').checked`);

// Fix 1: gallery all tab now includes extra cards (78 + 5 = 83)
await evaluate(`document.querySelectorAll('.site-nav button')[2].click()`);
await waitFor(`document.querySelectorAll('.gallery-card').length === 83`);
report.allTab = await evaluate(`(() => {
  const cards = [...document.querySelectorAll('.gallery-card')];
  const extraTitles = cards.slice(-5).map((card) => card.querySelector('strong')?.textContent);
  return {
    total: cards.length,
    standardCards: cards.length - 5,
    extraTitles,
    extraAreButtons: cards.slice(-5).every((card) => card.tagName === 'BUTTON'),
  };
})()`);

// Fix 2: extra card click opens big-image modal (from all tab)
await evaluate(`document.querySelectorAll('.gallery-card')[78].click()`);
await waitFor(`!!document.querySelector('.extra-modal[role=dialog]')`);
report.extraModalFromAllTab = await evaluate(`(() => {
  const modal = document.querySelector('.extra-modal');
  const image = modal.querySelector('img');
  const rect = image.getBoundingClientRect();
  return {
    title: modal.querySelector('h2')?.textContent,
    imageLoaded: image.complete && image.naturalWidth > 0,
    renderedSize: { width: Math.round(rect.width), height: Math.round(rect.height) },
    naturalSize: { width: image.naturalWidth, height: image.naturalHeight },
    objectFit: getComputedStyle(image).objectFit,
  };
})()`);
await evaluate(`document.querySelector('.extra-modal .modal-close').click()`);
report.extraModalClosed = await evaluate(`!document.querySelector('.extra-modal')`);

// Fix 2 (extra tab): same behavior via the dedicated filter
await evaluate(`[...document.querySelectorAll('.filter-bar button')].find((button) => button.textContent === '艺术卡').click()`);
await waitFor(`document.querySelectorAll('.gallery-card').length === 5`);
report.extraTab = await evaluate(`(() => {
  const cards = [...document.querySelectorAll('.gallery-card')];
  return { total: cards.length, allClickable: cards.every((card) => card.tagName === 'BUTTON') };
})()`);
await evaluate(`document.querySelectorAll('.gallery-card')[2].click()`);
await waitFor(`!!document.querySelector('.extra-modal[role=dialog]')`);
report.extraModalFromExtraTab = await evaluate(`(() => {
  const image = document.querySelector('.extra-modal img');
  return { imageLoaded: image.complete && image.naturalWidth > 0, title: document.querySelector('.extra-modal h2')?.textContent };
})()`);
await evaluate(`document.querySelector('.extra-modal .modal-close').click()`);

// Regression: standard card modal still works from all tab
await evaluate(`[...document.querySelectorAll('.filter-bar button')].find((button) => button.textContent === '全部').click()`);
await waitFor(`document.querySelectorAll('.gallery-card').length === 83`);
await evaluate(`document.querySelectorAll('.gallery-card')[0].click()`);
await waitFor(`!!document.querySelector('.modal-card:not(.extra-modal)[role=dialog]')`);
report.standardModalWorks = await evaluate(`(() => {
  const modal = document.querySelector('.modal-card:not(.extra-modal)');
  const image = modal.querySelector('img');
  const headings = [...modal.querySelectorAll('h3')].map((h) => h.textContent);
  return { title: modal.querySelector('h2')?.textContent, imageLoaded: image.complete && image.naturalWidth > 0, meaningBlocks: headings };
})()`);

console.log(JSON.stringify(report, null, 2));
socket.close();
await fetch(`http://127.0.0.1:${port}/json/close/${target.id}`);
