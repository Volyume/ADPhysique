/**
 * scripts/paper-render/treeToHtml.js
 *
 * Converts a react-test-renderer host tree (the shape `tree.toJSON()`
 * produces -- see paper-render.test.js's `safeTreeJSON`, which falls back
 * to an equivalent hand-walked tree for the one screen (Analytics) whose
 * `refreshControl` prop makes the real `toJSON()` throw) into a standalone
 * HTML document with inline CSS, close enough to React Native's own layout
 * rules that dark/light theme, type sizes, fitting and density read
 * honestly for a design review. See README.md for the full rule list this
 * implements; the header comments below track it section by section.
 *
 * Pure module: no fs/jest dependency beyond resolving font file paths
 * under the repo root, which the caller may override via opts.repoRoot.
 */
'use strict';

const path = require('node:path');

const REPO_ROOT_DEFAULT = path.resolve(__dirname, '..', '..');

// ── Fonts: theme.js's fontFamily block, name -> file (README documents this
// table so a future font-file rename is a one-line fix here). Numeric
// fontWeight is deliberately NEVER applied (see mapTextStyle): on a custom
// font registered face-by-face, the named face alone decides the render,
// and RN itself only reads fontWeight for the accessibility bold-text
// setting, not to pick a different face -- applying it here would fight the
// @font-face declarations below and risk a synthesised (faux) bold that no
// device ever shows.
const FONT_FACES = [
  { family: 'Inter-Regular', file: 'Inter-Regular.ttf', weight: 400 },
  { family: 'Inter-Medium', file: 'Inter-Medium.ttf', weight: 500 },
  { family: 'Inter-SemiBold', file: 'Inter-SemiBold.ttf', weight: 600 },
  { family: 'Inter-Bold', file: 'Inter-Bold.ttf', weight: 700 },
  { family: 'Inter-ExtraBold', file: 'Inter-ExtraBold.ttf', weight: 800 },
  { family: 'InterDisplay-Bold', file: 'InterDisplay-Bold.ttf', weight: 700 },
  { family: 'InterDisplay-ExtraBold', file: 'InterDisplay-ExtraBold.ttf', weight: 800 },
];
const IONICONS_TTF_REL = 'node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf';
const IONICONS_GLYPHMAP_REL = 'node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json';

const HAIRLINE = 1; // StyleSheet.hairlineWidth under the repo's RN mock

// ── Small helpers ───────────────────────────────────────────────────────

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fileUrl(p) {
  return `file://${p.replace(/\\/g, '/')}`;
}

// Numeric style values are px; strings (percentages, 'auto') pass through
// unchanged, matching RN's own dimension contract.
function px(v) {
  if (v === undefined || v === null) return null;
  if (typeof v === 'number') return `${v}px`;
  return String(v);
}
function unitless(v) {
  if (v === undefined || v === null) return null;
  return String(v);
}

function flattenStyle(style) {
  if (!style) return {};
  if (Array.isArray(style)) {
    return Object.assign({}, ...style.filter(Boolean).map(flattenStyle));
  }
  if (typeof style === 'object') return style;
  return {};
}

// ── Container (View-like) style mapping ─────────────────────────────────
// RN Yoga defaults, applied before the flattened style overrides them.
const VIEW_BASE_CSS = {
  display: 'flex',
  'flex-direction': 'column',
  'align-items': 'stretch',
  'flex-shrink': '0',
  'box-sizing': 'border-box',
  position: 'relative',
  'min-width': '0',
};

