/** D221: navigateCommunity pushes in-stack when the route is registered, else hops tabs. */
const mockCross = jest.fn();
jest.mock('../navigateCrossTab', () => ({ navigateCrossTab: (...a) => mockCross(...a) }));
const { navigateCommunity } = require('../navigateCommunity');

const nav = (routeNames) => ({
  getState: () => ({ routeNames }),
  navigate: jest.fn(), replace: jest.fn(), goBack: jest.fn(),
});

beforeEach(() => mockCross.mockClear());

test('in-stack route pushes', () => {
  const n = nav(['CommunityProfile']);
  navigateCommunity(n, 'CommunityProfile', { a: 1 });
  expect(n.navigate).toHaveBeenCalledWith('CommunityProfile', { a: 1 });
  expect(mockCross).not.toHaveBeenCalled();
});
test('in-stack replace replaces', () => {
  const n = nav(['CommunityJoin']);
  navigateCommunity(n, 'CommunityJoin', { a: 1 }, { replace: true });
  expect(n.replace).toHaveBeenCalledWith('CommunityJoin', { a: 1 });
  expect(n.goBack).not.toHaveBeenCalled();
});
test('unregistered route hops to the Community tab', () => {
  const n = nav(['Home']);
  navigateCommunity(n, 'CommunityProfile', { a: 1 });
  expect(mockCross).toHaveBeenCalledWith(n, 'CommunityTab', 'CommunityProfile', { a: 1 });
  expect(n.goBack).not.toHaveBeenCalled();
});
test('unregistered replace pops the current screen first, then hops', () => {
  const n = nav(['Home']);
  navigateCommunity(n, 'CommunityJoin', { a: 1 }, { replace: true });
  expect(n.goBack).toHaveBeenCalled();
  expect(mockCross).toHaveBeenCalledWith(n, 'CommunityTab', 'CommunityJoin', { a: 1 });
});
