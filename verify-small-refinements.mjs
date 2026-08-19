const port = 9224;
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
  const result = await send('Runtime.evaluate', { expression, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
};
const waitFor = async (expression, timeout = 5000) => {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await evaluate(expression)) return;
    await sleep(25);
  }
  throw new Error(`Timeout: ${expression}`);
};

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1707, height: 817, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: appUrl });
await waitFor(`document.querySelectorAll('.site-nav button').length === 3`);
await evaluate(`document.querySelectorAll('.site-nav button')[1].click()`);
await waitFor(`!!document.querySelector('#question')`);
await evaluate(`(() => {
  window.__copyEvidence = [];
  const capture = () => {
    const ritual = document.querySelector('.draw-ritual');
    if (!ritual || !/is-(spinning|revealing|revealed)/.test(ritual.className)) return;
    if (window.__copyEvidence.at(-1)?.stage === ritual.className) return;
    const visibleTexts = [...document.querySelectorAll('.ritual-card-panel *')]
      .filter((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 1 && rect.height > 1 && element.children.length === 0 && element.textContent.trim();
      })
      .map((element) => element.textContent.trim());
    const sr = document.querySelector('.ritual-card-panel .sr-only');
    window.__copyEvidence.push({ stage: ritual.className, visibleTexts, srText: sr?.textContent.trim(), srRect: sr ? { width: sr.getBoundingClientRect().width, height: sr.getBoundingClientRect().height } : null });
  };
  new MutationObserver(capture).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
  const textarea = document.querySelector('#question');
  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(textarea, '验证动画文字已移除');
  textarea.dispatchEvent(new InputEvent('input', { bubbles: true }));
})()`);
await waitFor(`!document.querySelector('.button-row .btn.primary').disabled`);
await evaluate(`document.querySelector('.button-row .btn.primary').click()`);
await waitFor(`!!document.querySelector('.result-page')`);
const ritual = await evaluate(`window.__copyEvidence`);

await evaluate(`document.querySelectorAll('.site-nav button')[2].click()`);
await waitFor(`document.querySelectorAll('.gallery-card').length === 78`);
const gallery = await evaluate(`(() => {
  const card = document.querySelector('.gallery-card');
  const image = card.querySelector('img');
  const copy = card.querySelector('div');
  const title = card.querySelector('strong');
  const subtitle = card.querySelector('span');
  const pseudo = getComputedStyle(card, '::after');
  return {
    count: document.querySelectorAll('.gallery-card').length,
    columns: getComputedStyle(document.querySelector('.gallery-grid')).gridTemplateColumns.split(' ').filter(Boolean).length,
    card: { background: getComputedStyle(card).backgroundColor, backgroundImage: getComputedStyle(card).backgroundImage, border: getComputedStyle(card).border, boxShadow: getComputedStyle(card).boxShadow },
    image: { border: getComputedStyle(image).border, boxShadow: getComputedStyle(image).boxShadow },
    copy: { background: getComputedStyle(copy).backgroundColor, borderTop: getComputedStyle(copy).borderTop },
    titleColor: getComputedStyle(title).color,
    subtitleColor: getComputedStyle(subtitle).color,
    pseudoContent: pseudo.content,
  };
})()`);
await evaluate(`document.querySelector('.gallery-card').click()`);
await waitFor(`!!document.querySelector('[role=dialog]')`);
gallery.modalOpened = true;
await evaluate(`document.querySelector('.modal-close').click()`);
gallery.modalClosed = await evaluate(`!document.querySelector('[role=dialog]')`);

console.log(JSON.stringify({ ritual, gallery }, null, 2));
socket.close();
await fetch(`http://127.0.0.1:${port}/json/close/${target.id}`);