const DIRECT_PX_PROPS = {
  width: 'width', height: 'height',
  minWidth: 'min-width', minHeight: 'min-height',
  maxWidth: 'max-width', maxHeight: 'max-height',
  top: 'top', left: 'left', right: 'right', bottom: 'bottom',
  borderWidth: 'border-width',
  borderTopWidth: 'border-top-width', borderRightWidth: 'border-right-width',
  borderBottomWidth: 'border-bottom-width', borderLeftWidth: 'border-left-width',
  borderRadius: 'border-radius',
  borderTopLeftRadius: 'border-top-left-radius', borderTopRightRadius: 'border-top-right-radius',
  borderBottomLeftRadius: 'border-bottom-left-radius', borderBottomRightRadius: 'border-bottom-right-radius',
  borderTopStartRadius: 'border-top-left-radius', borderTopEndRadius: 'border-top-right-radius',
  borderBottomStartRadius: 'border-bottom-left-radius', borderBottomEndRadius: 'border-bottom-right-radius',
  gap: 'gap', rowGap: 'row-gap', columnGap: 'column-gap',
  flexBasis: 'flex-basis',
};
const DIRECT_UNITLESS_PROPS = {
  zIndex: 'z-index', flexGrow: 'flex-grow', flexShrink: 'flex-shrink', opacity: 'opacity',
};
const DIRECT_VALUE_PROPS = {
  flexDirection: 'flex-direction', justifyContent: 'justify-content', alignItems: 'align-items',
  alignSelf: 'align-self', flexWrap: 'flex-wrap', backgroundColor: 'background-color',
  overflow: 'overflow', position: 'position',
  borderColor: 'border-color', borderTopColor: 'border-top-color',
  borderRightColor: 'border-right-color', borderBottomColor: 'border-bottom-color',
  borderLeftColor: 'border-left-color',
};
const MARGIN_PADDING_LONGHAND = {
  Top: 'top', Right: 'right', Bottom: 'bottom', Left: 'left',
};

function applyBoxSpacing(css, style, base) {
  // margin / padding: the plain form, the *Horizontal/*Vertical shorthand,
  // and the four longhand sides. Later (more specific) keys must win, so
  // apply in the same order RN resolves them: base -> horizontal/vertical
  // -> the exact side.
  const plain = style[base];
  if (plain !== undefined) {
    const v = px(plain);
    if (v) css[base] = v;
  }
  const h = style[`${base}Horizontal`];
  if (h !== undefined) {
    const v = px(h);
    if (v) { css[`${base}-left`] = v; css[`${base}-right`] = v; }
  }
  const vert = style[`${base}Vertical`];
  if (vert !== undefined) {
    const v = px(vert);
    if (v) { css[`${base}-top`] = v; css[`${base}-bottom`] = v; }
  }
  for (const [rn, css_] of Object.entries(MARGIN_PADDING_LONGHAND)) {
    const val = style[`${base}${rn}`];
    if (val !== undefined) { const v = px(val); if (v) css[`${base}-${css_}`] = v; }
  }
  // Start/End (no RTL support here; app is LTR-only in practice) map onto
  // left/right exactly like their *Left/*Right siblings.
  const start = style[`${base}Start`];
  if (start !== undefined) { const v = px(start); if (v) css[`${base}-left`] = v; }
  const end = style[`${base}End`];
  if (end !== undefined) { const v = px(end); if (v) css[`${base}-right`] = v; }
}

function mapContainerCss(style) {
  const css = { ...VIEW_BASE_CSS };
  if (style.flex !== undefined) css.flex = `${style.flex} 1 0%`;
  for (const [rn, cssProp] of Object.entries(DIRECT_PX_PROPS)) {
    if (style[rn] !== undefined) { const v = px(style[rn]); if (v) css[cssProp] = v; }
  }
  for (const [rn, cssProp] of Object.entries(DIRECT_UNITLESS_PROPS)) {
    if (style[rn] !== undefined) { const v = unitless(style[rn]); if (v) css[cssProp] = v; }
  }
  for (const [rn, cssProp] of Object.entries(DIRECT_VALUE_PROPS)) {
    if (style[rn] !== undefined) css[cssProp] = String(style[rn]);
  }
  applyBoxSpacing(css, style, 'margin');
  applyBoxSpacing(css, style, 'padding');
    // CSS draws no border without a border-style; React Native draws one for
  // any width. Every hairline, card edge and outline was missing from the
  // first renders because of this line's absence.
  // Per side: a bare `border-style: solid` would give every UNSPECIFIED side
  // the CSS default width (medium, 3 px) and box every hairline-ruled row.
  if (css['border-width']) css['border-style'] = 'solid';
  for (const side of ['top', 'bottom', 'left', 'right']) {
    if (css[`border-${side}-width`]) css[`border-${side}-style`] = 'solid';
  }
return css;
}

// ── Text style mapping ───────────────────────────────────────────────────

