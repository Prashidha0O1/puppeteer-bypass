import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import AdblockerPlugin from 'puppeteer-extra-plugin-adblocker';
import readline from 'readline';
import fs from 'fs';
import path from 'path';

puppeteer.use(StealthPlugin());
puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

const headlessMode = process.argv[2] !== 'true' ? false : true;
const targetURL = 'https://carousell.com/';

(async () => {
  const browser = await puppeteer.launch({
    headless: headlessMode,
    slowMo: 0,
    args: [
      '--window-size=1400,900',
      '--remote-debugging-port=9222',
      '--remote-debugging-address=0.0.0.0',
      '--disable-gpu',
      '--disable-features=IsolateOrigins,site-per-process',
      '--blink-settings=imagesEnabled=true'
    ]
  });

  const page = await browser.newPage();

  async function gotoPage(url: string) {
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    } catch {
      console.log(`Retrying to load: ${url}`);
      await gotoPage(url);
    }
  }

  async function waitForNetworkIdle(timeout = 3000, maxInflight = 0) {
    console.log('Waiting for network to be idle...');
    let inflight = 0;
    let resolve: () => void;
    const done = new Promise<void>(res => resolve = res);
    let timeoutId = setTimeout(finish, timeout);

    function finish() {
      page.off('request', onStart);
      page.off('requestfinished', onDone);
      page.off('requestfailed', onDone);
      resolve();
    }

    function onStart() {
      ++inflight;
      if (inflight > maxInflight) clearTimeout(timeoutId);
    }

    function onDone() {
      --inflight;
      if (inflight <= maxInflight) timeoutId = setTimeout(finish, timeout);
    }

    page.on('request', onStart);
    page.on('requestfinished', onDone);
    page.on('requestfailed', onDone);

    return done;
  }

  async function readLine(): Promise<string> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    return new Promise(resolve => {
      rl.question('Solve the CAPTCHA manually and type "yes" to continue: ', answer => {
        rl.close();
        resolve(answer.trim());
      });
    });
  }

  async function verifyCaptcha(callback: () => Promise<void>) {
    const answer = await readLine();
    if (answer.toLowerCase() === 'yes') {
      console.log('Continuing after CAPTCHA...');
      await callback();
    } else {
      console.log('Did not match. Try again.');
      await verifyCaptcha(callback);
    }
  }

  async function checkBotBlock(callback: () => Promise<void>) {
    const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 500));
    if (
      bodyText.includes('verify') ||
      bodyText.toLowerCase().includes('unusual traffic') ||
      bodyText.toLowerCase().includes('access denied')
    ) {
      console.log('[!] Bot protection triggered (captcha or IP block)');
      await verifyCaptcha(callback);
    } else {
      console.log('[✓] Page looks good');
      await callback();
    }
  }

  async function afterBypass() {
    const title = await page.title();
    console.log('Page Title:', title);

    const cookies = await page.cookies();
    console.log('Cookies:', cookies.map(c => `${c.name}=${c.value}`).join('; '));

    const screenshotPath = path.join(process.cwd(), 'carousell.png') as `${string}.png`;
    await page.screenshot({ path: screenshotPath });
    console.log(`Screenshot saved to ${screenshotPath}`);
  }

  console.log(`Navigating to ${targetURL} in ${headlessMode ? 'headless' : 'headful'} mode...`);
  await gotoPage(targetURL);
  await waitForNetworkIdle();
  await checkBotBlock(afterBypass);

  await browser.close();
})();
