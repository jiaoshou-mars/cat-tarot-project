import fs from 'node:fs/promises';

const cdpPort = 9224;
const appUrl = 'http://127.0.0.1:5173/';
const screenshotPath = 'D:/AI Projects/cat tarot/app/verification-gallery.png';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function newPage(url = appUrl) {
  const response = await fetch(`http://127.0.0.1:${cdpPort}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
  if (!response.ok) throw new Error(`Unable to create page: ${response.status}`);
  const target = await response.json();
  return target;
}

async function connect(target) {
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  const pending = new Map();
  let id = 0;
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (!message.id) return;
    const entry = pending.get(message.id);
    if (!entry) return;
    pending.delete(message.id);
    if (message.error) entry.reject(new Error(message.error.message));
    else entry.resolve(message.result);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const requestId = ++id;
    pending.set(requestId, { resolve, reject });
    socket.send(JSON.stringify({ id: requestId, method, params }));
  });
  return { socket, send };
}

async function evaluate(send, expression, awaitPromise = false) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

async function waitFor(send, expression, timeout = 5000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await evaluate(send, expression)) return;
    await delay(25);
  }
  throw new Error(`Timed out waiting for ${expression}`);
}

async function setupPage(width, height, reducedMotion = false) {
  const target = await newPage();
  const connection = await connect(target);
  await connection.send('Page.enable');
  await connection.send('Runtime.enable');
  await connection.send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width <= 560,
  });
  await connection.send('Page.navigate', { url: appUrl });
  await waitFor(connection.send, `document.readyState === 'complete'`);
  await waitFor(connection.send, `document.querySelectorAll('.site-nav button').length === 3`);
  await connection.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: reducedMotion ? 'reduce' : 'no-preference' }],
  });
  return { target, ...connection };
}

async function closePage(socket, targetId) {
  socket.close();
  await fetch(`http://127.0.0.1:${cdpPort}/json/close/${targetId}`);
}

async function verifyRitual() {
  const { target, socket, send } = await setupPage(1707, 817);
  await evaluate(send, `document.querySelectorAll('.site-nav button')[1].click()`);
  await waitFor(send, `!!document.querySelector('#question')`);
  await evaluate(send, `(() => {
    window.__ritualEvidence = [];
    const capture = () => {
      const ritual = document.querySelector('.draw-ritual');
      if (!ritual || !/is-(spinning|revealing|revealed)/.test(ritual.className)) return;
      const className = ritual.className;
      if (window.__ritualEvidence.at(-1)?.className === className) return;
      const panel = document.querySelector('.ritual-card-panel')?.getBoundingClientRect();
      const card = document.querySelector('.ritual-card-panel .tarot-card-shell')?.getBoundingClientRect();
      const cover = document.querySelector('.tarot-card-concealment');
      const inner = document.querySelector('.tarot-card-inner');
      window.__ritualEvidence.push({
        className,
        viewport: { width: innerWidth, height: innerHeight },
        panel: panel ? { x: panel.x, y: panel.y, width: panel.width, height: panel.height } : null,
        card: card ? { x: card.x, y: card.y, width: card.width, height: card.height, centerX: card.x + card.width / 2, centerY: card.y + card.height / 2 } : null,
        concealmentPresent: !!cover,
        concealmentDisplay: cover ? getComputedStyle(cover).display : null,
        animationName: inner ? getComputedStyle(inner).animationName : null,
        status: document.querySelector('.ritual-status')?.textContent?.trim() || '',
        bodyOverflow: document.body.style.overflow,
      });
    };
    new MutationObserver(capture).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
    const textarea = document.querySelector('#question');
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    setter.call(textarea, '验证最后一转才显示牌面');
    textarea.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: '验证最后一转才显示牌面' }));
  })()`);
  await waitFor(send, `!document.querySelector('.button-row .btn.primary').disabled`);
  await evaluate(send, `document.querySelector('.button-row .btn.primary').click()`);
  await waitFor(send, `!!document.querySelector('.result-page')`, 5000);
  const result = await evaluate(send, `(() => ({
    stages: window.__ritualEvidence,
    result: {
      title: document.querySelector('.result-summary h1')?.textContent,
      orientation: document.querySelector('.result-orientation')?.textContent,
      meaningTitle: document.querySelector('.official-meaning-card h3')?.textContent,
      bodyOverflow: document.body.style.overflow,
      resultVisible: !!document.querySelector('.result-page')
    }
  }))()`);
  await closePage(socket, target.targetId);
  return result;
}

async function getGalleryState(send) {
  return evaluate(send, `(() => {
    const grid = document.querySelector('.gallery-grid');
    const first = document.querySelector('.gallery-card');
    const rect = first?.getBoundingClientRect();
    const style = first && getComputedStyle(first);
    return {
      viewport: { width: innerWidth, height: innerHeight },
      count: document.querySelectorAll('.gallery-card').length,
      columns: grid ? getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length : 0,
      firstCard: rect ? { width: rect.width, height: rect.height } : null,
      visual: style ? { border: style.border, borderRadius: style.borderRadius, boxShadow: style.boxShadow, backgroundImage: style.backgroundImage } : null
    };
  })()`);
}

async function verifyGalleryAt(width, height, screenshot = false) {
  const { target, socket, send } = await setupPage(width, height);
  await evaluate(send, `document.querySelectorAll('.site-nav button')[2].click()`);
  await waitFor(send, `document.querySelectorAll('.gallery-card').length === 78`);
  const initial = await getGalleryState(send);
  const counts = [];
  for (let index = 0; index < 7; index += 1) {
    await evaluate(send, `document.querySelectorAll('.filter-bar button')[${index}].click()`);
    await delay(50);
    const state = await evaluate(send, `(() => ({ label: document.querySelectorAll('.filter-bar button')[${index}].textContent.trim(), count: document.querySelectorAll('.gallery-card').length }))()`);
    counts.push(state);
  }
  await evaluate(send, `document.querySelectorAll('.filter-bar button')[0].click()`);
  await delay(50);
  await evaluate(send, `document.querySelector('.gallery-card').scrollIntoView({ block: 'center' })`);
  await delay(150);
  const image = await evaluate(send, `(() => { const image = document.querySelector('.gallery-card img'); return { complete: image.complete, naturalWidth: image.naturalWidth, src: image.src }; })()`);
  await evaluate(send, `document.querySelector('.gallery-card').click()`);
  await waitFor(send, `!!document.querySelector('[role=dialog]')`);
  const modal = await evaluate(send, `(() => ({
    visible: !!document.querySelector('[role=dialog]'),
    title: document.querySelector('[role=dialog] h2')?.textContent,
    meaningBlocks: document.querySelectorAll('[role=dialog] .meaning-block').length,
    imageLoaded: document.querySelector('[role=dialog] img')?.naturalWidth > 0
  }))()`);
  await evaluate(send, `document.querySelector('.modal-close').click()`);
  modal.closed = await evaluate(send, `!document.querySelector('[role=dialog]')`);
  if (screenshot) {
    await evaluate(send, `window.scrollTo(0, 0)`);
    const imageData = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await fs.writeFile(screenshotPath, Buffer.from(imageData.data, 'base64'));
  }
  await closePage(socket, target.targetId);
  return { initial, counts, image, modal };
}

async function verifyRitualProbe(width, height, reducedMotion = false) {
  const { target, socket, send } = await setupPage(width, height, reducedMotion);
  await evaluate(send, `document.querySelectorAll('.site-nav button')[1].click()`);
  await waitFor(send, `!!document.querySelector('#question')`);
  await evaluate(send, `(() => {
    window.__probe = { startedAt: performance.now(), stages: [] };
    const capture = () => {
      const ritual = document.querySelector('.draw-ritual');
      if (!ritual || !/is-(spinning|revealing|revealed)/.test(ritual.className)) return;
      if (window.__probe.stages.at(-1)?.className === ritual.className) return;
      const card = document.querySelector('.ritual-card-panel .tarot-card-shell')?.getBoundingClientRect();
      window.__probe.stages.push({
        className: ritual.className,
        elapsed: Math.round(performance.now() - window.__probe.startedAt),
        card: card ? { x: card.x, y: card.y, width: card.width, height: card.height, centerX: card.x + card.width / 2, centerY: card.y + card.height / 2 } : null,
        viewport: { width: innerWidth, height: innerHeight },
      });
    };
    new MutationObserver(capture).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
    const textarea = document.querySelector('#question');
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    setter.call(textarea, '验证移动端和减少动态效果');
    textarea.dispatchEvent(new InputEvent('input', { bubbles: true }));
  })()`);
  await waitFor(send, `!document.querySelector('.button-row .btn.primary').disabled`);
  await evaluate(send, `document.querySelector('.button-row .btn.primary').click()`);
  await waitFor(send, `!!document.querySelector('.result-page')`, reducedMotion ? 2000 : 5000);
  const firstResult = await evaluate(send, `(() => ({
    stages: window.__probe.stages,
    totalElapsed: Math.round(performance.now() - window.__probe.startedAt),
    resultVisible: !!document.querySelector('.result-page'),
    question: document.querySelector('.question-recap')?.textContent,
    bodyOverflow: document.body.style.overflow
  }))()`);

  await evaluate(send, `document.querySelector('.result-panel .btn.primary').click()`);
  await waitFor(send, `!!document.querySelector('#question')`);
  const redraw = await evaluate(send, `(() => ({ question: document.querySelector('#question').value, stageInput: !!document.querySelector('.reading-input-panel'), bodyOverflow: document.body.style.overflow }))()`);
  await evaluate(send, `document.querySelector('.button-row .btn.primary').click()`);
  await waitFor(send, `!!document.querySelector('.result-page')`, reducedMotion ? 2000 : 5000);
  await evaluate(send, `document.querySelector('.result-panel .btn.ghost').click()`);
  await waitFor(send, `!!document.querySelector('#question')`);
  const reset = await evaluate(send, `(() => ({ question: document.querySelector('#question').value, count: document.querySelector('.input-meta > span')?.textContent, bodyOverflow: document.body.style.overflow }))()`);
  await closePage(socket, target.targetId);
  return { firstResult, redraw, reset };
}

const report = {
  ritualMobile: await verifyRitualProbe(390, 844),
  ritualReducedMotion: await verifyRitualProbe(1000, 680, true),
};

console.log(JSON.stringify(report, null, 2));