function mapTextCss(style, fontFamilyMap) {
  const css = {};
  if (style.fontSize !== undefined) css['font-size'] = px(style.fontSize);
  css['line-height'] = style.lineHeight !== undefined ? px(style.lineHeight) : 'normal';
  if (style.letterSpacing !== undefined) css['letter-spacing'] = px(style.letterSpacing);
  // A Text with NO colour renders BLACK on a real device (RN's own
  // default) -- surfaced honestly, not hidden with a fallback. See README.
  css.color = style.color !== undefined ? String(style.color) : '#000000';
  if (style.textAlign !== undefined) css['text-align'] = style.textAlign;
  if (style.textTransform !== undefined) css['text-transform'] = style.textTransform;
  if (style.textDecorationLine !== undefined) css['text-decoration-line'] = style.textDecorationLine;
  if (Array.isArray(style.fontVariant) && style.fontVariant.includes('tabular-nums')) {
    css['font-variant-numeric'] = 'tabular-nums';
  }
  if (style.opacity !== undefined) css.opacity = unitless(style.opacity);
  // Font FACE by name, never numeric fontWeight (see FONT_FACES header).
  // SINGLE-quoted, deliberately: cssToString() below does no HTML escaping
  // of its own, and this whole declaration block is embedded verbatim
  // inside a DOUBLE-quoted style="..." attribute -- a literal `"` here
  // closes that attribute early (found by opening a real render: every
  // property after font-family silently stopped applying, including the
  // font-family itself, so every Text rendered in the body's inherited
  // Inter-Regular fallback regardless of its real weight, plus the
  // numberOfLines line-clamp properties that come after it in the object).
  // Single quotes are equally valid CSS for a font-family string and never
  // collide with the outer double quotes.
  const family = style.fontFamily;
  if (family && fontFamilyMap.has(family)) {
    css['font-family'] = `'${family}'`;
  } else if (family) {
    css['font-family'] = `'${family}', sans-serif`;
  } else {
    css['font-family'] = "'Inter-Regular'";
  }
  css['font-synthesis'] = 'none';
  return css;
}

function cssToString(css) {
  return Object.entries(css)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `${k}:${v}`)
    .join(';');
}

// ── Node-type dispatch ────────────────────────────────────────────────────

// zeego/context-menu's shared repo-root mock (__mocks__/zeego/context-menu.js)
// renders Root/Content as an unconditional passthrough with no open/closed
// state at all (real screen-mount tests only assert the items exist and
// their onSelect fires, never that they are hidden) -- so every ContextMenu
// this converter meets is, by that mock's own construction, ALWAYS "open".
// On a real device this content is invisible until a long-press, and
// rendering it inline was found (opening a real render, not assumed) to sit
// its own converter debug label directly on top of the row's real text at
// the SAME top-left origin -- an overlap `renderUnknown`'s own label
// mechanism cannot avoid for two nested unknown types. Hidden entirely
// here instead, matching what a closed menu on a real device actually
// shows: nothing. Named host types straight from that mock's own object
// literal, not guessed.
const HIDDEN_TYPES = new Set([
  'ContextMenuItem', 'ContextMenuItemTitle', 'ContextMenuItemSubtitle',
  'ContextMenuItemIcon', 'ContextMenuItemImage', 'ContextMenuItemIndicator',
  'ContextMenuSeparator', 'ContextMenuCheckboxItem', 'ContextMenuLabel',
  'ContextMenuPreview', 'ContextMenuArrow', 'ContextMenuSubTrigger',
]);

const CONTAINER_TYPES = new Set([
  'View', 'ScrollView', 'SafeAreaView', 'RCTScrollView', 'Pressable', 'TouchableOpacity',
  'TouchableHighlight', 'TouchableWithoutFeedback', 'KeyboardAvoidingView', 'FlatList',
  'SectionList', 'VirtualizedList', 'Animated.View', 'Animated.ScrollView', 'GHRoot',
  'GestureDetector', 'WebView', 'ImageBackground', 'RefreshControl',
  // Swipeable: mockPreamble.js's react-native-gesture-handler/Swipeable mock
  // is a bare passthrough (`React.createElement('Swipeable', props,
  // props.children)`), laid out exactly like a View -- DiaryScreen wraps
  // every food-entry row in one, so leaving it as an "unknown type" fallback
  // would slap a grey label on every diary row rather than treating it as
  // the plain wrapper it is.
  'Swipeable',
  // KeyboardGestureArea: react-native-keyboard-controller's own official
  // jest mock (__mocks__/react-native-keyboard-controller.js re-exports it)
  // resolves this to a plain string host component, same passthrough shape.
  'KeyboardGestureArea',
]);
const SVG_TAGS = new Set(['Svg', 'Path', 'Rect', 'Circle', 'Line', 'G', 'Polyline', 'Defs', 'LinearGradient', 'Stop', 'ClipPath']);
// react-native-svg's own Text (inside an Svg tree) vs RN's host Text -- both
// arrive here typed 'Text'; disambiguated by an svgDepth counter in ctx.

