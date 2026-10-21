/**
 * The gym challenge landing page (public/c/index.html; gym challenge SPEC
 * section 2, step 3), run as written against a small stand-in for the DOM.
 *
 * What this suite pins:
 *  - the code is read from /c/<code> or from ?code=<code>;
 *  - the free-for-life line is its own paragraph, outside the Prizes card, so it
 *    shows when no prizes are listed;
 *  - an ended, closed or cancelled challenge shows the calm finished sentence and
 *    hides the prizes, the scoring table, the free-for-life offer and the way in,
 *    and the store link then carries no challenge referrer;
 *  - upcoming and active challenges behave as before;
 *  - the terms link is hidden without an https URL;
 *  - the share description makes no claim that everyone who scores gets a draw;
 *  - the page never reads an entrant count from the public RPC.
 */
import fs from 'fs';
import path from 'path';
import { CHALLENGE_FINISHED_LINE } from '../copy';

const html = fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', 'public', 'c', 'index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);

const CODE = 'volt-nov-3f9a1c2e';
const PUBLIC = {
  title: 'Volt Gym November', gym_name: 'Volt Gym', starts_on: '2026-11-01', ends_on: '2026-11-30',
  status: 'active', days_left: 12, prize_main: 'Six months free', prize_second: 'A hamper',
  main_threshold: 70, second_threshold: 50, terms_url: 'https://volyume.app/challenge-terms/?c=volt-nov-3f9a1c2e',
};

function makeDom() {
  const els = {};
  ids.forEach((id) => {
    els[id] = {
      style: {}, textContent: '', attrs: {}, parentNode: { style: {} },
      setAttribute(k, v) { this.attrs[k] = v; },
    };
  });
  return els;
}

async function run(row, { pathname = `/c/${CODE}`, search = '', ua = 'Android' } = {}) {
  const els = makeDom();
  const fetchMock = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(row) }));
  const document = { getElementById: (id) => els[id], title: '' };
  // eslint-disable-next-line no-new-func
  new Function('document', 'location', 'navigator', 'fetch', script)(
    document, { pathname, search }, { userAgent: ua }, fetchMock,
  );
  for (let i = 0; i < 5; i += 1) await new Promise((resolve) => setImmediate(resolve));
  return { els, fetchMock, document };
}

const shown = (el) => el.style.display !== 'none';

test('the page was actually read: it has the elements the script writes to', () => {
  ['finished', 'prizes', 'scoring', 'free', 'open', 'again', 'store', 'terms'].forEach((id) => {
    expect(ids).toContain(id);
  });
});

test('an active challenge shows its prizes, the scoring table, the free-for-life offer and the way in', async () => {
  const { els, fetchMock } = await run(PUBLIC);
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ _code: CODE });
  expect(els.title.textContent).toBe('Volt Gym November');
  expect(els.prizeMain.textContent).toBe('Main prize draw, 70 points and above: Six months free');
  expect(els.finished.style.display).not.toBe('block');
  for (const id of ['prizes', 'scoring', 'free', 'open', 'again']) expect(shown(els[id])).toBe(true);
  expect(els.content.style.display).toBe('block');
  expect(els.store.attrs.href).toContain(`referrer=${encodeURIComponent(`challenge=${CODE}`)}`);
  expect(els.terms.attrs.href).toBe(PUBLIC.terms_url);
});

test('the free-for-life offer shows even when no prizes are listed', async () => {
  const { els } = await run({ ...PUBLIC, prize_main: null, prize_second: null });
  expect(els.prizes.style.display).toBe('none');
  expect(shown(els.free)).toBe(true);
  expect(els.content.style.display).toBe('block');
});

test('the free-for-life line is not inside the Prizes card', () => {
  const prizesCard = html.match(/<div class="card" id="prizes">[\s\S]*?<\/div>/)[0];
  expect(prizesCard).not.toContain('earns free for life');
  expect(html).toContain('<p class="lead" id="free">Completing a challenge with a final score of 50 or more earns free for life.</p>');
  expect(html).not.toContain('Volyume is free');
});

test.each(['ended', 'closed', 'cancelled'])('the %s challenge: a calm sentence, nothing to join or score', async (status) => {
  const { els } = await run({ ...PUBLIC, status });
  expect(CHALLENGE_FINISHED_LINE).toBe('This challenge has finished. Thank you to everyone who took part.');
  expect(els.finished.textContent).toBe(CHALLENGE_FINISHED_LINE);
  expect(els.finished.style.display).toBe('block');
  for (const id of ['prizes', 'scoring', 'free', 'open', 'again']) expect(els[id].style.display).toBe('none');
  expect(els.title.textContent).toBe('Volt Gym November');
  expect(els.content.style.display).toBe('block');
  // The store link stays, without the challenge referrer.
  expect(els.store.attrs.href).toBe('https://play.google.com/store/apps/details?id=app.volyume');
});

test('a finished challenge on an iPhone keeps the App Store link', async () => {
  const { els } = await run({ ...PUBLIC, status: 'closed' }, { ua: 'iPhone' });
  expect(els.store.attrs.href).toBe('https://apps.apple.com/gb/app/volyume/id6777083702');
});

test('an upcoming challenge behaves as an active one', async () => {
  const { els } = await run({ ...PUBLIC, status: 'upcoming' });
  for (const id of ['prizes', 'scoring', 'free', 'open', 'again']) expect(shown(els[id])).toBe(true);
  expect(els.finished.style.display).not.toBe('block');
});

test('the code is read from the query form the 404 forward produces', async () => {
  const { fetchMock } = await run(PUBLIC, { pathname: '/c/', search: `?code=${CODE.toUpperCase()}` });
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ _code: CODE });
});

test('no terms link is shown without an https URL', async () => {
  for (const terms_url of [undefined, null, '', 'http://volyume.app/terms', 'javascript:alert(1)']) {
    const { els } = await run({ ...PUBLIC, terms_url });
    expect(els.terms.parentNode.style.display).toBe('none');
  }
});

test('the share description claims no draw for everyone who scores', () => {
  const og = html.match(/<meta property="og:description" content="([^"]*)">/)[1];
  const tw = html.match(/<meta name="twitter:description" content="([^"]*)">/)[1];
  expect(og).toBe(tw);
  expect(og).toContain('70 and above for the main prize draw');
  expect(og).toContain('50 and above for the second');
  expect(og).not.toMatch(/everyone who scores/i);
  expect(og).not.toContain('—');
});

test('the page never reads an entrant count from the public RPC', () => {
  expect(script).not.toMatch(/entrants/);
  expect(html).not.toMatch(/entrant count/);
});
