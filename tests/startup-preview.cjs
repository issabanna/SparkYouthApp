const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const base = process.env.SPARK_TEST_URL || 'http://localhost:3024';
(async () => {
  const browser = await chromium.launch({
    ...(process.env.CHROMIUM_PATH ? {executablePath: process.env.CHROMIUM_PATH} : {}),
    args: ['--no-sandbox'],
  });
  try {
    const context = await browser.newContext({viewport:{width:390,height:844}});
    const page = await context.newPage();
    await page.route('**/app/_expo/static/js/web/*.js', route => route.abort('failed'));
    const response = await page.goto(base + '/app');
    assert.match(response.headers()['cache-control'], /no-store/);
    await page.getByRole('heading', {name:'تعذّر تحميل التطبيق'}).waitFor();
    await page.evaluate(() => localStorage.setItem('startup-preserve-check','keep'));
    await page.unroute('**/app/_expo/static/js/web/*.js');
    await page.getByRole('button', {name:'إعادة المحاولة', exact:true}).click();
    await page.getByLabel('اسمك في المعاينة').waitFor();
    assert.match(page.url(), /_spark_retry=/);
    assert.equal(await page.evaluate(() => localStorage.getItem('startup-preserve-check')), 'keep');
    assert.equal(await page.locator('#spark-startup').count(), 0);
    await page.getByLabel('اسمك في المعاينة').fill('اختبار العودة');
    await page.getByRole('button', {name:'دخول تجريبي'}).click();
    await page.getByText('مغامرتنا تجمعنا', {exact:true}).waitFor();
    await page.reload();
    await page.getByText('مغامرتنا تجمعنا', {exact:true}).waitFor();
    assert.equal(await page.locator('#spark-startup').count(), 0);
    console.log('PASS: failed app download displays recovery; retry loads current app, preserves storage and restores signed-in home. HTML is not cached.');
  } finally { await browser.close(); }
})().catch(error => {console.error(error);process.exit(1)});
