// tools/shoot.js -- screenshot the real game in a real browser.
//
// WHY THIS EXISTS
// ---------------
// The headless gate (tools/playtest.py) runs the canvas in JavaScriptCore. That
// verifies STRUCTURE -- sprites resolve, main.js boots 600 frames, no draw gets
// a NaN coordinate. It produces no pixels. That distinction has bitten this
// project repeatedly: a vignette could be "structurally valid" and visually
// wrong; 734 occlusion inversions could be inferred from geometry and never
// confirmed; the sprite checkerboard could be "no errors" and plainly visible
// on screen.
//
// This closes the gap. It needs Node and Playwright, which were not installed;
// see docs/MULTI-AGENT-SETUP.md. Once installed, a visual claim is a picture.
//
//   node tools/shoot.js [url] [outdir] [--play]
//
// --play drives the game: picks the first character, enters the stage, hops,
// and captures several frames so different states are visible.
//
// Every console error and page error is reported. A clean screenshot with a
// clean console is real evidence; a screenshot alone is not.

const path = require('path');
const HOME = process.env.HOME;
const { chromium } = require(path.join(HOME, '.local/pw/node_modules/playwright'));

const url = process.argv[2] && !process.argv[2].startsWith('--')
  ? process.argv[2] : 'http://localhost:8765/select.html';
const outDir = process.argv[3] && !process.argv[3].startsWith('--')
  ? process.argv[3] : '/tmp';
const play = process.argv.includes('--play');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 900, height: 760 } });

  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  page.on('requestfailed', r =>
    errs.push('REQUEST FAILED: ' + r.url() + ' — ' + (r.failure() || {}).errorText));

  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(outDir, 'shot_picker.png') });
  console.log('captured picker');

  if (play) {
    const card = await page.$('.card');
    if (card) { await card.click(); await page.waitForTimeout(400); }
    const btn = await page.$('#play-btn');
    if (btn) await btn.click();
    await page.waitForTimeout(2500);

    // Stage start needs one input from READY.
    await page.keyboard.press('Space');
    for (let i = 0; i < 8; i++) {
      await page.waitForTimeout(600);
      await page.keyboard.press('Space');
      if (i === 2) await page.screenshot({ path: path.join(outDir, 'shot_play_a.png') });
    }
    await page.screenshot({ path: path.join(outDir, 'shot_play_b.png') });
    console.log('captured gameplay frames');
  }

  // Pixel sanity: a frame that is one flat colour is a broken frame, not a
  // successful render. This is the check a draw-call count cannot make.
  const stats = await page.evaluate(() => {
    const c = document.getElementById('board');
    if (!c) return null;
    const g = c.getContext('2d');
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let min = 255, max = 0, sum = 0, n = 0;
    const seen = new Set();
    for (let i = 0; i < d.length; i += 4 * 97) {
      const l = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) | 0;
      min = Math.min(min, l); max = Math.max(max, l); sum += l; n++;
      seen.add((d[i] >> 4) + ',' + (d[i + 1] >> 4) + ',' + (d[i + 2] >> 4));
    }
    return { min, max, mean: (sum / n).toFixed(1), distinctBuckets: seen.size };
  });
  console.log('canvas pixels: ' + JSON.stringify(stats));
  if (stats && stats.distinctBuckets < 4) {
    console.log('WARNING: canvas is nearly a flat colour -- that is a broken '
              + 'frame, not a clean render.');
  }

  console.log(errs.length ? 'CONSOLE ERRORS:\n  ' + errs.join('\n  ') : 'console: clean');
  await browser.close();
})().catch(e => { console.error('FAILED: ' + e.message); process.exit(1); });