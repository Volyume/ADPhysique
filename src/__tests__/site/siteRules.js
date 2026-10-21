/**
 * The rules behind the volyume.app copy guards, kept apart from the tests so
 * the rules themselves can be tested (site.rules.test.js) with sentences they
 * must catch and sentences they must leave alone. A guard whose pattern is
 * too loose cries wolf; one that is too tight goes quiet. Both fail silently
 * unless something pins them.
 *
 * Authority: docs/site-rebuild-2026-10/BRIEF.md ("Content rules") and
 * marketing/hq/CLAIMS-STANDARDS.md section 9.
 */
'use strict';

const PRICE_RULES = [
  // "free weights" is a piece of kit, not a price.
  ['free', /\bfree\b(?![ -]weights?\b)/i],
  ['no card', /\bno (credit |debit |bank |payment )?card\b|\bwithout (a |any )?(credit |debit |bank |payment )?card\b/i],
  ['no time limit', /\bno (time limits?|expiry|contracts?|catch|charges?|fees?|costs?|obligations?|commitments?)\b|\bat no (cost|charge)\b|\bcosts? nothing\b|\bzero cost\b/i],
  ['no ads', /\bno (ads|adverts?|advertising|advertisements?)\b|\bad[- ]free\b|\bwithout (ads|adverts?)\b/i],
  ['currency', /[\u00a3$\u20ac]|\b(GBP|USD|EUR)\b/],
  ['price', /\bpric(e|es|ed|ing)\b/i],
  ['subscription', /\bsubscriptions?\b/i],
  // A trial of a product. A clinical or randomised controlled trial in a cited study is not one.
  ['trial', /(?<!(controlled|clinical|randomi[sz]ed|crossover|cross-over|blind|meta) )\btrials?\b/i],
  ['Pro (a tier)', /\bPro\b/],
  ['upgrade', /\bupgrad(e|es|ed|ing)\b/i],
  ['premium', /\bpremium\b/i],
  ['paywall', /\bpaywall\b|\bpaid (plan|version|tier|app)\b/i],
  ['purchase', /\bpurchas(e|es|ed|ing)\b|\bbilling\b/i],
];


// [name, pattern]. data-explains="<name>" (case, spaces and hyphens ignored)
// marks the one element that explains the term in plain words.
const SOUND_VOLUME = /\b(sound|audio|phone|device|ringer|alarm|media|rest)\s+volume\b|\bvolume\s+(button|buttons|control|controls|slider|up|down|key|keys|rocker)\b|\b(turn(ed)?( it)?( up| down)?|raise|lower|adjust|change|mute)\s+(the\s+)?volume\b/i;
const JARGON = [
  ['hypertrophy', /\bhypertroph\w*/i],
  ['deload', /\bdeload\w*/i],
  ['mesocycle', /\b(meso|micro|macro)cycles?\b/i],
  ['progressive overload', /\bprogressive[- ]overload\b/i],
  ['TDEE', /\bTDEE\b/],
  ['BMR', /\bBMR\b/],
  ['maintenance calories', /\bmaintenance[- ](calories|calorie|kcal|level|intake)\b|\bcalorie maintenance\b/i],
  ['macros', /\bmacros?\b/i],
  ['RIR', /\bRIR\b/],
  ['RPE', /\bRPE\b/],
  ['AMRAP', /\bAMRAPs?\b/i],
  ['myo-reps', /\bmyo[- ]?reps?\b/i],
  ['rest-pause', /\brest[- ]pause\b/i],
  ['offline-first', /\boffline[- ]first\b/i],
  ['sync engine', /\bsync(hroni[sz]ation)? engines?\b/i],
  ['V-taper', /\bV[- ]taper\b/i],
  ['X-frame', /\bX[- ]frame\b/i],
  ['ED flag', /\bED flags?\b/],
  ['safety state', /\bsafety states?\b/i],
  ['telemetry', /\btelemetry\b/i],
  ['Supabase', /\bsupabase\b/i],
  ['archetype', /\barchetypes?\b/i],
  // "volume" as a training word. Sound volume is not jargon.
  ['volume', { test: (t) => /\bvolumes?\b/i.test(t) && !SOUND_VOLUME.test(t) }],
];
const jargonKey = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');
const JARGON_BY_KEY = new Map(JARGON.map(([name, re]) => [jargonKey(name), { name, re }]));