function isModalLike(node) {
  if (node.type === 'Modal') return true;
  return /modal|sheet/i.test(String(node.type)) && node.props && 'visible' in node.props;
}

function textContentOf(node) {
  // Concatenates a Text node's own string/number children AND nested Text
  // children's content, for the line-wrap estimator and for icon-glyph
  // fallbacks. Does not recurse into non-Text host children (there
  // shouldn't be any inside a real Text node).
  let out = '';
  for (const c of node.children || []) {
    if (typeof c === 'string' || typeof c === 'number') out += String(c);
    else if (c && c.type === 'Text') out += textContentOf(c);
  }
  return out;
}

function renderChildren(children, ctx) {
  if (!children) return '';
  const arr = Array.isArray(children) ? children : [children];
  return arr.map((c) => renderNode(c, ctx)).join('');
}

function renderTextChildren(children, ctx) {
  if (!children) return '';
  const arr = Array.isArray(children) ? children : [children];
  return arr.map((c) => {
    if (typeof c === 'string' || typeof c === 'number') return escapeHtml(c);
    return renderNode(c, ctx, true);
  }).join('');
}

function bumpStat(ctx, bucket, key) {
  ctx.stats[bucket][key] = (ctx.stats[bucket][key] || 0) + 1;
}

function renderIonicons(node, ctx) {
  const { name, size, color, style: styleProp } = node.props;
  const style = flattenStyle(styleProp);
  const codepoint = name != null ? ctx.ionicons[name] : undefined;
  const fontSize = typeof size === 'number' ? size : (style.width || style.fontSize || 22);
  const css = {
    // Single-quoted: see mapTextCss's comment above on why a double-quoted
    // value here breaks the outer style="..." attribute (and, because
    // font-family is the FIRST key in this object, would have taken
    // font-size/color/line-height/display down with it -- every icon on
    // every screen, not just a missing glyph).
    'font-family': "'Ionicons'",
    'font-size': px(fontSize),
    color: color || style.color || String(style.tintColor || '#FFFFFF'),
    'line-height': px(fontSize),
    display: 'inline-block',
    ...(style.margin !== undefined ? { margin: px(style.margin) } : {}),
  };
  if (codepoint === undefined) {
    bumpStat(ctx, 'converterFallbacks', `ionicons-glyph-missing:${name}`);
    return `<span style="${cssToString(css)}" title="missing glyph: ${escapeHtml(name)}">${escapeHtml('?')}</span>`;
  }
  return `<span style="${cssToString(css)}">${String.fromCodePoint(codepoint)}</span>`;
}

function renderImage(node, ctx) {
  const style = mapContainerCss(flattenStyle(node.props.style));
  style.background = '#1c1b19';
  style['border-width'] = style['border-width'] || '1px';
  style['border-style'] = 'solid';
  style['border-color'] = style['border-color'] || '#2a2926';
  if (!style.width) style.width = '48px';
  if (!style.height) style.height = '48px';
  return `<div style="${cssToString(style)}"></div>`;
}

function renderSwitch(node, ctx) {
  const { value, trackColor, thumbColor } = node.props;
  const track = (trackColor && (value ? trackColor.true : trackColor.false)) || (value ? '#F5A623' : '#3A3A38');
  const thumb = thumbColor || '#FFFFFF';
  const w = 51; const h = 31; const pad = 2; const knob = h - pad * 2;
  const style = {
    width: `${w}px`, height: `${h}px`, 'border-radius': `${h / 2}px`,
    'background-color': track, position: 'relative', 'flex-shrink': '0', 'box-sizing': 'border-box',
  };
  const knobStyle = {
    position: 'absolute', top: `${pad}px`, width: `${knob}px`, height: `${knob}px`,
    'border-radius': `${knob / 2}px`, 'background-color': thumb,
    left: value ? `${w - knob - pad}px` : `${pad}px`,
  };
  return `<div style="${cssToString(style)}"><div style="${cssToString(knobStyle)}"></div></div>`;
}

