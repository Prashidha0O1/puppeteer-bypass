import definitelyNotAHuman from './definitelyNotAHuman';
import { waitForManualCaptcha } from './captchaSolver/manualSolver';
import { TARGET_URLS, USE_PROXY, PROXY, HEADLESS_MODE } from './config';
import path from 'path';
import fs from 'fs';

export async function bypass(url: string): Promise<{ url: string, cookies: string[], screenshot: string }> {
  const args = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--window-size=1400,900',
    '--disable-gpu',
    '--disable-features=IsolateOrigins,site-per-process',
    '--blink-settings=imagesEnabled=true',
  ];

  if (USE_PROXY) {
    args.push(`--proxy-server=${PROXY}`);
  }

  const browser = new definitelyNotAHuman();
  await browser.launch({
    headless: HEADLESS_MODE,
    args,
  });
  const page = browser.getPage();

  function safeFilename(url: string) {
    return url.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  }

  try {
    console.log(`🔗 Navigating to ${url}`);
    await browser.navigate(url);

    const title = await page.title();
    const bodyText = await page.evaluate(() => document.body.innerText);
    if (
      /captcha|access denied|unusual traffic|just a moment/i.test(bodyText) ||
      /just a moment/i.test(title)
    ) {
      console.log('⚠️ CAPTCHA or bot protection detected');
      await waitForManualCaptcha();
    }

    console.log(`Page Title: ${title}`);

    const cookies = await page.cookies();
    const cookieStrings = cookies.map((c: { name: string; value: string }) => `${c.name}=${c.value}`);
    const cookieFile = `./cookies/${safeFilename(url)}.json`;
    fs.writeFileSync(cookieFile, JSON.stringify(cookies, null, 2));
    console.log('Cookies:', cookieStrings);

    const screenshotFile = path.join('./screenshot', `${safeFilename(url)}.png`);
    await page.screenshot({ path: screenshotFile as `${string}.png` });

    await browser.close();

    return {
      url,
      cookies: cookieStrings,
      screenshot: screenshotFile
    };
  } catch (err) {
    console.error(`Failed for ${url}`, err);
    await browser.close();
    throw err;
  }
} 

if (require.main === module) {
  (async () => {
    for (const url of TARGET_URLS) {
      await bypass(url);
    }
  })();
}
