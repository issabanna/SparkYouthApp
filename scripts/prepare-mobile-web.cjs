const fs = require('node:fs');
const path = require('node:path');
const output = path.resolve(__dirname, '../apps/admin/public/app/index.html');
let html = fs.readFileSync(output, 'utf8');
const scripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(match => match[1]);
if (!scripts.length) throw new Error('Mobile export has no app script');
for (const asset of scripts) {
  if (!asset.startsWith('/app/') || !fs.existsSync(path.join(path.dirname(output), asset.slice(5)))) {
    throw new Error('Mobile export references a missing app script');
  }
}
// Keep recovery outside React: it must work even when the app bundle never runs.
const startup = `
<section id="spark-startup" dir="rtl" aria-live="polite" style="position:fixed;inset:0;z-index:100;background:#f6f4ef;display:flex;align-items:center;justify-content:center;text-align:center;padding:28px;font-family:Arial,sans-serif;color:#252820">
  <div style="max-width:360px">
    <div style="font-size:28px;font-weight:800;margin-bottom:24px">SPARK</div>
    <h1 id="spark-startup-title" style="font-size:22px">جارٍ فتح التطبيق…</h1>
    <p id="spark-startup-copy" style="line-height:1.8">لحظات ونكون معك.</p>
    <button id="spark-retry" type="button" hidden style="border:0;border-radius:18px;background:#ffda00;padding:16px 28px;font-size:17px;color:#252820;cursor:pointer">إعادة المحاولة</button>
    <noscript><p>يرجى تفعيل JavaScript في المتصفح لفتح التطبيق.</p></noscript>
  </div>
</section>
<script>
(function () {
  var shell = document.getElementById('spark-startup');
  var root = document.getElementById('root');
  var timer;
  function mounted() { return root && root.childElementCount > 0; }
  function finish() {
    if (!mounted()) return;
    clearTimeout(timer);
    shell.remove();
    observer.disconnect();
    window.removeEventListener('error', failed, true);
  }
  function failed(event) {
    if (mounted()) { finish(); return; }
    if (event && event.target && event.target.tagName && event.target.tagName !== 'SCRIPT') return;
    document.getElementById('spark-startup-title').textContent = 'تعذّر تحميل التطبيق';
    document.getElementById('spark-startup-copy').textContent = 'تحقق من اتصالك ثم أعد المحاولة. بياناتك المحفوظة ستبقى كما هي.';
    document.getElementById('spark-retry').hidden = false;
  }
  document.getElementById('spark-retry').onclick = function () {
    var next = new URL(window.location.href);
    next.searchParams.set('_spark_retry', Date.now().toString());
    window.location.replace(next.toString());
  };
  var observer = new MutationObserver(finish);
  observer.observe(root, {childList:true});
  window.addEventListener('error', failed, true);
  timer = setTimeout(failed, 15000);
  finish();
})();
</script>`;
html = html.replace('<html lang="en">', '<html lang="ar">');
html = html.replace(/(<div id="root"><\/div>)/, '$1' + startup);
fs.writeFileSync(output, html);
console.log('Validated mobile script assets and installed startup recovery');
