/**
 * Design System - Identité Visuelle & Tokens
 * Palette: Bleu Foncé (#003366) + Jaune Vif (#FFD700)
 */

import { Platform } from 'react-native';

const Palette = {
  // Couleurs principales
  primary: '#1F4F8C',      // Bleu adouci - Headers, navigation, typographie
  accent: '#FFD700',       // Jaune Vif - CTA, statuts, éléments interactifs

  // Variations de la couleur primaire
  primaryLight: '#3D73BD',
  primaryDark: '#173A68',

  // Variations de la couleur accent
  accentLight: '#FFE44D',
  accentDark: '#E6C200',

  // Couleurs de statut
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#4E85DC',

  // Couleurs neutres
  white: '#FFFFFF',
  black: '#000000',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',

  // Couleurs de fond
  background: '#FFFFFF',
  backgroundSecondary: '#F9FAFB',
  backgroundDark: '#111827',

  // Couleurs de texte
  textPrimary: '#1F4F8C',
  textSecondary: '#6B7280',
  textLight: '#9CA3AF',
  textWhite: '#FFFFFF',

  // Couleurs de bordure
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  borderDark: '#D1D5DB',
};

export const Colors = {
  light: {
    text: Palette.primary,
    background: Palette.white,
    tint: Palette.primary,
    icon: Palette.gray400,
    tabIconDefault: Palette.gray400,
    tabIconSelected: Palette.primary,
  },
  dark: {
    text: Palette.white,
    background: Palette.primaryDark,
    tint: Palette.accent,
    icon: Palette.gray400,
    tabIconDefault: Palette.gray400,
    tabIconSelected: Palette.accent,
  },
  ...Palette,
};

// Gradients pour un design moderne et dynamique
export const Gradients = {
  primary: ['#5B8ED6', '#2E62AA'] as const,           // Bleu adouci dégradé
  primaryVertical: ['#3D73BD', '#1F4F8C'] as const,   // Bleu vertical adouci
  accent: ['#FFD700', '#FFA500'] as const,            // Jaune vers Orange
  accentReverse: ['#FFA500', '#FFD700'] as const,     // Orange vers Jaune
  success: ['#10B981', '#059669'] as const,           // Vert
  warm: ['#FF6B6B', '#FF8E53'] as const,              // Rouge-Orange chaud
  cool: ['#4FC3F7', '#29B6F6'] as const,              // Bleu ciel
  sunset: ['#FF6B6B', '#FFD93D', '#6BCB77'] as const, // Sunset multi
  ocean: ['#1F4F8C', '#4C81CA', '#8AB0E8'] as const,  // Océan adouci
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  massive: 48,
};

export const BorderRadius = {
  xs: 4,
  sm: 8,
  md: 16,    // Standard pour les boutons et cartes (Augmenté)
  lg: 24,    // Pour les grandes sections (Augmenté)
  xl: 32,
  xxl: 40,
  xxxl: 48,  // Pour les très grandes sections (header, etc.)
  full: 9999,
};

export const Typography = {
  // Tailles de police
  fontSize: {
    xs: 10,
    sm: 12,
    base: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 28,
    huge: 32,
    massive: 40,
  },

  // Poids de police
  fontWeight: {
    light: '300' as const,
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },

  // Hauteur de ligne
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  },
};

export const Animation = {
  duration: {
    fast: 150,
    normal: 250,
    slow: 350,
  },
  easing: {
    ease: 'ease' as const,
    easeIn: 'ease-in' as const,
    easeOut: 'ease-out' as const,
    easeInOut: 'ease-in-out' as const,
  },
};

// Tokens de composants pour une UX cohérente
export const ComponentTokens = {
  button: {
    height: {
      sm: 36,
      md: 44,
      lg: 52,
    },
    paddingHorizontal: {
      sm: Spacing.md,
      md: Spacing.xl,
      lg: Spacing.xxl,
    },
    borderRadius: BorderRadius.md,
  },
  input: {
    height: 48,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  card: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    borderWidth: 1,
  },
  badge: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
};

// Export du thème complet
export const Theme = {
  colors: Colors,
  spacing: Spacing,
  borderRadius: BorderRadius,
  typography: Typography,
  shadows: Shadows,
  animation: Animation,
  components: ComponentTokens,
};

export type ThemeType = typeof Theme;


export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
