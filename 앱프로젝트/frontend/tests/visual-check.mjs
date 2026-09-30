import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';

const previewUrl = 'http://localhost:5174/';

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-webgl',
    '--use-fake-device-for-media-stream',
    '--use-fake-ui-for-media-stream',
  ],
});

async function newPage(options) {
  const page = await browser.newPage(options);
  await page.route('https://fonts.googleapis.com/**', (route) => route.fulfill({
    status: 200, contentType: 'text/css', body: '',
  }));
  return page;
}

function changedPixels(before, after, width, height) {
  let count = 0;
  for (let y = Math.floor(height * 0.2); y < Math.floor(height * 0.82); y += 3) {
    for (let x = Math.floor(width * 0.4); x < Math.floor(width * 0.9); x += 3) {
      const i = (y * width + x) * 4;
      if (Math.abs(before.data[i] - after.data[i]) +
          Math.abs(before.data[i + 1] - after.data[i + 1]) +
          Math.abs(before.data[i + 2] - after.data[i + 2]) > 25) count++;
    }
  }
  return count;
}

try {
  for (const [name, width, height] of [
    ['desktop', 1440, 900],
    ['tablet', 1024, 768],
    ['phone-landscape', 844, 390],
    ['mobile', 390, 844],
  ]) {
    const page = await newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(previewUrl, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: '나중에' }).click();
    await page.locator('canvas').waitFor();
    assert.equal(await page.locator('#driver-pane, #driver-video, #camera-toggle').count(), 0, `${name}: camera UI still exists`);
    await page.waitForTimeout(800);

    const path = join(tmpdir(), `passenger-${name}.png`);
    const image = PNG.sync.read(await page.screenshot({ path }));
    const colors = new Set();
    let nonBackground = 0;
    for (let y = Math.floor(height * 0.15); y < Math.floor(height * 0.82); y += 8) {
      for (let x = Math.floor(width * 0.38); x < Math.floor(width * 0.92); x += 8) {
        const i = (y * width + x) * 4;
        const [r, g, b] = image.data.subarray(i, i + 3);
        colors.add(`${r >> 4},${g >> 4},${b >> 4}`);
        if (Math.abs(r - 229) + Math.abs(g - 234) + Math.abs(b - 229) > 40) nonBackground++;
      }
    }

    const webgl = await page.locator('canvas').evaluate((canvas) => Boolean(canvas.getContext('webgl2')));
    assert.equal(webgl, true, `${name}: WebGL 2 unavailable`);
    assert.ok(colors.size > 20 && nonBackground > 100, `${name}: 3D scene looks blank`);
    assert.deepEqual(errors, [], `${name}: browser errors`);
    await page.waitForTimeout(1000);
    const later = PNG.sync.read(await page.screenshot());
    const movingPixels = changedPixels(image, later, width, height);
    assert.ok(movingPixels > 20, `${name}: character animation looks static`);

    let dragPixels = 0;
    if (name === 'desktop') {
      await page.mouse.move(width * 0.58, height * 0.5);
      await page.mouse.down();
      await page.mouse.move(width * 0.69, height * 0.5, { steps: 12 });
      await page.mouse.up();
      await page.waitForTimeout(350);
      dragPixels = changedPixels(later, PNG.sync.read(await page.screenshot()), width, height);
      assert.ok(dragPixels > 100, 'desktop: drag did not change camera view');
    }
    console.log(`${name}: ${colors.size} colors, ${nonBackground} scene pixels, ${movingPixels} animated pixels, ${dragPixels} drag pixels, ${path}`);
    await page.close();
  }

  const speechPage = await newPage({ viewport: { width: 1440, height: 900 } });
  await speechPage.addInitScript(() => {
    class MockSpeechRecognition {
      constructor() { window.mockSpeechRecognition = this; }
      start() { this.onstart?.(); }
      abort() { this.onend?.(); }
      emit(transcript) {
        const result = [{ transcript }];
        result.isFinal = true;
        this.onresult?.({ resultIndex: 0, results: [result] });
      }
    }
    window.SpeechRecognition = MockSpeechRecognition;
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { watchPosition: () => 7, clearWatch: () => {} },
    });
  });
  await speechPage.goto(previewUrl, { waitUntil: 'domcontentloaded' });
  await speechPage.locator('#session-consent[open]').waitFor();
  await speechPage.getByRole('button', { name: '나중에' }).click();
  await speechPage.getByRole('button', { name: '기능 시작' }).click();
  await speechPage.locator('#session-consent[open]').waitFor();
  await speechPage.getByRole('button', { name: '동의하고 시작' }).click();
  assert.equal(await speechPage.locator('#speech-state').textContent(), '듣는 중');
  assert.equal(await speechPage.locator('#speed-state').textContent(), 'GPS 연결 중');
  assert.equal(await speechPage.locator('#session-start').isHidden(), true);

  const beforeDeparture = PNG.sync.read(await speechPage.screenshot());
  await speechPage.getByRole('button', { name: '출발' }).click();
  assert.equal(await speechPage.locator('#passenger-pane').getAttribute('data-motion'), 'departure');
  await speechPage.waitForTimeout(140);
  const departurePixels = changedPixels(beforeDeparture, PNG.sync.read(await speechPage.screenshot()), 1440, 900);
  assert.ok(departurePixels > 100, 'departure: cabin did not visibly jolt');
  await speechPage.waitForTimeout(1250);
  assert.equal(await speechPage.locator('#passenger-pane').getAttribute('data-motion'), 'stationary');

  await speechPage.evaluate(() => window.mockSpeechRecognition.emit('아 정말 짜증 나'));
  assert.equal(await speechPage.locator('#passenger-pane').getAttribute('data-expression'), 'concerned');
  const concernedPath = join(tmpdir(), 'passenger-concerned.png');
  await speechPage.screenshot({ path: concernedPath });

  await speechPage.evaluate(() => window.mockSpeechRecognition.emit('고마워'));
  assert.equal(await speechPage.locator('#passenger-pane').getAttribute('data-expression'), 'warm');
  const warmPath = join(tmpdir(), 'passenger-warm.png');
  await speechPage.screenshot({ path: warmPath });

  await speechPage.evaluate(() => window.mockSpeechRecognition.emit('아 깜짝이야!'));
  assert.equal(await speechPage.locator('#passenger-pane').getAttribute('data-expression'), 'surprised');
  await speechPage.waitForTimeout(400);
  const surprisedPath = join(tmpdir(), 'passenger-surprised.png');
  await speechPage.screenshot({ path: surprisedPath });

  await speechPage.evaluate(() => window.mockSpeechRecognition.emit('저기 신호등이 있네'));
  assert.equal(await speechPage.locator('#passenger-pane').getAttribute('data-expression'), 'attentive');
  await speechPage.getByRole('button', { name: '과속' }).click();
  assert.equal(await speechPage.locator('#passenger-pane').getAttribute('data-expression'), 'concerned');
  assert.equal(await speechPage.locator('#passenger-pane').getAttribute('data-scenario'), 'speeding');
  assert.equal(await speechPage.locator('#passenger-state-text').textContent(), '과속 시뮬레이션');
  const speedingPath = join(tmpdir(), 'passenger-simulated-speeding.png');
  await speechPage.waitForTimeout(400);
  await speechPage.screenshot({ path: speedingPath });

  await speechPage.getByRole('button', { name: '급정거' }).click();
  assert.equal(await speechPage.locator('#passenger-pane').getAttribute('data-expression'), 'surprised');
  assert.equal(await speechPage.locator('#passenger-pane').getAttribute('data-scenario'), 'braking');
  assert.equal(await speechPage.locator('#passenger-state-text').textContent(), '급정거 시뮬레이션');
  await speechPage.evaluate(() => window.mockSpeechRecognition.emit('고마워'));
  assert.equal(await speechPage.locator('#passenger-pane').getAttribute('data-expression'), 'surprised');
  await speechPage.waitForTimeout(350);
  const brakingPath = join(tmpdir(), 'passenger-simulated-braking.png');
  await speechPage.screenshot({ path: brakingPath });
  await speechPage.waitForTimeout(4600);
  assert.equal(await speechPage.locator('#passenger-pane').getAttribute('data-scenario'), 'none');
  assert.equal(await speechPage.locator('#passenger-pane').getAttribute('data-expression'), 'neutral');
  await speechPage.evaluate(() => window.mockSpeechRecognition.onerror?.({ error: 'not-allowed' }));
  assert.equal(await speechPage.locator('#speech-state').textContent(), '마이크 권한 거부됨');
  await speechPage.getByRole('button', { name: '기능 다시 연결' }).click();
  assert.equal(await speechPage.locator('#speech-state').textContent(), '듣는 중');
  console.log(`speech and simulations: concerned, warm, surprised, attentive, speeding, braking passed; ${concernedPath}; ${warmPath}; ${surprisedPath}; ${speedingPath}; ${brakingPath}`);
  await speechPage.close();

  for (const [name, width, height] of [['desktop', 1440, 900], ['mobile', 390, 844], ['narrow', 320, 700], ['compact', 280, 650]]) {
    const speedPage = await newPage({ viewport: { width, height } });
    await speedPage.addInitScript(() => {
      const geo = {
        watchPosition(success, error, options) {
          window.testGeo = { success, error, options };
          return 7;
        },
        clearWatch(id) { window.clearedGeoWatch = id; },
      };
      Object.defineProperty(navigator, 'geolocation', { configurable: true, value: geo });
      class MockSpeechRecognition {
        start() { this.onstart?.(); }
        abort() { this.onend?.(); }
      }
      window.SpeechRecognition = MockSpeechRecognition;
    });
    await speedPage.goto(previewUrl, { waitUntil: 'domcontentloaded' });
    await speedPage.locator('#session-consent[open]').waitFor();
    if (name === 'compact') {
      const consentPath = join(tmpdir(), 'passenger-consent-compact.png');
      await speedPage.screenshot({ path: consentPath });
      console.log(`compact consent: ${consentPath}`);
    }
    assert.equal(await speedPage.locator('#speed-state').textContent(), '시작 전');
    await speedPage.getByRole('button', { name: '동의하고 시작' }).click();
    assert.equal(await speedPage.locator('#speed-state').textContent(), 'GPS 연결 중');
    assert.deepEqual(await speedPage.evaluate(() => window.testGeo.options), {
      enableHighAccuracy: true, maximumAge: 0, timeout: 12000,
    });
    if (name === 'desktop') {
      await speedPage.evaluate(() => window.testGeo.success({
        coords: { latitude: 37, longitude: 127, speed: 0, accuracy: 5 }, timestamp: 100,
      }));
      assert.equal(await speedPage.locator('#passenger-pane').getAttribute('data-motion'), 'stationary');
      await speedPage.evaluate(() => window.testGeo.success({
        coords: { latitude: 37, longitude: 127, speed: 5 / 3.6, accuracy: 5 }, timestamp: 200,
      }));
      assert.equal(await speedPage.locator('#passenger-pane').getAttribute('data-motion'), 'departure');
    }
    await speedPage.evaluate(() => window.testGeo.success({
      coords: { latitude: 37, longitude: 127, speed: 13.9, accuracy: 5 }, timestamp: 1000,
    }));
    assert.equal(await speedPage.locator('#speed-value').textContent(), '50');
    assert.equal(await speedPage.locator('#speed-state').textContent(), '측정 중');
    assert.equal(await speedPage.locator('#passenger-pane').getAttribute('data-speeding'), 'false');
    await speedPage.evaluate(() => window.testGeo.success({
      coords: { latitude: 37, longitude: 127, speed: 51 / 3.6, accuracy: 5 }, timestamp: 2000,
    }));
    assert.equal(await speedPage.locator('#speed-value').textContent(), '51');
    assert.equal(await speedPage.locator('#passenger-pane').getAttribute('data-speeding'), 'true');
    assert.equal(await speedPage.locator('#passenger-pane').getAttribute('data-expression'), 'concerned');
    assert.equal(await speedPage.locator('#passenger-state-text').textContent(), '실험 기준 초과');
    await speedPage.evaluate(() => window.testGeo.success({
      coords: { latitude: 37, longitude: 127, speed: 50 / 3.6, accuracy: 5 }, timestamp: 3000,
    }));
    assert.equal(await speedPage.locator('#speed-value').textContent(), '50');
    assert.equal(await speedPage.locator('#passenger-pane').getAttribute('data-speeding'), 'false');
    assert.equal(await speedPage.locator('#passenger-pane').getAttribute('data-expression'), 'neutral');
    await speedPage.getByRole('button', { name: '과속' }).click();
    assert.equal(await speedPage.locator('#speed-value').textContent(), '50');
    await speedPage.getByRole('button', { name: '급정거' }).click();
    assert.equal(await speedPage.locator('#speed-value').textContent(), '50');
    if (name === 'desktop') {
      await speedPage.evaluate(() => window.testGeo.success({
        coords: { latitude: 37, longitude: 127, speed: 51 / 3.6, accuracy: 5 }, timestamp: 4000,
      }));
      assert.equal(await speedPage.locator('#passenger-pane').getAttribute('data-scenario'), 'braking');
      assert.equal(await speedPage.locator('#passenger-pane').getAttribute('data-expression'), 'surprised');
      await speedPage.evaluate(() => {
        window.keepSpeedTimestamp = 4000;
        window.keepSpeed = setInterval(() => {
          window.keepSpeedTimestamp += 1000;
          window.testGeo.success({
            coords: { latitude: 37, longitude: 127, speed: 51 / 3.6, accuracy: 5 },
            timestamp: window.keepSpeedTimestamp,
          });
        }, 1000);
      });
      await speedPage.waitForTimeout(4600);
      assert.equal(await speedPage.locator('#passenger-pane').getAttribute('data-scenario'), 'none');
      assert.equal(await speedPage.locator('#passenger-pane').getAttribute('data-expression'), 'concerned');
      await speedPage.evaluate(() => clearInterval(window.keepSpeed));
    }
    const speedPath = join(tmpdir(), `passenger-speed-${name}.png`);
    await speedPage.screenshot({ path: speedPath });

    const topbar = await speedPage.evaluate(() => {
      const bounds = (selector) => {
        const { left, right, top, bottom } = document.querySelector(selector).getBoundingClientRect();
        return { left, right, top, bottom };
      };
      return {
        brand: bounds('.brand'), meter: bounds('#speedometer'), button: bounds('#session-start'),
        scrollWidth: document.documentElement.scrollWidth, viewportWidth: window.innerWidth,
      };
    });
    assert.ok(topbar.brand.right <= topbar.meter.left, `${name}: speed overlaps brand`);
    assert.ok(topbar.meter.right <= topbar.viewportWidth, `${name}: speed outside viewport`);
    assert.ok(topbar.scrollWidth <= topbar.viewportWidth, `${name}: horizontal overflow`);

    await speedPage.evaluate(() => window.testGeo.success({
      coords: { latitude: 37, longitude: 127.001, speed: null, accuracy: 5 },
      timestamp: window.keepSpeedTimestamp ? window.keepSpeedTimestamp + 5000 : 6000,
    }));
    assert.equal(await speedPage.locator('#speed-state').textContent(), '위치로 추정');
    await speedPage.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    assert.equal(await speedPage.locator('#speed-state').textContent(), '일시 중지');
    assert.equal(await speedPage.locator('#speech-state').textContent(), '일시 중지');
    assert.equal(await speedPage.locator('#speed-value').textContent(), '--');
    assert.equal(await speedPage.locator('#passenger-pane').getAttribute('data-speeding'), 'false');
    assert.equal(await speedPage.evaluate(() => window.clearedGeoWatch), 7);
    await speedPage.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: false });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    assert.equal(await speedPage.locator('#speed-state').textContent(), 'GPS 연결 중');
    assert.equal(await speedPage.locator('#speech-state').textContent(), '듣는 중');
    await speedPage.evaluate(() => window.testGeo.error({ code: 1 }));
    assert.equal(await speedPage.locator('#speed-state').textContent(), '위치 권한 거부됨');
    assert.equal(await speedPage.locator('#speedometer').getAttribute('data-state'), 'off');
    assert.equal(await speedPage.evaluate(() => window.clearedGeoWatch), 7);
    assert.equal(await speedPage.getByRole('button', { name: '기능 다시 연결' }).isVisible(), true);
    console.log(`speed ${name}: auto start, direct, estimate, simulated events, pause/resume, denied and layout passed; ${speedPath}`);
    await speedPage.close();
  }

  const unsupportedPage = await newPage();
  await unsupportedPage.addInitScript(() => {
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: undefined });
    window.SpeechRecognition = undefined;
    window.webkitSpeechRecognition = undefined;
  });
  await unsupportedPage.goto(previewUrl, { waitUntil: 'domcontentloaded' });
  await unsupportedPage.getByRole('button', { name: '동의하고 시작' }).click();
  assert.equal(await unsupportedPage.locator('#speed-state').textContent(), '위치 미지원');
  assert.equal(await unsupportedPage.locator('#speech-state').textContent(), '음성 인식 미지원');
  await unsupportedPage.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  assert.equal(await unsupportedPage.locator('#speed-state').textContent(), '위치 미지원');
  assert.equal(await unsupportedPage.locator('#speech-state').textContent(), '음성 인식 미지원');
  console.log('unsupported APIs: status remains informative across visibility changes');
  await unsupportedPage.close();
} finally {
  await browser.close();
}
