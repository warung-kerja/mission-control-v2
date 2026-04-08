import { chromium } from 'playwright';

async function verifyRuntime() {
  let browser;

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('about:blank');
    await context.close();

    console.log('✅ Playwright runtime check passed (Chromium launched successfully).');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    console.error('❌ Playwright runtime check failed.');

    if (message.includes('libnspr4.so')) {
      console.error('\nMissing host dependency detected: libnspr4.so');
      console.error('Install required Linux browser libraries, then retry:');
      console.error('  sudo apt-get update && sudo apt-get install -y libnspr4');
      console.error('Or install full Playwright deps bundle:');
      console.error('  sudo npx playwright install-deps chromium');
    } else {
      console.error('\nLaunch error:');
      console.error(message);
    }

    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

await verifyRuntime();
