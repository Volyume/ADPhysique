const fs = require('fs');
const path = require('path');
const {
  withAndroidManifest,
  withDangerousMod,
  withMainApplication,
  createRunOncePlugin,
} = require('@expo/config-plugins');

const MODULE_SOURCE_DIR = path.join(__dirname, '..', 'modules', 'volyume-keepalive');

function packagePath(packageName) {
  return packageName.split('.').join(path.sep);
}

function withManifest(config) {
  return withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults.manifest;
    const requiredPermissions = [
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_CONNECTED_DEVICE',
    ];
    const permissions = manifest['uses-permission'] ?? [];
    for (const permission of requiredPermissions) {
      if (!permissions.some((entry) => entry.$?.['android:name'] === permission)) {
        permissions.push({ $: { 'android:name': permission } });
      }
    }
    manifest['uses-permission'] = permissions;

    const application = manifest.application?.[0];
    if (!application) throw new Error('Connected-device keep-alive requires an Android application entry');
    const serviceName = `${config.android.package}.keepalive.VolyumeKeepAliveService`;
    const services = application.service ?? [];
    const existing = services.find((service) => service.$?.['android:name'] === serviceName);
    const service = existing ?? { $: { 'android:name': serviceName } };
    service.$['android:exported'] = 'false';
    service.$['android:foregroundServiceType'] = 'connectedDevice';
    if (!existing) services.push(service);
    application.service = services;
    return mod;
  });
}

function withMainApplicationRegistration(config) {
  return withMainApplication(config, (mod) => {
    const packageName = config.android.package;
    const importLine = `import ${packageName}.keepalive.VolyumeKeepAlivePackage`;
    const addLine = '              add(VolyumeKeepAlivePackage())';
    let contents = mod.modResults.contents;

    if (!contents.includes(importLine)) {
      contents = contents.replace(/^(package [^\n]+)$/m, `$1\n\n${importLine}`);
    }
    if (!contents.includes(addLine)) {
      const packageList = /PackageList\(this\)\.packages\.apply \{\n/;
      if (!packageList.test(contents)) {
        throw new Error('Connected-device keep-alive could not find MainApplication package registration');
      }
      contents = contents.replace(packageList, `$&${addLine}\n`);
    }
    mod.modResults.contents = contents;
    return mod;
  });
}

function withNativeSources(config) {
  return withDangerousMod(config, ['android', async (mod) => {
    const packageName = config.android.package;
    const destination = path.join(
      mod.modRequest.platformProjectRoot,
      'app',
      'src',
      'main',
      'java',
      packagePath(packageName),
      'keepalive',
    );
    await fs.promises.mkdir(destination, { recursive: true });
    for (const fileName of ['VolyumeKeepAlivePackage.kt', 'VolyumeKeepAliveModule.kt', 'VolyumeKeepAliveService.kt']) {
      const source = await fs.promises.readFile(path.join(MODULE_SOURCE_DIR, fileName), 'utf8');
      await fs.promises.writeFile(
        path.join(destination, fileName),
        source.replaceAll('__PACKAGE__', packageName),
        'utf8',
      );
    }
    return mod;
  }]);
}

function withConnectedDeviceKeepAlive(config) {
  config = withManifest(config);
  config = withMainApplicationRegistration(config);
  return withNativeSources(config);
}

module.exports = createRunOncePlugin(
  withConnectedDeviceKeepAlive,
  'with-connected-device-keep-alive',
  '1.0.0',
);
