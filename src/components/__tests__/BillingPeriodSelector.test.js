import fs from 'fs';
import path from 'path';
import { create, act } from 'react-test-renderer';

import BillingPeriodSelector from '../BillingPeriodSelector';

function flattenText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join('');
  return flattenText(node.children);
}

describe('BillingPeriodSelector', () => {
  test('renders annual/monthly pricing with selected state and press handling', () => {
    const onChange = jest.fn();
    const tree = create(
      <BillingPeriodSelector
        value="monthly"
        onChange={onChange}
        monthlyPrice="$6.99"
        annualPrice="$49.99"
      />,
    );

    const text = flattenText(tree.toJSON());
    expect(text).toContain('Save 50%');
    expect(text).toContain('Annual');
    expect(text).toContain('$49.99');
    expect(text).toContain('Monthly');
    expect(text).toContain('$6.99');

    const monthly = tree.root.findByProps({ accessibilityLabel: 'Monthly, $6.99' });
    expect(monthly.props.accessibilityState).toEqual({ selected: true, disabled: false });

    const annual = tree.root.findByProps({ accessibilityLabel: 'Annual, $49.99, save 50 per cent' });
    expect(annual.props.accessibilityState).toEqual({ selected: false, disabled: false });
    act(() => { annual.props.onPress(); });
    expect(onChange).toHaveBeenCalledWith('annual');
  });

  test('uses a price-free loading placeholder until store prices arrive', () => {
    const tree = create(<BillingPeriodSelector value="annual" onChange={jest.fn()} />);

    expect(flattenText(tree.toJSON())).toContain('\u2026');
    expect(tree.root.findByProps({ accessibilityLabel: 'Annual, save 50 per cent' })).toBeTruthy();
    expect(tree.root.findByProps({ accessibilityLabel: 'Monthly' })).toBeTruthy();
  });
});

describe('paid surfaces share the billing-period selector', () => {
  const screensDir = path.join(__dirname, '..', '..', 'screens');
  const files = ['PaywallScreen.js', 'CascadeGateScreen.js', 'ProUpgradeScreen.js'];

  test.each(files)('%s does not reintroduce local period selector styles', (file) => {
    const source = fs.readFileSync(path.join(screensDir, file), 'utf8');

    expect(source).toMatch(/BillingPeriodSelector/);
    expect(source).not.toMatch(/periodBtn|periodLabel|periodPrice|periodTextActive|saveBadge|annualSavingsPct/);
  });
});
