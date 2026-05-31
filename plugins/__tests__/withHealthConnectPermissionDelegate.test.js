/**
 * withHealthConnectPermissionDelegate.applyToMainActivity
 *
 * The plugin injects the Health Connect permission delegate registration into
 * MainActivity. These tests cover the string transform directly (no prebuild),
 * since that registration is what makes the permission dialog launch at all.
 */

const {
  applyToMainActivity,
  addRationaleToManifest,
  buildRationaleActivitySource,
} = require('../withHealthConnectPermissionDelegate');

const KT = `package app.volyume

import android.os.Bundle
import com.facebook.react.ReactActivity

class MainActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    setTheme(R.style.AppTheme);
    super.onCreate(null)
  }

  override fun getMainComponentName(): String = "main"
}
`;

const JAVA = `package app.volyume;

import android.os.Bundle;
import com.facebook.react.ReactActivity;

public class MainActivity extends ReactActivity {
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
  }
}
`;

describe('applyToMainActivity (Kotlin)', () => {
  test('adds the import after the package declaration', () => {
    const out = applyToMainActivity(KT, 'kt');
    expect(out).toContain(
      'import dev.matinzd.healthconnect.permissions.HealthConnectPermissionDelegate',
    );
    // No trailing semicolon in Kotlin.
    expect(out).not.toContain('HealthConnectPermissionDelegate;');
  });

  test('adds the delegate call right after super.onCreate', () => {
    const out = applyToMainActivity(KT, 'kt');
    expect(out).toMatch(
      /super\.onCreate\(null\)\n\s+HealthConnectPermissionDelegate\.setPermissionDelegate\(this\)/,
    );
  });

  test('is idempotent: running twice does not double-insert', () => {
    const once = applyToMainActivity(KT, 'kt');
    const twice = applyToMainActivity(once, 'kt');
    const importCount = (twice.match(/HealthConnectPermissionDelegate$/gm) || []).length
      + (twice.match(/import dev\.matinzd/g) || []).length;
    expect((twice.match(/setPermissionDelegate\(/g) || []).length).toBe(1);
    expect((twice.match(/import dev\.matinzd/g) || []).length).toBe(1);
    expect(importCount).toBeGreaterThan(0);
  });
});

describe('applyToMainActivity (Java)', () => {
  test('adds a semicolon-terminated import and call', () => {
    const out = applyToMainActivity(JAVA, 'java');
    expect(out).toContain(
      'import dev.matinzd.healthconnect.permissions.HealthConnectPermissionDelegate;',
    );
    expect(out).toContain('HealthConnectPermissionDelegate.setPermissionDelegate(this);');
  });
});

describe('applyToMainActivity (failure modes)', () => {
  test('throws when there is no package declaration', () => {
    expect(() => applyToMainActivity('class MainActivity {}', 'kt')).toThrow(/package declaration/);
  });

  test('throws when there is no super.onCreate to anchor on', () => {
    const noOnCreate = 'package app.volyume\n\nclass MainActivity : ReactActivity() {}\n';
    expect(() => applyToMainActivity(noOnCreate, 'kt')).toThrow(/super\.onCreate/);
  });
});

// A minimal parsed-manifest object in the shape @expo/config-plugins uses.
function emptyManifest() {
  return {
    manifest: {
      application: [
        {
          activity: [
            { $: { 'android:name': '.MainActivity' } },
          ],
        },
      ],
    },
  };
}

describe('addRationaleToManifest', () => {
  test('adds the PermissionsRationaleActivity with the rationale intent-filter', () => {
    const m = addRationaleToManifest(emptyManifest());
    const app = m.manifest.application[0];
    const rationale = app.activity.find(
      (a) => a.$['android:name'] === '.PermissionsRationaleActivity',
    );
    expect(rationale).toBeTruthy();
    expect(rationale.$['android:exported']).toBe('true');
    expect(rationale['intent-filter'][0].action[0].$['android:name']).toBe(
      'androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE',
    );
  });

  test('adds the Android 14 ViewPermissionUsageActivity alias with the health usage filter', () => {
    const m = addRationaleToManifest(emptyManifest());
    const app = m.manifest.application[0];
    const alias = (app['activity-alias'] || []).find(
      (a) => a.$['android:name'] === 'ViewPermissionUsageActivity',
    );
    expect(alias).toBeTruthy();
    expect(alias.$['android:exported']).toBe('true');
    expect(alias.$['android:targetActivity']).toBe('.PermissionsRationaleActivity');
    expect(alias.$['android:permission']).toBe('android.permission.START_VIEW_PERMISSION_USAGE');
    expect(alias['intent-filter'][0].action[0].$['android:name']).toBe(
      'android.intent.action.VIEW_PERMISSION_USAGE',
    );
    expect(alias['intent-filter'][0].category[0].$['android:name']).toBe(
      'android.intent.category.HEALTH_PERMISSIONS',
    );
  });

  test('does not touch the existing MainActivity', () => {
    const m = addRationaleToManifest(emptyManifest());
    const main = m.manifest.application[0].activity.find(
      (a) => a.$['android:name'] === '.MainActivity',
    );
    expect(main).toBeTruthy();
  });

  test('is idempotent: running twice leaves a single rationale activity and alias', () => {
    const once = addRationaleToManifest(emptyManifest());
    const twice = addRationaleToManifest(once);
    const app = twice.manifest.application[0];
    const rationaleCount = app.activity.filter(
      (a) => a.$['android:name'] === '.PermissionsRationaleActivity',
    ).length;
    const aliasCount = (app['activity-alias'] || []).filter(
      (a) => a.$['android:name'] === 'ViewPermissionUsageActivity',
    ).length;
    expect(rationaleCount).toBe(1);
    expect(aliasCount).toBe(1);
  });

  test('throws when there is no <application> to attach to', () => {
    expect(() => addRationaleToManifest({ manifest: {} })).toThrow(/application/);
  });
});

describe('buildRationaleActivitySource', () => {
  test('emits a Kotlin Activity in the app package that loads the privacy policy', () => {
    const src = buildRationaleActivitySource('app.volyume');
    expect(src).toContain('package app.volyume');
    expect(src).toContain('class PermissionsRationaleActivity : Activity()');
    expect(src).toContain('webView.loadUrl("https://volyume.app/privacy")');
  });

  test('honours a custom url', () => {
    const src = buildRationaleActivitySource('app.volyume', 'https://example.test/p');
    expect(src).toContain('webView.loadUrl("https://example.test/p")');
  });
});