function renderTextInput(node, ctx) {
  const style = flattenStyle(node.props.style);
  const textCss = mapTextCss(style, ctx.fontFamilyMap);
  const containerCss = mapContainerCss(style);
  const value = node.props.value;
  const hasValue = value !== undefined && value !== null && value !== '';
  if (!hasValue) textCss.color = style.placeholderTextColor || '#5C5C5A';
  const text = hasValue ? String(value) : String(node.props.placeholder || '');
  return `<div style="${cssToString({ ...containerCss, ...textCss })}">${escapeHtml(text)}</div>`;
}

const SVG_ATTR_PASSTHROUGH = [
  'd', 'fill', 'stroke', 'strokeWidth', 'strokeLinecap', 'strokeLinejoin', 'strokeDasharray',
  'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'width', 'height', 'viewBox',
  'points', 'offset', 'stopColor', 'stopOpacity', 'id', 'opacity', 'transform', 'fillOpacity',
  'fillRule', 'clipRule', 'textAnchor',
];
const SVG_ATTR_RENAME = {
  strokeWidth: 'stroke-width', strokeLinecap: 'stroke-linecap', strokeLinejoin: 'stroke-linejoin',
  strokeDasharray: 'stroke-dasharray', stopColor: 'stop-color', stopOpacity: 'stop-opacity',
  fillOpacity: 'fill-opacity', fillRule: 'fill-rule', clipRule: 'clip-rule', textAnchor: 'text-anchor',
  viewBox: 'viewBox', // SVG attribute is camelCase in the DOM already
};

function renderSvgNode(node, ctx) {
  const tag = node.type;
  const attrs = [];
  for (const key of SVG_ATTR_PASSTHROUGH) {
    const v = node.props[key];
    if (v === undefined || v === null) continue;
    const attrName = SVG_ATTR_RENAME[key] || key;
    attrs.push(`${attrName}="${escapeHtml(v)}"`);
  }
  const inner = renderChildren(node.children, { ...ctx, svgDepth: ctx.svgDepth + 1 });
  if (tag === 'Svg') {
    const w = node.props.width ?? 24;
    const h = node.props.height ?? 24;
    attrs.push(`xmlns="http://www.w3.org/2000/svg"`);
    if (node.props.width !== undefined) attrs.push(`width="${w}"`);
    if (node.props.height !== undefined) attrs.push(`height="${h}"`);
    return `<svg ${attrs.join(' ')}>${inner}</svg>`;
  }
  const svgTag = tag.toLowerCase();
  return `<${svgTag} ${attrs.join(' ')}>${inner}</${svgTag}>`;
}

// A react-native-skia Canvas. mockPreamble.js makes each Skia path record the
// commands the app drew it with, so its Paths draw here as the same shapes in
// SVG (the calorie ring reads as the ring). A path handed over as a shared
// value (useDerivedValue) is read through its `.value`.
function skiaPathData(p) {
  const path = p && typeof p === 'object' && p.value && typeof p.value.toSVGString === 'function' ? p.value : p;
  return path && typeof path.toSVGString === 'function' ? path.toSVGString() : '';
}

function renderSkiaCanvas(node, ctx) {
  const style = flattenStyle(node.props.style);
  const w = Number(style.width) || 0;
  const h = Number(style.height) || 0;
  const parts = [];
  const walk = (children) => {
    const arr = Array.isArray(children) ? children : (children ? [children] : []);
    for (const c of arr) {
      if (!c || typeof c !== 'object') continue;
      if (c.type !== 'Path') {
        bumpStat(ctx, 'unknownTypes', `Skia:${c.type}`);
        walk(c.children);
        continue;
      }
      const d = skiaPathData(c.props.path);
      if (!d) continue;
      const colour = escapeHtml(c.props.color || '#000000');
      const attrs = [`d="${escapeHtml(d)}"`];
      if (c.props.style === 'stroke') {
        attrs.push('fill="none"', `stroke="${colour}"`, `stroke-width="${Number(c.props.strokeWidth) || 1}"`);
        if (c.props.strokeCap) attrs.push(`stroke-linecap="${escapeHtml(c.props.strokeCap)}"`);
        if (c.props.strokeJoin) attrs.push(`stroke-linejoin="${escapeHtml(c.props.strokeJoin)}"`);
      } else {
        attrs.push(`fill="${colour}"`);
      }
      if (c.props.opacity !== undefined && c.props.opacity !== null) attrs.push(`opacity="${Number(c.props.opacity)}"`);
      parts.push(`<path ${attrs.join(' ')}/>`);
    }
  };
  walk(node.children);
  const css = mapContainerCss(style);
  return `<div style="${cssToString(css)}"><svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block;overflow:visible">${parts.join('')}</svg></div>`;
}

