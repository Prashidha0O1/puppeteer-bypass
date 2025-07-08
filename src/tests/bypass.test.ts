import { TARGET_URLS } from '../config';
import { bypass } from '../bypass';
import fs from 'fs';

jest.setTimeout(120_000);

describe('Real browser bypass tests', () => {
  for (const url of TARGET_URLS) {
    it(`should bypass and screenshot ${url}`, async () => {
      const result = await bypass(url);
      expect(Array.isArray(result.cookies)).toBe(true);
      expect(result.cookies.length).toBeGreaterThan(0);
      expect(fs.existsSync(result.screenshot)).toBe(true);
    });
  }
});
