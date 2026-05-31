/**
 * withHealthConnectPermissionDelegate.applyToMainActivity
 *
 * The plugin injects the Health Connect permission delegate registration into
 * MainActivity. These tests cover the string transform directly (no prebuild),
 * since that registration is what makes the permission dialog launch at all.
 */

const { applyToMainActivity } = require('../withHealthConnectPermissionDelegate');

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