function renderUnknown(node, ctx) {
  bumpStat(ctx, 'unknownTypes', node.type);
  const style = mapContainerCss(flattenStyle(node.props.style));
  const label = `<span style="position:absolute;top:0;left:0;font-size:8px;line-height:10px;color:#888;background:#222;padding:1px 3px;z-index:9999;font-family:monospace;pointer-events:none;">${escapeHtml(node.type)}</span>`;
  style.position = style.position || 'relative';
  return `<div style="${cssToString(style)}">${label}${renderChildren(node.children, ctx)}</div>`;
}

function renderNode(node, ctx, forceInlineText) {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string' || typeof node === 'number') return escapeHtml(node);
  const { type } = node;

  if (HIDDEN_TYPES.has(type)) return '';

  if (type === 'Canvas') return renderSkiaCanvas(node, ctx);

  if (isModalLike(node)) {
    if (!node.props.visible) return '';
    // A visible bare Modal/Sheet: render its content as a plain container
    // (real device would show it as an overlay; a static paper render has
    // no meaningful "on top of" -- content still needs to be visible).
  }

  if (ctx.svgDepth > 0 || SVG_TAGS.has(type) || (type === 'Text' && ctx.svgDepth > 0)) {
    if (SVG_TAGS.has(type)) return renderSvgNode(node, ctx);
    if (type === 'Text') {
      const style = flattenStyle(node.props.style);
      const attrs = [];
      if (node.props.x !== undefined) attrs.push(`x="${node.props.x}"`);
      if (node.props.y !== undefined) attrs.push(`y="${node.props.y}"`);
      // react-native-svg's Text takes fontSize as a PROP (VolyumeChart's
      // axis labels pass fontSize={9}); reading only the style left the
      // browser's 16px default in place and the labels clipped at the
      // chart's left edge in every render, a harness artefact, not the app.
      const svgFontSize = node.props.fontSize || style.fontSize;
      if (svgFontSize) attrs.push(`font-size="${svgFontSize}"`);
      if (node.props.fontFamily || style.fontFamily) attrs.push(`font-family="${node.props.fontFamily || style.fontFamily}"`);
      if (node.props.fill || style.color) attrs.push(`fill="${node.props.fill || style.color}"`);
      if (node.props.textAnchor) attrs.push(`text-anchor="${node.props.textAnchor}"`);
      return `<text ${attrs.join(' ')}>${escapeHtml(textContentOf(node))}</text>`;
    }
  }

  if (type === 'Ionicons') return renderIonicons(node, ctx);
  if (type === 'Image') return renderImage(node, ctx);
  if (type === 'Switch') return renderSwitch(node, ctx);
  if (type === 'TextInput') return renderTextInput(node, ctx);

  if (type === 'Text') {
    const style = flattenStyle(node.props.style);
    const css = mapTextCss(style, ctx.fontFamilyMap);
    const tag = forceInlineText ? 'span' : 'div';
    if (!forceInlineText) {
      css.display = 'block';
      // numberOfLines line-clamp.
      const n = node.props.numberOfLines;
      if (Number.isInteger(n) && n > 0) {
        css.overflow = 'hidden';
        css.display = '-webkit-box';
        css['-webkit-line-clamp'] = String(n);
        css['-webkit-box-orient'] = 'vertical';
      }
    }
    return `<${tag} style="${cssToString(css)}">${renderTextChildren(node.children, ctx)}</${tag}>`;
  }

  if (CONTAINER_TYPES.has(type)) {
    const style = flattenStyle(node.props.style);
    const css = mapContainerCss(style);
    // A ScrollView's `contentContainerStyle` is where a screen's gutter and
    // section gap live (`content: { padding, gap }`). The jest mock keeps it
    // as a prop on the RCTScrollView node rather than on an inner View, so it
    // is applied here to an inner wrapper -- without this every scroll screen
    // rendered flush to the edge with no rhythm, which is not the app.
    const contentStyle = node.props.contentContainerStyle
      ? mapContainerCss(flattenStyle(node.props.contentContainerStyle))
      : null;
    const inner = contentStyle
      ? `<div style="${cssToString(contentStyle)}">${renderChildren(node.children, ctx)}</div>`
      : renderChildren(node.children, ctx);
    return `<div style="${cssToString(css)}">${inner}</div>`;
  }

  return renderUnknown(node, ctx);
}

