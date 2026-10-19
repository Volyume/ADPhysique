/**
 * help_opened topic for an InfoTooltip (growth brief 2026-10-19, lane D).
 * A tooltip carries its explanation text, not a key, so the topic is found
 * by matching the text to its entry in the authored GLOSSARY (camelCase key
 * to snake_case code). Text that is not a glossary entry (inline tooltips)
 * reports 'unlisted'. An explicit `topic` prop wins when a tooltip has one.
 * Never the text itself.
 */
const CODE_RE = /^[a-z][a-z0-9_.]{1,40}$/;

export function topicForTooltip(text, topic) {
  if (typeof topic === 'string' && CODE_RE.test(topic)) return topic;
  try {
    // eslint-disable-next-line global-require
    const { GLOSSARY } = require('../coachGlossary');
    const key = Object.keys(GLOSSARY).find((k) => GLOSSARY[k] === text);
    if (key) {
      const code = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (CODE_RE.test(code)) return code;
    }
  } catch (_) { /* fall through */ }
  return 'unlisted';
}

/** Report that a tooltip was opened. Never throws. */
export function reportHelpOpened(text, topic) {
  try {
    // eslint-disable-next-line global-require
    require('./growth').helpOpened(topicForTooltip(text, topic));
  } catch (_) { /* telemetry never blocks the UI */ }
}
