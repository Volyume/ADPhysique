const { setOptOut, ATTR } = require('../withEdgeToEdgeOptOut');

function stylesWithAppTheme(items = []) {
  return { resources: { style: [{ $: { name: 'AppTheme' }, item: [...items] }] } };
}

function appThemeItems(styles) {
  return styles.resources.style.find((s) => s.$.name === 'AppTheme').item;
}

describe('withEdgeToEdgeOptOut setOptOut', () => {
  it('adds the edge-to-edge opt-out item to AppTheme', () => {
    const styles = setOptOut(stylesWithAppTheme());
    const items = appThemeItems(styles);
    const entry = items.find((i) => i.$.name === ATTR);
    expect(entry).toEqual({ _: 'true', $: { name: ATTR } });
  });

  it('preserves existing theme items', () => {
    const styles = setOptOut(
      stylesWithAppTheme([{ _: '#000000', $: { name: 'android:statusBarColor' } }]),
    );
    const items = appThemeItems(styles);
    expect(items.some((i) => i.$.name === 'android:statusBarColor')).toBe(true);
    expect(items.some((i) => i.$.name === ATTR)).toBe(true);
  });

  it('is idempotent (one entry after running twice)', () => {
    const styles = setOptOut(setOptOut(stylesWithAppTheme()));
    const count = appThemeItems(styles).filter((i) => i.$.name === ATTR).length;
    expect(count).toBe(1);
  });

  it('leaves styles untouched when there is no AppTheme', () => {
    const styles = { resources: { style: [{ $: { name: 'Other' }, item: [] }] } };
    const result = setOptOut(styles);
    expect(result.resources.style[0].item).toHaveLength(0);
  });
});
