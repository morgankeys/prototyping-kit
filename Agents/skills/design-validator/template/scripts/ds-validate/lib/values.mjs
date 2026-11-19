// Value helpers: walk a declaration value (including inside functions and var()
// fallbacks) and recognise literals.
import valueParser from 'postcss-value-parser';

export const NAMED_COLORS = new Set(
  (
    'aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue ' +
    'blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk ' +
    'crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki ' +
    'darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen ' +
    'darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue ' +
    'dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite ' +
    'gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki ' +
    'lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan ' +
    'lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen ' +
    'lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen ' +
    'magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen ' +
    'mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream ' +
    'mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid ' +
    'palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum ' +
    'powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown ' +
    'seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen ' +
    'steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen'
  ).split(' '),
);

// Functions that are a literal color unless built from a variable.
const COLOR_FUNCTIONS = new Set(['rgb', 'rgba', 'hsl', 'hsla', 'hwb', 'lab', 'lch', 'oklab', 'oklch', 'color']);

const HEX = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

export const parse = (value) => valueParser(value);
export const stringify = (nodes) => valueParser.stringify(nodes);
export const normalize = (value) => value.replace(/\s+/g, ' ').trim();

const hasVar = (node) => {
  let found = false;
  valueParser.walk(node.nodes ?? [], (n) => {
    if (n.type === 'function' && n.value.toLowerCase() === 'var') found = true;
  });
  return found;
};

// Visit every node a literal can hide in: top level, inside functions (calc(), gradients,
// color-mix()), and inside var() fallbacks. The var() name itself is not visited.
export function walkValue(nodes, visit) {
  for (const node of nodes) {
    if (node.type === 'function' && node.value.toLowerCase() === 'var') {
      const comma = node.nodes.findIndex((n) => n.type === 'div' && n.value === ',');
      if (comma >= 0) walkValue(node.nodes.slice(comma + 1), visit);
      continue;
    }
    if (visit(node) === false) continue;
    if (node.type === 'function') walkValue(node.nodes, visit);
  }
}

// Every `var(--name)` referenced in a value, including nested ones in fallbacks.
export function varNames(value) {
  const names = [];
  valueParser(value).walk((n) => {
    if (n.type === 'function' && n.value.toLowerCase() === 'var') {
      const first = n.nodes.find((c) => c.type === 'word');
      if (first?.value.startsWith('--')) names.push(first.value);
    }
  });
  return names;
}

export function literalColors(value, allowed) {
  const found = [];
  walkValue(valueParser(value).nodes, (node) => {
    if (node.type === 'word') {
      const w = node.value.toLowerCase();
      if (allowed.has(w)) return;
      if (HEX.test(w) || NAMED_COLORS.has(w)) found.push(node.value);
    } else if (node.type === 'function' && COLOR_FUNCTIONS.has(node.value.toLowerCase())) {
      if (!hasVar(node)) found.push(valueParser.stringify(node));
      return false;
    }
  });
  return found;
}

// Non-zero numbers with a unit (`20px`, `1.5rem`, `5%`).
export function rawLengths(value, allowed) {
  const found = [];
  walkValue(valueParser(value).nodes, (node) => {
    if (node.type !== 'word' || allowed.has(node.value.toLowerCase())) return;
    const u = valueParser.unit(node.value);
    if (u && u.unit && !u.unit.startsWith('-') && Number(u.number) !== 0 && !/^#/.test(node.value)) {
      found.push(node.value);
    }
  });
  return found;
}

// Plain numbers (no unit), optionally including keywords.
export function rawNumbersOrKeywords(value, allowed, keywords = new Set(), { withUnits = false } = {}) {
  const found = [];
  walkValue(valueParser(value).nodes, (node) => {
    if (node.type !== 'word') return;
    const w = node.value.toLowerCase();
    if (allowed.has(w)) return;
    if (keywords.has(w)) return void found.push(node.value);
    const u = valueParser.unit(node.value);
    if (!u || Number(u.number) === 0 || /^#/.test(node.value)) return;
    if (u.unit === '' || withUnits) found.push(node.value);
  });
  return found;
}