const APOS = "['\u2019]";
const AI_TELLS = [
  ['unlock', /\bunlock\w*/i],
  ['elevate', /\belevat(e|es|ed|ing)\b/i],
  ['empower', /\bempower\w*/i],
  ['seamless', /\bseamless(ly)?\b/i],
  ['game-changer', /\bgame[- ]?chang\w*/i],
  ['journey', /\bjourney/i],
  ['level up', /\blevel(l?ing)?[- ]up\b/i],
  ['next level', /\bnext[- ]level\b/i],
  ["whether you're", new RegExp(`\\bwhether you(${APOS}re|${APOS}ve| are an?)\\b`, 'i')],
  ["it's not just", new RegExp(`\\bit(${APOS}s| is) not just\\b|\\bisn${APOS}t just\\b|\\bnot just (a|an|about)\\b`, 'i')],
  ['negation pivot', new RegExp(`\\bnot another (fitness )?app\\b|^More than an? [a-z ]+\\.?$|\\bisn${APOS}t about\\b`, 'i')],
  ['say goodbye', /\bsay goodbye\b/i],
  ['look no further', /\blook no further\b/i],
  ['designed with you in mind', /\bdesigned with you in mind\b/i],
  // CLAIMS-STANDARDS section 9 items 6, 7 and 12: more of the same family.
  ['hype word', /\b(effortless(ly)?|supercharg\w*|dive in|delve\w*|robust|comprehensive|cutting[- ]edge|revolution\w*)\b/i],
  ['scene-setter', new RegExp(`\\bin today${APOS}s\\b|\\blet${APOS}s face it\\b|\\bhere${APOS}s the thing\\b|\\bin conclusion\\b|\\bat the end of the day\\b|\\bthe bottom line\\b|^Ultimately\\b`, 'i')],
  ['sparkle', /sparkle/i],
];

const EMOJI = /\p{Extended_Pictographic}|[\u{1F1E6}-\u{1F1FF}]|\ufe0f|\u20e3|[\u2605\u2606\u2726\u2727\u2733\u2734\u2747]/u;
// Copyright, registered and trade mark signs are text, not emoji.
const hasEmoji = (t) => EMOJI.test(t.replace(/[\u00a9\u00ae\u2122]/g, ''));
// An en dash between two numbers is a range (2 to 6 days), not a dash.
const hasDash = (t) => /\u2014/.test(t) || /(?<!\d)\u2013|\u2013(?!\d)/.test(t) || /\s-{1,2}\s/.test(t);

// American forms only. The British forms (colour, organise, fibre) are fine.
const US_SPELLING = new RegExp([
  '\\b(color|colors|colored|colorful|behavior|behaviors|behavioral|favorite|favorites|center|centers|centered|fiber|fibers|flavor|flavors|gray|catalog|catalogs|defense|gotten|math)\\b',
  '\\b(optimiz|personaliz|organiz|analyz|recogniz|customiz|summariz|prioritiz|minimiz|maximiz|stabiliz|normaliz|utiliz|visualiz|specializ|emphasiz|memoriz|realiz|categoriz|synchroniz)\\w*',
].join('|'), 'i');


// Promise-shaped weight language. "lose 0.5%" in an article's teaching is
// educational prose (CLAIMS-STANDARDS section 2 scope clarification), so the
// numbered form is checked outside the articles.
const CAP_RULES = [
  ['shred, slim or detox', /\bshred(ded|ding|s)?\b|\bcut(ting)? fast\b|\bslim(ming|mer)?\b|\bdetox\b/i],
  ['before and after', /\bbefore[- ](and|&)[- ]after\b|\bbefore\/after\b|\btransformations?\b/i],
  ['review, rating or user count', /\btestimonials?\b|\b\d(\.\d)?\s?(\/\s?5|stars?)\b|\bhighly rated\b|\b(thousands|millions|hundreds) of (users|lifters|members|downloads)\b|\b\d[\d,]*\+? (users|downloads|members)\b/i],
  ['superiority', /\b(best|leading|top[- ]rated|number one|no\.? ?1|most accurate|world[- ]class|market[- ]leading)\b[^.]{0,20}\b(app|coach|coaching|way|tracker|platform|system|choice|solution|planner)\b/i],
];
const LOSE_NUMBER = [['lose a number of kilos', /\blose \d|\bdrop \d+\s?(kg|lbs?|pounds|stone)\b/i]];


module.exports = {
  PRICE_RULES, JARGON, JARGON_BY_KEY, jargonKey, AI_TELLS, hasEmoji, hasDash, US_SPELLING, CAP_RULES, LOSE_NUMBER,
};
