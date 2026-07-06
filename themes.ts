// App-wide theme presets. The selected theme's palette is written to CSS
// variables (--brand-*) which Tailwind's `blue` scale is remapped to in
// tailwind.config.js, so every existing blue-* utility class follows the theme.

export interface ThemeDefinition {
  id: string;
  name: string;
  description: string;
  palette: Record<string, string>; // shade -> hex
}

export const DEFAULT_THEME_ID = 'default';
const THEME_STORAGE_KEY = 'atp_theme';

export const THEMES: ThemeDefinition[] = [
  {
    id: 'default',
    name: 'Classic Blue',
    description: 'The original AssetTrackPro look',
    palette: {
      '50': '#eff6ff', '100': '#dbeafe', '200': '#bfdbfe', '300': '#93c5fd',
      '400': '#60a5fa', '500': '#3b82f6', '600': '#2563eb', '700': '#1d4ed8',
      '800': '#1e40af', '900': '#1e3a8a', '950': '#172554',
    },
  },
  {
    id: 'emerald',
    name: 'Emerald',
    description: 'Fresh green, calm and focused',
    palette: {
      '50': '#ecfdf5', '100': '#d1fae5', '200': '#a7f3d0', '300': '#6ee7b9',
      '400': '#34d399', '500': '#10b981', '600': '#059669', '700': '#047857',
      '800': '#065f46', '900': '#064e3b', '950': '#022c22',
    },
  },
  {
    id: 'violet',
    name: 'Violet',
    description: 'Bold and modern purple',
    palette: {
      '50': '#f5f3ff', '100': '#ede9fe', '200': '#ddd6fe', '300': '#c4b5fd',
      '400': '#a78bfa', '500': '#8b5cf6', '600': '#7c3aed', '700': '#6d28d9',
      '800': '#5b21b6', '900': '#4c1d95', '950': '#2e1065',
    },
  },
  {
    id: 'rose',
    name: 'Rose',
    description: 'Warm, energetic crimson pink',
    palette: {
      '50': '#fff1f2', '100': '#ffe4e6', '200': '#fecdd3', '300': '#fda4af',
      '400': '#fb7185', '500': '#f43f5e', '600': '#e11d48', '700': '#be123c',
      '800': '#9f1239', '900': '#881337', '950': '#4c0519',
    },
  },
  {
    id: 'amber',
    name: 'Amber',
    description: 'Golden, high-visibility accent',
    palette: {
      '50': '#fffbeb', '100': '#fef3c7', '200': '#fde68a', '300': '#fcd34d',
      '400': '#fbbf24', '500': '#f59e0b', '600': '#d97706', '700': '#b45309',
      '800': '#92400e', '900': '#78350f', '950': '#451a03',
    },
  },
  {
    id: 'teal',
    name: 'Teal',
    description: 'Cool oceanic blue-green',
    palette: {
      '50': '#f0fdfa', '100': '#ccfbf1', '200': '#99f6e4', '300': '#5eead4',
      '400': '#2dd4bf', '500': '#14b8a6', '600': '#0d9488', '700': '#0f766e',
      '800': '#115e59', '900': '#134e4a', '950': '#042f2e',
    },
  },
];

export const getTheme = (id: string | null | undefined): ThemeDefinition =>
  THEMES.find(t => t.id === id) || THEMES[0];

const hexToTriplet = (hex: string): string => {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `${r} ${g} ${b}`;
};

/** Writes the theme's palette onto :root so all blue-* utilities recolor. */
export const applyTheme = (themeId: string | null | undefined, persist = true) => {
  const theme = getTheme(themeId);
  const root = document.documentElement;
  Object.entries(theme.palette).forEach(([shade, hex]) => {
    root.style.setProperty(`--brand-${shade}`, hexToTriplet(hex));
  });
  if (persist) {
    localStorage.setItem(THEME_STORAGE_KEY, theme.id);
  }
};

/** Re-applies the last saved theme from localStorage (pre-render, no flash). */
export const applyCachedTheme = () => {
  applyTheme(localStorage.getItem(THEME_STORAGE_KEY), false);
};
