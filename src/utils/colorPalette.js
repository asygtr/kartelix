/**
 * Renk adından (Türkçe/İngilizce/marka özel) tam bir sayfa paleti türetir.
 * Her palet: bg, bgDeep, surface, border, accent, accentDeep, text, textMuted, gradient, glow
 */

const COLOR_PALETTES = {
  // ── Pembeler ──────────────────────────────────────────────────────────────
  'powder pink':   { bg: '#fdf2f4', bgDeep: '#f9e0e5', surface: 'rgba(253,242,244,0.92)', border: 'rgba(212,96,122,0.18)', accent: '#c4566e', accentDeep: '#9e3a52', text: '#3d1a22', textMuted: '#8a4f5c', grad: '340deg', glow: 'rgba(196,86,110,0.22)' },
  'pembe':         { bg: '#fdf2f4', bgDeep: '#f9e0e5', surface: 'rgba(253,242,244,0.92)', border: 'rgba(212,96,122,0.18)', accent: '#c4566e', accentDeep: '#9e3a52', text: '#3d1a22', textMuted: '#8a4f5c', grad: '340deg', glow: 'rgba(196,86,110,0.22)' },
  'pink':          { bg: '#fdf2f4', bgDeep: '#f9e0e5', surface: 'rgba(253,242,244,0.92)', border: 'rgba(212,96,122,0.18)', accent: '#c4566e', accentDeep: '#9e3a52', text: '#3d1a22', textMuted: '#8a4f5c', grad: '340deg', glow: 'rgba(196,86,110,0.22)' },
  'rose':          { bg: '#fff0f1', bgDeep: '#ffe0e3', surface: 'rgba(255,240,241,0.92)', border: 'rgba(225,80,100,0.18)', accent: '#c43050', accentDeep: '#9e1835', text: '#3d0f18', textMuted: '#8a3548', grad: '350deg', glow: 'rgba(196,48,80,0.22)' },
  'fuschia':       { bg: '#fdf0fc', bgDeep: '#f9dcf7', surface: 'rgba(253,240,252,0.92)', border: 'rgba(190,50,180,0.18)', accent: '#b030a8', accentDeep: '#8a1882', text: '#380a34', textMuted: '#7a3876', grad: '300deg', glow: 'rgba(176,48,168,0.22)' },

  // ── Kırmızılar ────────────────────────────────────────────────────────────
  'red':           { bg: '#fff0ee', bgDeep: '#ffe0db', surface: 'rgba(255,240,238,0.92)', border: 'rgba(210,50,40,0.18)', accent: '#c42820', accentDeep: '#9e1010', text: '#3d0a08', textMuted: '#8a3832', grad: '5deg', glow: 'rgba(196,40,32,0.22)' },
  'kirmizi':       { bg: '#fff0ee', bgDeep: '#ffe0db', surface: 'rgba(255,240,238,0.92)', border: 'rgba(210,50,40,0.18)', accent: '#c42820', accentDeep: '#9e1010', text: '#3d0a08', textMuted: '#8a3832', grad: '5deg', glow: 'rgba(196,40,32,0.22)' },
  'bordo':         { bg: '#f5eaec', bgDeep: '#edd4d8', surface: 'rgba(245,234,236,0.92)', border: 'rgba(150,30,50,0.18)', accent: '#8c1a30', accentDeep: '#6e0e20', text: '#2e0810', textMuted: '#703040', grad: '355deg', glow: 'rgba(140,26,48,0.22)' },
  'burgundy':      { bg: '#f5eaec', bgDeep: '#edd4d8', surface: 'rgba(245,234,236,0.92)', border: 'rgba(150,30,50,0.18)', accent: '#8c1a30', accentDeep: '#6e0e20', text: '#2e0810', textMuted: '#703040', grad: '355deg', glow: 'rgba(140,26,48,0.22)' },

  // ── Turuncular / Şeftali ──────────────────────────────────────────────────
  'orange':        { bg: '#fff4ed', bgDeep: '#ffe8d6', surface: 'rgba(255,244,237,0.92)', border: 'rgba(220,100,30,0.18)', accent: '#c85c14', accentDeep: '#a04008', text: '#3d1804', textMuted: '#8a5030', grad: '25deg', glow: 'rgba(200,92,20,0.22)' },
  'turuncu':       { bg: '#fff4ed', bgDeep: '#ffe8d6', surface: 'rgba(255,244,237,0.92)', border: 'rgba(220,100,30,0.18)', accent: '#c85c14', accentDeep: '#a04008', text: '#3d1804', textMuted: '#8a5030', grad: '25deg', glow: 'rgba(200,92,20,0.22)' },
  'peach':         { bg: '#fff6f0', bgDeep: '#ffece0', surface: 'rgba(255,246,240,0.92)', border: 'rgba(220,130,80,0.18)', accent: '#c0704a', accentDeep: '#9a5030', text: '#3d1a08', textMuted: '#8a5840', grad: '20deg', glow: 'rgba(192,112,74,0.22)' },
  'seftali':       { bg: '#fff6f0', bgDeep: '#ffece0', surface: 'rgba(255,246,240,0.92)', border: 'rgba(220,130,80,0.18)', accent: '#c0704a', accentDeep: '#9a5030', text: '#3d1a08', textMuted: '#8a5840', grad: '20deg', glow: 'rgba(192,112,74,0.22)' },
  'salmon':        { bg: '#fff3ef', bgDeep: '#ffe6de', surface: 'rgba(255,243,239,0.92)', border: 'rgba(210,110,90,0.18)', accent: '#c06050', accentDeep: '#9a4038', text: '#3d1410', textMuted: '#8a5048', grad: '15deg', glow: 'rgba(192,96,80,0.22)' },

  // ── Sarılar / Altın ───────────────────────────────────────────────────────
  'yellow':        { bg: '#fffbec', bgDeep: '#fff5cc', surface: 'rgba(255,251,236,0.92)', border: 'rgba(200,160,20,0.18)', accent: '#b89010', accentDeep: '#906c00', text: '#362800', textMuted: '#7a6020', grad: '50deg', glow: 'rgba(184,144,16,0.22)' },
  'sari':          { bg: '#fffbec', bgDeep: '#fff5cc', surface: 'rgba(255,251,236,0.92)', border: 'rgba(200,160,20,0.18)', accent: '#b89010', accentDeep: '#906c00', text: '#362800', textMuted: '#7a6020', grad: '50deg', glow: 'rgba(184,144,16,0.22)' },
  'gold':          { bg: '#fdf8ec', bgDeep: '#f8edc8', surface: 'rgba(253,248,236,0.92)', border: 'rgba(190,148,40,0.18)', accent: '#a87c18', accentDeep: '#845e08', text: '#302000', textMuted: '#786020', grad: '45deg', glow: 'rgba(168,124,24,0.22)' },
  'altin':         { bg: '#fdf8ec', bgDeep: '#f8edc8', surface: 'rgba(253,248,236,0.92)', border: 'rgba(190,148,40,0.18)', accent: '#a87c18', accentDeep: '#845e08', text: '#302000', textMuted: '#786020', grad: '45deg', glow: 'rgba(168,124,24,0.22)' },
  'mustard':       { bg: '#fdf6e0', bgDeep: '#f8ecba', surface: 'rgba(253,246,224,0.92)', border: 'rgba(180,140,20,0.18)', accent: '#9c7808', accentDeep: '#7a5c00', text: '#2e2000', textMuted: '#706018', grad: '48deg', glow: 'rgba(156,120,8,0.22)' },
  'hardal':        { bg: '#fdf6e0', bgDeep: '#f8ecba', surface: 'rgba(253,246,224,0.92)', border: 'rgba(180,140,20,0.18)', accent: '#9c7808', accentDeep: '#7a5c00', text: '#2e2000', textMuted: '#706018', grad: '48deg', glow: 'rgba(156,120,8,0.22)' },

  // ── Yeşiller ──────────────────────────────────────────────────────────────
  'green':         { bg: '#eef8f0', bgDeep: '#d8f0dc', surface: 'rgba(238,248,240,0.92)', border: 'rgba(40,140,60,0.18)', accent: '#1e7c38', accentDeep: '#145c28', text: '#0a2410', textMuted: '#3a6844', grad: '145deg', glow: 'rgba(30,124,56,0.22)' },
  'yesil':         { bg: '#eef8f0', bgDeep: '#d8f0dc', surface: 'rgba(238,248,240,0.92)', border: 'rgba(40,140,60,0.18)', accent: '#1e7c38', accentDeep: '#145c28', text: '#0a2410', textMuted: '#3a6844', grad: '145deg', glow: 'rgba(30,124,56,0.22)' },
  'mint':          { bg: '#eefaf6', bgDeep: '#d4f4e8', surface: 'rgba(238,250,246,0.92)', border: 'rgba(30,160,110,0.18)', accent: '#168c68', accentDeep: '#0e6c50', text: '#042418', textMuted: '#286858', grad: '155deg', glow: 'rgba(22,140,104,0.22)' },
  'sage':          { bg: '#f0f5ee', bgDeep: '#dce8d8', surface: 'rgba(240,245,238,0.92)', border: 'rgba(80,120,70,0.18)', accent: '#4a7840', accentDeep: '#365c2e', text: '#101c0e', textMuted: '#4a6444', grad: '140deg', glow: 'rgba(74,120,64,0.22)' },
  'olive':         { bg: '#f2f4e8', bgDeep: '#e2e6c8', surface: 'rgba(242,244,232,0.92)', border: 'rgba(100,110,40,0.18)', accent: '#606c20', accentDeep: '#485010', text: '#181c04', textMuted: '#506028', grad: '80deg', glow: 'rgba(96,108,32,0.22)' },
  'zeytin':        { bg: '#f2f4e8', bgDeep: '#e2e6c8', surface: 'rgba(242,244,232,0.92)', border: 'rgba(100,110,40,0.18)', accent: '#606c20', accentDeep: '#485010', text: '#181c04', textMuted: '#506028', grad: '80deg', glow: 'rgba(96,108,32,0.22)' },
  'emerald':       { bg: '#eaf8f0', bgDeep: '#c8f0dc', surface: 'rgba(234,248,240,0.92)', border: 'rgba(16,148,90,0.18)', accent: '#107858', accentDeep: '#0a5840', text: '#021c10', textMuted: '#286848', grad: '150deg', glow: 'rgba(16,120,88,0.22)' },
  'teal':          { bg: '#eaf6f8', bgDeep: '#c8eef4', surface: 'rgba(234,246,248,0.92)', border: 'rgba(16,130,148,0.18)', accent: '#107888', accentDeep: '#0a5868', text: '#021820', textMuted: '#286878', grad: '185deg', glow: 'rgba(16,120,136,0.22)' },

  // ── Maviler ───────────────────────────────────────────────────────────────
  'blue':          { bg: '#eef2fd', bgDeep: '#d8e4f8', surface: 'rgba(238,242,253,0.92)', border: 'rgba(50,90,200,0.18)', accent: '#2848c0', accentDeep: '#1a309a', text: '#080e2e', textMuted: '#3a4880', grad: '220deg', glow: 'rgba(40,72,192,0.22)' },
  'mavi':          { bg: '#eef2fd', bgDeep: '#d8e4f8', surface: 'rgba(238,242,253,0.92)', border: 'rgba(50,90,200,0.18)', accent: '#2848c0', accentDeep: '#1a309a', text: '#080e2e', textMuted: '#3a4880', grad: '220deg', glow: 'rgba(40,72,192,0.22)' },
  'indigo':        { bg: '#eff0fa', bgDeep: '#dcdff4', surface: 'rgba(239,240,250,0.92)', border: 'rgba(80,90,190,0.18)', accent: '#4850b0', accentDeep: '#30388a', text: '#0c0e28', textMuted: '#484e88', grad: '240deg', glow: 'rgba(72,80,176,0.22)' },
  'sky':           { bg: '#edf7fe', bgDeep: '#d4edfc', surface: 'rgba(237,247,254,0.92)', border: 'rgba(20,130,200,0.18)', accent: '#0e7cb8', accentDeep: '#0a5c90', text: '#021828', textMuted: '#286090', grad: '200deg', glow: 'rgba(14,124,184,0.22)' },
  'navy':          { bg: '#e8ecf4', bgDeep: '#ccd4e8', surface: 'rgba(232,236,244,0.92)', border: 'rgba(20,40,120,0.22)', accent: '#142878', accentDeep: '#0c1c58', text: '#060c1e', textMuted: '#344070', grad: '230deg', glow: 'rgba(20,40,120,0.22)' },
  'lacivert':      { bg: '#e8ecf4', bgDeep: '#ccd4e8', surface: 'rgba(232,236,244,0.92)', border: 'rgba(20,40,120,0.22)', accent: '#142878', accentDeep: '#0c1c58', text: '#060c1e', textMuted: '#344070', grad: '230deg', glow: 'rgba(20,40,120,0.22)' },
  'cobalt':        { bg: '#eaf0fc', bgDeep: '#ccdaf8', surface: 'rgba(234,240,252,0.92)', border: 'rgba(30,70,200,0.18)', accent: '#1840c0', accentDeep: '#102898', text: '#060e2a', textMuted: '#304080', grad: '225deg', glow: 'rgba(24,64,192,0.22)' },

  // ── Morlar ────────────────────────────────────────────────────────────────
  'purple':        { bg: '#f4effe', bgDeep: '#e8ddfb', surface: 'rgba(244,239,254,0.92)', border: 'rgba(130,60,200,0.18)', accent: '#7830c0', accentDeep: '#5a189a', text: '#180830', textMuted: '#683880', grad: '280deg', glow: 'rgba(120,48,192,0.22)' },
  'mor':           { bg: '#f4effe', bgDeep: '#e8ddfb', surface: 'rgba(244,239,254,0.92)', border: 'rgba(130,60,200,0.18)', accent: '#7830c0', accentDeep: '#5a189a', text: '#180830', textMuted: '#683880', grad: '280deg', glow: 'rgba(120,48,192,0.22)' },
  'violet':        { bg: '#f2eefe', bgDeep: '#e4d8fc', surface: 'rgba(242,238,254,0.92)', border: 'rgba(110,60,210,0.18)', accent: '#6630c8', accentDeep: '#4c18a0', text: '#140830', textMuted: '#603878', grad: '270deg', glow: 'rgba(102,48,200,0.22)' },
  'lavender':      { bg: '#f5f2fe', bgDeep: '#ece6fc', surface: 'rgba(245,242,254,0.92)', border: 'rgba(140,110,210,0.15)', accent: '#7860b8', accentDeep: '#5a4490', text: '#18103a', textMuted: '#685888', grad: '260deg', glow: 'rgba(120,96,184,0.18)' },
  'lila':          { bg: '#f5f2fe', bgDeep: '#ece6fc', surface: 'rgba(245,242,254,0.92)', border: 'rgba(140,110,210,0.15)', accent: '#7860b8', accentDeep: '#5a4490', text: '#18103a', textMuted: '#685888', grad: '260deg', glow: 'rgba(120,96,184,0.18)' },

  // ── Kahveler / Toprak ─────────────────────────────────────────────────────
  'brown':         { bg: '#f6f0ea', bgDeep: '#ede0d0', surface: 'rgba(246,240,234,0.92)', border: 'rgba(140,90,40,0.18)', accent: '#8c5428', accentDeep: '#6e3c18', text: '#241408', textMuted: '#786040', grad: '35deg', glow: 'rgba(140,84,40,0.22)' },
  'kahverengi':    { bg: '#f6f0ea', bgDeep: '#ede0d0', surface: 'rgba(246,240,234,0.92)', border: 'rgba(140,90,40,0.18)', accent: '#8c5428', accentDeep: '#6e3c18', text: '#241408', textMuted: '#786040', grad: '35deg', glow: 'rgba(140,84,40,0.22)' },
  'caramel':       { bg: '#fdf4e8', bgDeep: '#f8e8cc', surface: 'rgba(253,244,232,0.92)', border: 'rgba(190,130,50,0.18)', accent: '#a87030', accentDeep: '#845018', text: '#2e1a04', textMuted: '#806040', grad: '30deg', glow: 'rgba(168,112,48,0.22)' },
  'tan':           { bg: '#f8f2e8', bgDeep: '#f0e4cc', surface: 'rgba(248,242,232,0.92)', border: 'rgba(180,148,80,0.15)', accent: '#9a7840', accentDeep: '#785a28', text: '#282008', textMuted: '#786848', grad: '38deg', glow: 'rgba(154,120,64,0.18)' },
  'terra':         { bg: '#f6eeea', bgDeep: '#edddd4', surface: 'rgba(246,238,234,0.92)', border: 'rgba(170,80,50,0.18)', accent: '#9c4830', accentDeep: '#7a3020', text: '#2a100a', textMuted: '#7a5048', grad: '18deg', glow: 'rgba(156,72,48,0.22)' },

  // ── Nötrler ───────────────────────────────────────────────────────────────
  'beige':         { bg: '#f8f4ec', bgDeep: '#f0e8d4', surface: 'rgba(248,244,236,0.92)', border: 'rgba(160,130,80,0.15)', accent: '#8a6c40', accentDeep: '#6c5028', text: '#221a0a', textMuted: '#7a6448', grad: '42deg', glow: 'rgba(138,108,64,0.18)' },
  'bej':           { bg: '#f8f4ec', bgDeep: '#f0e8d4', surface: 'rgba(248,244,236,0.92)', border: 'rgba(160,130,80,0.15)', accent: '#8a6c40', accentDeep: '#6c5028', text: '#221a0a', textMuted: '#7a6448', grad: '42deg', glow: 'rgba(138,108,64,0.18)' },
  'ekru':          { bg: '#faf6ee', bgDeep: '#f4ecd8', surface: 'rgba(250,246,238,0.92)', border: 'rgba(170,145,90,0.15)', accent: '#9a7c50', accentDeep: '#7a5e38', text: '#261e0c', textMuted: '#806858', grad: '44deg', glow: 'rgba(154,124,80,0.18)' },
  'ham':           { bg: '#faf6ee', bgDeep: '#f4ecd8', surface: 'rgba(250,246,238,0.92)', border: 'rgba(170,145,90,0.15)', accent: '#9a7c50', accentDeep: '#7a5e38', text: '#261e0c', textMuted: '#806858', grad: '44deg', glow: 'rgba(154,124,80,0.18)' },
  'cream':         { bg: '#fdfaef', bgDeep: '#f8f0d8', surface: 'rgba(253,250,239,0.92)', border: 'rgba(180,160,100,0.14)', accent: '#a08858', accentDeep: '#806840', text: '#2a2208', textMuted: '#847260', grad: '46deg', glow: 'rgba(160,136,88,0.16)' },
  'krem':          { bg: '#fdfaef', bgDeep: '#f8f0d8', surface: 'rgba(253,250,239,0.92)', border: 'rgba(180,160,100,0.14)', accent: '#a08858', accentDeep: '#806840', text: '#2a2208', textMuted: '#847260', grad: '46deg', glow: 'rgba(160,136,88,0.16)' },
  'white':         { bg: '#f8f8f8', bgDeep: '#f0f0f0', surface: 'rgba(255,255,255,0.95)', border: 'rgba(0,0,0,0.1)', accent: '#444444', accentDeep: '#222222', text: '#111111', textMuted: '#666666', grad: '180deg', glow: 'rgba(0,0,0,0.08)' },
  'beyaz':         { bg: '#f8f8f8', bgDeep: '#f0f0f0', surface: 'rgba(255,255,255,0.95)', border: 'rgba(0,0,0,0.1)', accent: '#444444', accentDeep: '#222222', text: '#111111', textMuted: '#666666', grad: '180deg', glow: 'rgba(0,0,0,0.08)' },

  // ── Gri / Antrasit ────────────────────────────────────────────────────────
  'gray':          { bg: '#f2f3f4', bgDeep: '#e4e6e8', surface: 'rgba(242,243,244,0.92)', border: 'rgba(80,90,100,0.16)', accent: '#485560', accentDeep: '#303c48', text: '#0e1214', textMuted: '#5a6470', grad: '200deg', glow: 'rgba(72,85,96,0.18)' },
  'gri':           { bg: '#f2f3f4', bgDeep: '#e4e6e8', surface: 'rgba(242,243,244,0.92)', border: 'rgba(80,90,100,0.16)', accent: '#485560', accentDeep: '#303c48', text: '#0e1214', textMuted: '#5a6470', grad: '200deg', glow: 'rgba(72,85,96,0.18)' },
  'grey':          { bg: '#f2f3f4', bgDeep: '#e4e6e8', surface: 'rgba(242,243,244,0.92)', border: 'rgba(80,90,100,0.16)', accent: '#485560', accentDeep: '#303c48', text: '#0e1214', textMuted: '#5a6470', grad: '200deg', glow: 'rgba(72,85,96,0.18)' },
  'antrasit':      { bg: '#eaebec', bgDeep: '#d4d6d8', surface: 'rgba(234,235,236,0.92)', border: 'rgba(50,55,65,0.2)', accent: '#323844', accentDeep: '#1e2230', text: '#0a0c10', textMuted: '#48505c', grad: '210deg', glow: 'rgba(50,56,68,0.22)' },
  'anthracite':    { bg: '#eaebec', bgDeep: '#d4d6d8', surface: 'rgba(234,235,236,0.92)', border: 'rgba(50,55,65,0.2)', accent: '#323844', accentDeep: '#1e2230', text: '#0a0c10', textMuted: '#48505c', grad: '210deg', glow: 'rgba(50,56,68,0.22)' },
  'stone':         { bg: '#f0eeec', bgDeep: '#e4e0da', surface: 'rgba(240,238,236,0.92)', border: 'rgba(110,100,88,0.16)', accent: '#706050', accentDeep: '#544838', text: '#1a1612', textMuted: '#6a6058', grad: '195deg', glow: 'rgba(112,96,80,0.18)' },
  'tas':           { bg: '#f0eeec', bgDeep: '#e4e0da', surface: 'rgba(240,238,236,0.92)', border: 'rgba(110,100,88,0.16)', accent: '#706050', accentDeep: '#544838', text: '#1a1612', textMuted: '#6a6058', grad: '195deg', glow: 'rgba(112,96,80,0.18)' },

  // ── Siyah / Koyu Lüks ─────────────────────────────────────────────────────
  'black':         { bg: '#141618', bgDeep: '#0a0c0e', surface: 'rgba(28,30,34,0.96)', border: 'rgba(255,255,255,0.1)', accent: '#c9a96e', accentDeep: '#a8844a', text: '#f4f2ee', textMuted: '#8a8680', grad: '180deg', glow: 'rgba(201,169,110,0.28)' },
  'siyah':         { bg: '#141618', bgDeep: '#0a0c0e', surface: 'rgba(28,30,34,0.96)', border: 'rgba(255,255,255,0.1)', accent: '#c9a96e', accentDeep: '#a8844a', text: '#f4f2ee', textMuted: '#8a8680', grad: '180deg', glow: 'rgba(201,169,110,0.28)' },
  'noir':          { bg: '#141618', bgDeep: '#0a0c0e', surface: 'rgba(28,30,34,0.96)', border: 'rgba(255,255,255,0.1)', accent: '#c9a96e', accentDeep: '#a8844a', text: '#f4f2ee', textMuted: '#8a8680', grad: '180deg', glow: 'rgba(201,169,110,0.28)' },
  'charcoal':      { bg: '#1e2022', bgDeep: '#141618', surface: 'rgba(34,36,40,0.96)', border: 'rgba(255,255,255,0.09)', accent: '#b89870', accentDeep: '#947850', text: '#f0eee8', textMuted: '#808078', grad: '185deg', glow: 'rgba(184,152,112,0.24)' },
};