// ── Height estimator (best-effort; see README "Height estimate" section) ──

function estimateTextLines(text, fontSizePx, containerWidthPx) {
  const clean = String(text || '').trim();
  if (!clean) return clean.length ? 1 : 0;
  const avgCharWidth = fontSizePx * 0.56;
  const words = clean.split(/\s+/).filter(Boolean);
  let lines = 1;
  let cur = 0;
  const w = Math.max(20, containerWidthPx);
  for (const word of words) {
    const wWidth = word.length * avgCharWidth;
    if (cur === 0) { cur = wWidth; continue; }
    if (cur + avgCharWidth + wWidth > w) { lines += 1; cur = wWidth; } else cur += avgCharWidth + wWidth;
  }
  return Math.max(1, lines);
}

function estimateNode(node, availWidth) {
  if (node === null || node === undefined) return 0;
  if (typeof node === 'string' || typeof node === 'number') return 0; // handled by the owning Text
  const style = flattenStyle(node.props && node.props.style);
  const marginV = (Number(style.marginTop) || Number(style.margin) || Number(style.marginVertical) || 0)
    + (Number(style.marginBottom) || Number(style.margin) || Number(style.marginVertical) || 0);

  if (node.type === 'Text') {
    const fontSize = Number(style.fontSize) || 14;
    const lineHeight = Number(style.lineHeight) || Math.round(fontSize * 1.3);
    const n = Number.isInteger(node.props.numberOfLines) ? node.props.numberOfLines : Infinity;
    const text = textContentOf(node);
    const lines = Math.min(estimateTextLines(text, fontSize, availWidth) || 1, n);
    return lines * lineHeight + marginV;
  }
  if (node.type === 'Image' || node.type === 'Switch') {
    const h = Number(style.height) || (node.type === 'Switch' ? 31 : 48);
    return h + marginV;
  }
  if (node.type === 'Ionicons') {
    const size = Number(node.props.size) || 22;
    return size + marginV;
  }
  if (node.type === 'TextInput') {
    const fontSize = Number(style.fontSize) || 14;
    const padV = (Number(style.paddingVertical) || 0) * 2
      + (Number(style.paddingTop) || 0) + (Number(style.paddingBottom) || 0);
    return Math.round(fontSize * 1.4) + padV + marginV;
  }
  if (!node.children) {
    const explicit = Number(style.height);
    return (Number.isFinite(explicit) ? explicit : 0) + marginV;
  }

  const padH = (Number(style.paddingLeft) || Number(style.paddingHorizontal) || Number(style.padding) || 0)
    + (Number(style.paddingRight) || Number(style.paddingHorizontal) || Number(style.padding) || 0);
  const childAvail = Math.max(20, availWidth - padH);
  const kids = Array.isArray(node.children) ? node.children : [node.children];
  const heights = kids.map((k) => estimateNode(k, childAvail));
  const gap = Number(style.gap) || Number(style.rowGap) || 0;
  let contentHeight;
  if (style.flexDirection === 'row' && style.flexWrap !== 'wrap') {
    contentHeight = Math.max(0, ...heights, 0);
  } else if (style.flexDirection === 'row' && style.flexWrap === 'wrap') {
    // Rough wrap estimate: assume children share childAvail width evenly
    // sized by their own estimated "footprint" -- too irregular to do
    // properly without real widths, so fall back to the SUM (safer
    // over-estimate than under, per the brief's own guidance).
    contentHeight = heights.reduce((a, b) => a + b, 0);
  } else {
    contentHeight = heights.reduce((a, b) => a + b, 0) + gap * Math.max(0, heights.length - 1);
  }
  const padV = (Number(style.paddingTop) || Number(style.paddingVertical) || Number(style.padding) || 0)
    + (Number(style.paddingBottom) || Number(style.paddingVertical) || Number(style.padding) || 0);
  const borderV = (Number(style.borderTopWidth) || Number(style.borderWidth) || 0)
    + (Number(style.borderBottomWidth) || Number(style.borderWidth) || 0);
  const explicit = Number(style.height);
  const computed = contentHeight + padV + borderV;
  return Math.max(Number.isFinite(explicit) ? explicit : 0, computed) + marginV;
}

