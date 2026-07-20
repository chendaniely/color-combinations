// Hand-curated grouping hierarchy for the 157 Sanzo Wada colors.
//
// This is AUTHORED DATA, not derived: super groups and broad families are
// fixed by design; fine families and the 157 slug -> fine family
// assignments were hand-picked while looking at `preview-hues.ts` output
// (hue/lightness-sorted ANSI swatches), favoring how a person picking
// outfit colors would look for each shade over the (sometimes misleading)
// Sanzo Wada plate name. See tests/curation.test.ts for the invariants
// this data must satisfy.

export interface Curation {
  superGroups: { id: string; name: string }[]
  broadFamilies: { id: string; name: string; superId: string }[]
  fineFamilies: { id: string; name: string; broadId: string }[]
  assignments: Record<string, string>
}

export const curation: Curation = {
  superGroups: [
    { id: 'warm', name: 'Warm' },
    { id: 'cool', name: 'Cool' },
    { id: 'earthy', name: 'Earthy' },
    { id: 'neutral', name: 'Neutral' },
  ],
  broadFamilies: [
    { id: 'pink', name: 'Pink', superId: 'warm' },
    { id: 'red', name: 'Red', superId: 'warm' },
    { id: 'orange', name: 'Orange', superId: 'warm' },
    { id: 'yellow', name: 'Yellow', superId: 'warm' },
    { id: 'green', name: 'Green', superId: 'cool' },
    { id: 'teal', name: 'Teal', superId: 'cool' },
    { id: 'blue', name: 'Blue', superId: 'cool' },
    { id: 'purple', name: 'Purple', superId: 'cool' },
    { id: 'brown', name: 'Brown', superId: 'earthy' },
    { id: 'gray', name: 'Gray & Ivory', superId: 'neutral' },
  ],
  fineFamilies: [
    // pink
    { id: 'blush-pinks', name: 'Blush Pinks', broadId: 'pink' },
    { id: 'hot-pinks', name: 'Hot Pinks', broadId: 'pink' },
    // red
    { id: 'true-reds', name: 'True Reds', broadId: 'red' },
    { id: 'wine-reds', name: 'Wine Reds', broadId: 'red' },
    // orange
    { id: 'vermilions', name: 'Vermilions', broadId: 'orange' },
    { id: 'tangerines', name: 'Tangerines', broadId: 'orange' },
    // yellow
    { id: 'sunny-yellows', name: 'Sunny Yellows', broadId: 'yellow' },
    // green
    { id: 'olives', name: 'Olives', broadId: 'green' },
    { id: 'olive-greens', name: 'Olive Greens', broadId: 'green' },
    { id: 'spring-greens', name: 'Spring Greens', broadId: 'green' },
    { id: 'leaf-greens', name: 'Leaf Greens', broadId: 'green' },
    // teal
    { id: 'pale-teals', name: 'Pale Teals', broadId: 'teal' },
    { id: 'deep-teals', name: 'Deep Teals', broadId: 'teal' },
    // blue
    { id: 'sky-blues', name: 'Sky Blues', broadId: 'blue' },
    { id: 'deep-blues', name: 'Deep Blues', broadId: 'blue' },
    // purple
    { id: 'lilacs', name: 'Lilacs', broadId: 'purple' },
    { id: 'violets', name: 'Violets', broadId: 'purple' },
    { id: 'plums', name: 'Plums', broadId: 'purple' },
    // brown
    { id: 'umbers', name: 'Umbers', broadId: 'brown' },
    { id: 'russets', name: 'Russets & Siennas', broadId: 'brown' },
    { id: 'tans', name: 'Tans & Ochres', broadId: 'brown' },
    // gray
    { id: 'ivories', name: 'Ivories', broadId: 'gray' },
    { id: 'slate-grays', name: 'Slate Grays', broadId: 'gray' },
  ],
  assignments: {
    // --- pink / Blush Pinks (pale, dusty, or soft warm pinks) ---
    'vinaceous-cinnamon': 'blush-pinks',
    'seashell-pink': 'blush-pinks',
    'light-pinkish-cinnamon': 'blush-pinks',
    'ochraceous-salmon': 'blush-pinks',
    'pinkish-cinnamon': 'blush-pinks',
    'hermosa-pink': 'blush-pinks',
    'corinthian-pink': 'blush-pinks',
    'cameo-pink': 'blush-pinks',
    fawn: 'blush-pinks',
    'fresh-color': 'blush-pinks',
    'coral-red': 'blush-pinks',

    // --- pink / Hot Pinks (vivid, punchy magenta-pinks) ---
    'eosine-pink': 'hot-pinks',
    'spinel-red': 'hot-pinks',
    'indian-lake': 'hot-pinks',
    'old-rose': 'hot-pinks',
    'grenadine-pink': 'hot-pinks',

    // --- red / True Reds (clean, vivid reds) ---
    'spectrum-red': 'true-reds',
    'eugenia-red-|-b': 'true-reds',
    scarlet: 'true-reds',
    carmine: 'true-reds',
    'eugenia-red-|-a': 'true-reds',
    'carmine-red': 'true-reds',
    'etruscan-red': 'true-reds',

    // --- red / Wine Reds (dark, saturated burgundy/crimson reds) ---
    'vandyke-red': 'wine-reds',
    red: 'wine-reds',
    'hydrangea-red': 'wine-reds',
    'pompeian-red': 'wine-reds',
    'pale-burnt-lake': 'wine-reds',

    // --- orange / Vermilions (bright orange-reds) ---
    'red-orange': 'vermilions',
    'peach-red': 'vermilions',
    'jasper-red': 'vermilions',
    'english-red': 'vermilions',
    orange: 'vermilions',

    // --- orange / Tangerines (bright golden oranges/apricots) ---
    'apricot-orange': 'tangerines',
    'golden-yellow': 'tangerines',
    'yellow-orange': 'tangerines',
    'cinnamon-buff': 'tangerines',
    'cream-yellow': 'tangerines',
    'orange-yellow': 'tangerines',

    // --- yellow / Sunny Yellows (clean, bright true yellows) ---
    'naples-yellow': 'sunny-yellows',
    'pale-lemon-yellow': 'sunny-yellows',
    'sulpher-yellow': 'sunny-yellows',
    'lemon-yellow': 'sunny-yellows',
    yellow: 'sunny-yellows',
    'sulphine-yellow': 'sunny-yellows',
    'apricot-yellow': 'sunny-yellows',
    'pyrite-yellow': 'sunny-yellows',

    // --- green / Olives (drab, citrine-toned olive drabs) ---
    'light-brownish-olive': 'olives',
    'olive-ocher': 'olives',
    'deep-grayish-olive': 'olives',
    'buffy-citrine': 'olives',
    'dark-citrine': 'olives',
    olive: 'olives',
    'olive-yellow': 'olives',

    // --- green / Olive Greens (drab, military olive greens) ---
    'light-grayish-olive': 'olive-greens',
    'lincoln-green': 'olive-greens',
    'olive-green': 'olive-greens',
    'oil-green': 'olive-greens',
    'krongbergs-green': 'olive-greens',
    'blackish-olive': 'olive-greens',
    'deep-slate-olive': 'olive-greens',

    // --- green / Spring Greens (bright chartreuse/yellow-greens) ---
    'citron-yellow': 'spring-greens',
    'light-green-yellow': 'spring-greens',
    'olive-buff': 'spring-greens',
    'yellow-green': 'spring-greens',
    'night-green': 'spring-greens',
    'rainette-green': 'spring-greens',

    // --- green / Leaf Greens (true, mid-to-pale greens) ---
    'dark-greenish-glaucous': 'leaf-greens',
    'cossack-green': 'leaf-greens',
    'diamine-green': 'leaf-greens',
    'cobalt-green': 'leaf-greens',
    green: 'leaf-greens',
    'dull-viridian-green': 'leaf-greens',
    'turquoise-green': 'leaf-greens',
    'pistachio-green': 'leaf-greens',
    'glaucous-green': 'leaf-greens',
    'sea-green': 'leaf-greens',
    'venice-green': 'leaf-greens',

    // --- teal / Pale Teals (soft, light blue-greens) ---
    'calamine-blue': 'pale-teals',
    'nile-blue': 'pale-teals',
    'light-glaucous-blue': 'pale-teals',
    "pale-king's-blue": 'pale-teals',

    // --- teal / Deep Teals (mid-to-dark peacock/teal blue-greens) ---
    'andover-green': 'deep-teals',
    'dusky-green': 'deep-teals',
    'benzol-green': 'deep-teals',
    'light-porcelain-green': 'deep-teals',
    'artemesia-green': 'deep-teals',
    'deep-slate-green': 'deep-teals',
    'peacock-blue': 'deep-teals',
    'green-blue': 'deep-teals',
    'cerulian-blue': 'deep-teals',
    'dark-medici-blue': 'deep-teals',
    'antwarp-blue': 'deep-teals',

    // --- blue / Sky Blues (light-to-mid, airy blues) ---
    'salvia-blue': 'sky-blues',
    blue: 'sky-blues',
    'olympic-blue': 'sky-blues',
    'dark-soft-violet': 'sky-blues',

    // --- blue / Deep Blues (dark, saturated navy/indigo blues) ---
    "vandar-poel's-blue": 'deep-blues',
    'helvetia-blue': 'deep-blues',
    'dark-tyrian-blue': 'deep-blues',
    'deep-lyons-blue': 'deep-blues',
    'deep-indigo': 'deep-blues',
    'violet-blue': 'deep-blues',
    'slate-color': 'deep-blues',

    // --- purple / Lilacs (pale pastel lavenders) ---
    'grayish-lavender---a': 'lilacs',
    'light-mauve': 'lilacs',
    lilac: 'lilacs',
    'grayish-lavender---b': 'lilacs',
    'laelia-pink': 'lilacs',
    'light-brown-drab': 'lilacs',

    // --- purple / Violets (clear, mid-to-bright purples) ---
    violet: 'violets',
    'dull-blue-violet': 'violets',
    'blue-violet': 'violets',
    'aconite-violet': 'violets',
    'eupatorium-purple': 'violets',
    'rosolanc-purple': 'violets',
    'pomegranite-purple': 'violets',

    // --- purple / Plums (dark, saturated eggplant/magenta purples) ---
    'dull-violet-black': 'plums',
    'red-violet': 'plums',
    'dusky-madder-violet': 'plums',
    'violet-red': 'plums',
    'cotinga-purple': 'plums',
    'dark-slate-purple': 'plums',
    'veronia-purple': 'plums',
    'taupe-brown': 'plums',
    'pansy-purple': 'plums',
    'vistoris-lake': 'plums',
    'violet-carmine': 'plums',
    'purple-drab': 'plums',

    // --- brown / Umbers (very dark, near-black browns) ---
    'madder-brown': 'umbers',
    brown: 'umbers',
    'mars-brown-tobacco': 'umbers',
    'pale-raw-umber': 'umbers',
    'vandyke-brown': 'umbers',
    sepia: 'umbers',

    // --- brown / Russets & Siennas (mid reddish-brown earth tones) ---
    "hay's-russet": 'russets',
    'sudan-brown': 'russets',
    'brick-red': 'russets',
    'burnt-sienna': 'russets',
    'vinaceous-tawny': 'russets',
    'cinnamon-rufous': 'russets',
    'orange-rufous': 'russets',
    'raw-sienna': 'russets',
    'ochre-red': 'russets',

    // --- brown / Tans & Ochres (lighter golden-brown neutrals) ---
    maple: 'tans',
    'orange-citrine': 'tans',
    'isabella-color': 'tans',
    khaki: 'tans',
    'yellow-ocher': 'tans',
    'ivory-buff': 'tans',

    // --- gray / Ivories (pale warm/cool near-neutrals) ---
    white: 'ivories',
    ecru: 'ivories',
    'warm-gray': 'ivories',
    'mineral-gray': 'ivories',
    'neutral-gray': 'ivories',

    // --- gray / Slate Grays (dark, desaturated cool neutrals) ---
    black: 'slate-grays',
    'deep-violet-plumbeous': 'slate-grays',
  },
}
