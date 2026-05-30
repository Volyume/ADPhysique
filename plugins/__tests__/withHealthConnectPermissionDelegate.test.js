const { applyToMainActivity } = require('../withHealthConnectPermissionDelegate');

const KT_MAIN_ACTIVITY = `package com.volyume.app

import android.os.Bundle
import expo.modules.ReactActivityDelegateWrapper

class MainActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    setTheme(R.style.AppTheme)
    super.onCreate(null)
  }

  override fun getMainComponentName(): String = "main"
}
`;

const JAVA_MAIN_ACTIVITY = `package com.volyume.app;

import android.os.Bundle;

public class MainActivity extends ReactActivity {
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
  }
}
`;

describe('applyToMainActivity (Kotlin)', () => {
  test('adds the import and the delegate call', () => {
    const out = applyToMainActivity(KT_MAIN_ACTIVITY, 'kt');
    expect(out).toContain('import dev.matinzd.healthconnect.permissions.HealthConnectPermissionDelegate');
    expect(out).toContain('HealthConnectPermissionDelegate.setPermissionDelegate(this)');
    // call lands right after super.onCreate, not before it
    const superIdx = out.indexOf('super.onCreate(null)');
    const callIdx = out.indexOf('HealthConnectPermissionDelegate.setPermissionDelegate(this)');
    expect(callIdx).toBeGreaterThan(superIdx);
    // no Java semicolon on the Kotlin call
    expect(out).not.toContain('setPermissionDelegate(this);');
  });

  test('is idempotent (running twice does not double-insert)', () => {
    const once = applyToMainActivity(KT_MAIN_ACTIVITY, 'kt');
    const twice = applyToMainActivity(once, 'kt');
    expect(twice).toBe(once);
    const importCount = (twice.match(/HealthConnectPermissionDelegate$/gm) || []).length;
    const callCount = (twice.match(/setPermissionDelegate\(this\)/g) || []).length;
    expect(importCount).toBe(1);
    expect(callCount).toBe(1);
  });
});

describe('applyToMainActivity (Java)', () => {
  test('adds the import and the delegate call with a semicolon', () => {
    const out = applyToMainActivity(JAVA_MAIN_ACTIVITY, 'java');
    expect(out).toContain('import dev.matinzd.healthconnect.permissions.HealthConnectPermissionDelegate;');
    expect(out).toContain('HealthConnectPermissionDelegate.setPermissionDelegate(this);');
    const superIdx = out.indexOf('super.onCreate(savedInstanceState)');
    const callIdx = out.indexOf('HealthConnectPermissionDelegate.setPermissionDelegate(this);');
    expect(callIdx).toBeGreaterThan(superIdx);
  });
});

describe('applyToMainActivity guards', () => {
  test('throws if there is no package declaration', () => {
    expect(() => applyToMainActivity('class MainActivity {}', 'kt')).toThrow(/package declaration/);
  });

  test('throws if there is no super.onCreate call', () => {
    const noOnCreate = 'package com.volyume.app\n\nclass MainActivity : ReactActivity() {}\n';
    expect(() => applyToMainActivity(noOnCreate, 'kt')).toThrow(/super\.onCreate/);
  });
});