// ── Top-level entry point ────────────────────────────────────────────────

/**
 * @param {object|object[]} json - a toJSON()-shaped host tree.
 * @param {object} opts
 * @param {'dark'|'light'} opts.theme
 * @param {string} opts.title - <title> / on-page identifier.
 * @param {string} opts.backgroundColor - page background (theme colors.background).
 * @param {Record<string,string>} opts.fontFamilyMap - not required; every
 *   name in FONT_FACES is always registered. Reserved for future faces.
 * @param {string} [opts.repoRoot]
 * @param {number} [opts.foldY] - default 915.
 * @param {{height:number}} [opts.phone] - lay the page out as one phone
 *   screen of this CSS height instead of the full scroll: the screen fills
 *   the height (its own flex does the rest, so a pinned footer sits at the
 *   bottom and a scroll view clips), anything rendered after it (the tab
 *   bar) keeps its natural height at the foot, and the fold line is not
 *   drawn. Used for the Welcome screen's product captures (welcome.js).
 * @returns {{ html: string, stats: { unknownTypes: object, converterFallbacks: object, estimatedHeightPx: number } }}
 */
function treeToHtml(json, opts) {
  const repoRoot = opts.repoRoot || REPO_ROOT_DEFAULT;
  const foldY = Number.isFinite(opts.foldY) ? opts.foldY : 915;
  const fontFamilyMap = new Map(FONT_FACES.map((f) => [f.family, f]));
  let glyphmap = {};
  try { glyphmap = require(path.join(repoRoot, IONICONS_GLYPHMAP_REL)); } catch (_) { /* best-effort */ }

  const stats = { unknownTypes: {}, converterFallbacks: {} };
  const ctx = { fontFamilyMap, ionicons: glyphmap, stats, svgDepth: 0 };

  const roots = Array.isArray(json) ? json : [json];
  const bodyHtml = roots.map((r) => renderNode(r, ctx)).join('');
  const estimatedHeightPx = 24 /* status-bar padding */
    + roots.reduce((sum, r) => sum + estimateNode(r, 412), 0);

  const fontFaceCss = FONT_FACES.map((f) => `
    @font-face {
      font-family: "${f.family}";
      src: url("${fileUrl(path.join(repoRoot, 'assets', 'fonts', f.file))}") format("truetype");
      font-weight: ${f.weight};
      font-display: block;
    }`).join('\n');
  const ioniconsFaceCss = `
    @font-face {
      font-family: "Ionicons";
      src: url("${fileUrl(path.join(repoRoot, IONICONS_TTF_REL))}") format("truetype");
      font-display: block;
    }`;

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${escapeHtml(opts.title || 'paper-render')}</title>
<style>
${fontFaceCss}
${ioniconsFaceCss}
* { font-synthesis: none; -webkit-font-smoothing: antialiased; }
html, body { margin: 0; padding: 0; }
body {
  background: ${opts.backgroundColor || (opts.theme === 'light' ? '#FAFAF7' : '#111110')};
  width: 412px;
  position: relative;
  font-family: "Inter-Regular";
}
#pr-page { padding-top: 24px; position: relative; box-sizing: border-box; width: 412px; }
#pr-fold {
  position: absolute; left: 0; top: ${foldY}px; width: 412px; height: 0;
  border-top: 1px dashed #ff2d55; z-index: 100000; pointer-events: none;
}
${opts.phone ? `#pr-page { display: flex; flex-direction: column; height: ${Number(opts.phone.height)}px; overflow: hidden; }
#pr-page > * { flex-shrink: 0; }
#pr-page > :first-child { flex: 1 1 0%; min-height: 0; overflow: hidden; }
#pr-fold { display: none; }
` : ''}#pr-fold::after {
  content: "fold"; position: absolute; right: 4px; top: 2px; font-family: monospace;
  font-size: 10px; color: #ff2d55; background: rgba(0,0,0,0.55); padding: 1px 4px; border-radius: 3px;
}
</style>
</head>
<body>
<div id="pr-page">${bodyHtml}</div>
<div id="pr-fold"></div>
</body>
</html>`;

  return { html, stats: { ...stats, estimatedHeightPx } };
}

module.exports = { treeToHtml, FONT_FACES, flattenStyle, estimateNode };
