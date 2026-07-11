const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const keepAlive = fs.readFileSync(path.join(root, 'src/sensors/keepAlive.ts'), 'utf8');
const plugin = fs.readFileSync(path.join(root, 'plugins/withConnectedDeviceKeepAlive.js'), 'utf8');
const service = fs.readFileSync(path.join(root, 'modules/volyume-keepalive/VolyumeKeepAliveService.kt'), 'utf8');
const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));

assert(!/from ['"]expo-location/.test(keepAlive));
assert(!keepAlive.includes('TaskManager'));
assert(!keepAlive.includes('requestBackgroundPermissionsAsync'));
assert.match(keepAlive, /NativeModules\.VolyumeKeepAlive/);
assert.match(keepAlive, /nativeKeepAlive\.start/);
assert.match(keepAlive, /nativeKeepAlive\.stop/);
assert.match(keepAlive, /requestNotificationPermission/);
assert.match(plugin, /android:foregroundServiceType/);
assert.match(plugin, /withDangerousMod/);
assert.match(service, /IMPORTANCE_LOW/);
assert.match(service, /setOngoing\(true\)/);
assert.match(service, /FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE/);
assert.match(service, /START_STICKY/);
assert.equal(app.expo.plugins.includes('./plugins/withConnectedDeviceKeepAlive'), true);
assert.equal(app.expo.android.permissions.includes('android.permission.FOREGROUND_SERVICE_CONNECTED_DEVICE'), true);
console.log('keep-alive source checks passed');
