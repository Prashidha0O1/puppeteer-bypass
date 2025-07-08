import puppeteer from 'puppeteer-extra';
import type { Browser, Page, LaunchOptions } from 'puppeteer';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import AdblockerPlugin from 'puppeteer-extra-plugin-adblocker';

puppeteer.use(StealthPlugin());
puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export interface HumanMoveOptions {
  hesitationBeforeClick?: boolean;
  duration?: number;
  steps?: number;
}

export interface JitterMouseOptions {
  jitterCount?: number;
}

class definitelyNotAHuman {
  private browser?: Browser;
  private page?: Page;

  constructor() {}

  async launch(options: LaunchOptions = {}) {
    this.browser = await puppeteer.launch(options);
    this.page = (await this.browser.pages())[0] || await this.browser.newPage();
  }

  async navigate(url: string) {
    if (!this.page) throw new Error('Browser not launched');
    await this.page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
  }

  async humanMove(selector: string, options: HumanMoveOptions = {}) {
    if (!this.page) throw new Error('Browser not launched');
    const el = await this.page.$(selector);
    if (!el) throw new Error(`Element ${selector} not found`);
    const box = await el.boundingBox();
    if (!box) throw new Error('Element not visible');
    const { x, y, width, height } = box;
    const targetX = x + width / 2;
    const targetY = y + height / 2;
    const steps = options.steps || Math.floor(randomBetween(10, 30));
    const duration = options.duration || randomBetween(300, 1200);
    // Start from a random position on the page
    let lastX = randomBetween(0, 100);
    let lastY = randomBetween(0, 100);
    await this.page.mouse.move(lastX, lastY);
    for (let i = 1; i <= steps; i++) {
      const progress = i / steps;
      const intermediateX = lastX + (targetX - lastX) * progress + randomBetween(-2, 2);
      const intermediateY = lastY + (targetY - lastY) * progress + randomBetween(-2, 2);
      await this.page.mouse.move(intermediateX, intermediateY);
      await new Promise(res => setTimeout(res, duration / steps + randomBetween(-5, 10)));
    }
    if (options.hesitationBeforeClick) {
      await new Promise(res => setTimeout(res, randomBetween(100, 400)));
    }
    await this.page.mouse.click(targetX, targetY);
  }

  async jitterMouse(options: JitterMouseOptions = {}) {
    if (!this.page) throw new Error('Browser not launched');
    // Start from a random position on the page
    let x = randomBetween(0, 100);
    let y = randomBetween(0, 100);
    await this.page.mouse.move(x, y);
    for (let i = 0; i < (options.jitterCount || 5); i++) {
      x += randomBetween(-5, 5);
      y += randomBetween(-5, 5);
      await this.page.mouse.move(x, y);
      await new Promise(res => setTimeout(res, randomBetween(20, 80)));
    }
  }

  async humanType(text: string, wpm: number = 120) {
    if (!this.page) throw new Error('Browser not launched');
    const charsPerMinute = wpm * 5;
    const msPerChar = 60000 / charsPerMinute;
    for (let i = 0; i < text.length; i++) {
      await this.page.keyboard.type(text[i]);
      let delay = msPerChar + randomBetween(-msPerChar * 0.3, msPerChar * 0.3);
      if (/[.,!?]/.test(text[i])) delay += randomBetween(100, 300);
      await new Promise(res => setTimeout(res, delay));
    }
  }

  async wait(min: number, max: number) {
    const ms = randomBetween(min, max);
    await new Promise(res => setTimeout(res, ms));
  }

  async close() {
    if (this.browser) await this.browser.close();
  }

  getPage() {
    if (!this.page) throw new Error('Browser not launched');
    return this.page;
  }
}

export default definitelyNotAHuman; 