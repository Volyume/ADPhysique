#!/usr/bin/env node
/**
 * Route-graph extractor for the 2026-09-05 final certification (Part 1).
 * READ-ONLY. Parses RootNavigator.js registrations and greps src/ for
 * navigation call sites, emitting docs/final-certification-2026-09-05/
 * data/route-graph.json. Deterministic; no dependencies.
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const SRC = path.join(ROOT, 'src');

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== '__tests__' && e.name !== '__mocks__') walk(p, out); }
    else if (e.name.endsWith('.js')) out.push(p);
  }
  return out;
}

// --- 1. registrations -------------------------------------------------
const navPath = path.join(SRC, 'navigation', 'RootNavigator.js');
const navSrc = fs.readFileSync(navPath, 'utf8');
const navLines = navSrc.split('\n');
const stacks = {}; // stackFn -> [{route, component, line}]
let current = null;
navLines.forEach((line, i) => {
  const fn = line.match(/^function (\w+Stack|MainTabs)\s*\(/);
  if (fn) { current = fn[1]; stacks[current] = stacks[current] || []; }
  const scr = line.match(/<(?:Stack|Tab)\.Screen\s+name="([^"]+)"\s+component=\{(\w+)\}/);
  if (scr && current) stacks[current].push({ route: scr[1], component: scr[2], line: i + 1 });
  // multi-line <Stack.Screen\n name="X"
  const nameOnly = line.match(/^\s+name="([^"]+)"$/);
  if (nameOnly && current) {
    const compLine = navLines[i + 1] || '';
    const c = compLine.match(/component=\{(\w+)\}/);
    if (c) stacks[current].push({ route: nameOnly[1], component: c[1], line: i + 1 });
  }
});

// route -> set of stacks
const routeToStacks = {};
for (const [st, rows] of Object.entries(stacks)) {
  for (const r of rows) {
    (routeToStacks[r.route] = routeToStacks[r.route] || { stacks: [], component: r.component, regs: [] });
    routeToStacks[r.route].stacks.push(st);
    routeToStacks[r.route].regs.push(`${st}:${r.line}`);
  }
}

// --- 2. navigation call sites ----------------------------------------
const files = walk(SRC);
const edges = []; // {from, target, kind, file, line, tab}
const dynamic = []; // non-literal targets
const NAVOBJ = String.raw`(?:navigation|nav|navigationRef|parent|parentNav|rootNav|props\.navigation|getParent\(\)|navigationRef\.current)`;
const CALL = new RegExp(NAVOBJ + String.raw`\s*\??\.\s*(navigate|push|replace|jumpTo)\s*\(\s*(['\"\`])([A-Za-z0-9_]+)\2`, 'g');
const CALL_DYN = new RegExp(NAVOBJ + String.raw`\s*\??\.\s*(navigate|push|replace)\s*\(\s*(?!['\"\`])[A-Za-z_$]`, 'g');
const CROSS = /navigateCrossTab\s*\(\s*[^,]+,\s*['"]([A-Za-z0-9_]+)['"]\s*(?:,\s*['"]([A-Za-z0-9_]+)['"])?/g;
const NESTED = /navigate\s*\(\s*['"]([A-Za-z0-9_]+)['"]\s*,\s*\{\s*screen:\s*['"]([A-Za-z0-9_]+)['"]/g;
const RESET = /routes:\s*\[\s*\{\s*name:\s*['"]([A-Za-z0-9_]+)['"]/g;

for (const f of files) {
  const rel = path.relative(ROOT, f);
  if (rel === 'src/navigation/RootNavigator.js') continue;
  const txt = fs.readFileSync(f, 'utf8');
  const lines = txt.split('\n');
  lines.forEach((line, i) => {
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) return; // skip comment lines
    let m;
    NESTED.lastIndex = 0;
    while ((m = NESTED.exec(line))) edges.push({ target: m[2], tab: m[1], kind: 'nested', file: rel, line: i + 1 });
    CROSS.lastIndex = 0;
    while ((m = CROSS.exec(line))) edges.push({ target: m[2] || m[1], tab: m[1], kind: m[2] ? 'crossTab' : 'crossTabRoot', file: rel, line: i + 1 });
    CALL.lastIndex = 0;
    while ((m = CALL.exec(line))) edges.push({ target: m[3], kind: m[1], file: rel, line: i + 1 });
    RESET.lastIndex = 0;
    while ((m = RESET.exec(line))) edges.push({ target: m[1], kind: 'reset', file: rel, line: i + 1 });
    CALL_DYN.lastIndex = 0;
    while ((m = CALL_DYN.exec(line))) dynamic.push({ file: rel, line: i + 1, text: line.trim().slice(0, 140) });
  });
}

// --- 3. screens on disk vs registered ---------------------------------
const screenFiles = fs.readdirSync(path.join(SRC, 'screens')).filter(f => f.endsWith('.js'));
const registeredComponents = new Set(Object.values(routeToStacks).map(r => r.component));
// map component const -> required screen module
const requireMap = {};
for (const m of navSrc.matchAll(/const (\w+)\s*=\s*lazyScreen\(\(\)\s*=>\s*require\('\.\.\/screens\/(\w+)'\)/g)) requireMap[m[1]] = m[2] + '.js';
const registeredScreenFiles = new Set(Object.entries(requireMap).filter(([c]) => registeredComponents.has(c)).map(([, f]) => f));
const unregisteredScreenFiles = screenFiles.filter(f => !registeredScreenFiles.has(f));

// --- 4. tally ---------------------------------------------------------
const TAB_ROUTES = new Set(['HomeTab', 'PlansTab', 'DiaryTab', 'ProgressTab', 'ProfileTab']);
const known = new Set([...Object.keys(routeToStacks), ...TAB_ROUTES]);
const inbound = {};
for (const e of edges) {
  if (!inbound[e.target]) inbound[e.target] = [];
  inbound[e.target].push(e);
}
const orphans = Object.keys(routeToStacks).filter(r => !inbound[r] || inbound[r].length === 0);
const deadTargets = Object.keys(inbound).filter(t => !known.has(t));

const out = {
  generated: new Date().toISOString().slice(0, 10),
  stacks,
  routeToStacks,
  inboundCounts: Object.fromEntries(Object.entries(inbound).map(([k, v]) => [k, v.length])),
  inbound,
  orphans,
  deadTargets: Object.fromEntries(deadTargets.map(t => [t, inbound[t]])),
  unregisteredScreenFiles,
  dynamicTargets: dynamic,
};
const outPath = path.join(ROOT, 'docs/final-certification-2026-09-05/data/route-graph.json');
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log('registrations:', Object.values(stacks).reduce((a, b) => a + b.length, 0));
console.log('distinct routes:', Object.keys(routeToStacks).length);
console.log('edges:', edges.length);
console.log('ORPHANS:', orphans.join(', ') || '(none)');
console.log('DEAD TARGETS:', deadTargets.join(', ') || '(none)');
console.log('UNREGISTERED SCREEN FILES:', unregisteredScreenFiles.join(', ') || '(none)');
console.log('dynamic call sites:', dynamic.length);