const DEFAULT_PALETTE = {
  bg: '#f3efe7', bgDeep: '#e8dece', surface: 'rgba(255,253,248,0.92)',
  border: 'rgba(185,121,58,0.18)', accent: '#0f4c4f', accentDeep: '#0a3336',
  text: '#172023', textMuted: '#667178', grad: '135deg',
  glow: 'rgba(15,76,79,0.18)'
};

/**
 * Renk adından anahtar kelime çıkarır.
 * "Powder Pink 203" → "powder pink"
 * "10 INDIGO" → "indigo"
 */
const extractKey = (rawColor) => {
  if (!rawColor) return '';
  return String(rawColor)
    .toLowerCase()
    .replace(/\d+/g, ' ')   // sayıları sil
    .replace(/[^a-zğüşıöçâêîôû\s]/gi, ' ')
    .trim()
    .replace(/\s+/g, ' ');
};

export const resolveColorPalette = (rawColor) => {
  if (!rawColor) return DEFAULT_PALETTE;
  const key = extractKey(rawColor);

  // Tam eşleşme
  if (COLOR_PALETTES[key]) return COLOR_PALETTES[key];

  // Kelime bazlı eşleşme — uzun eşleşmelere öncelik ver
  const words = key.split(' ').filter(Boolean);
  for (let len = words.length; len >= 1; len--) {
    for (let start = 0; start <= words.length - len; start++) {
      const phrase = words.slice(start, start + len).join(' ');
      if (COLOR_PALETTES[phrase]) return COLOR_PALETTES[phrase];
    }
  }

  return DEFAULT_PALETTE;
};

export const isDarkPalette = (palette) => {
  // bg rengi koyu mu? hex'in luminance'ına bak
  const hex = palette.bg.replace('#', '');
  if (hex.length < 6) return false;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.35;
};
