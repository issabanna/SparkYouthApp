const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const delegate = fs.readFileSync(path.join(__dirname, '../node_modules/react-native/ReactAndroid/src/main/java/com/facebook/react/uimanager/ReactAccessibilityDelegate.java'), 'utf8');
function enumValues(name) {
 const values = delegate.match(new RegExp('public enum '+name+' \\{([\\s\\S]*?);'))?.[1];
 assert.ok(values, 'Installed Android role enum must be present');
 return new Set([...values.matchAll(/\b[A-Z][A-Z0-9_]*\b/g)].map(m => m[0].toLowerCase()));
}
const legacy = enumValues('AccessibilityRole'), modern = enumValues('Role');
assert.equal(legacy.has('status'), false, 'Regression reproducer: Android rejects accessibilityRole=status');
assert.equal(modern.has('status'), true, 'Android accepts role=status');
for (const file of fs.readdirSync(path.join(__dirname, '../apps/mobile')).filter(f => f.endsWith('.js'))) {
 const source = fs.readFileSync(path.join(__dirname, '../apps/mobile', file), 'utf8');
 for (const match of source.matchAll(/\b(accessibilityRole|role)="([^"]+)"/g)) {
  assert.ok((match[1] === 'role' ? modern : legacy).has(match[2]), `${file}: Android rejects ${match[1]}=${match[2]}`);
 }
}
console.log('PASS app accessibility roles against installed Android native enums, including status-message crash regression');
