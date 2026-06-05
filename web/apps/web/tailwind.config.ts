import type { Config } from 'tailwindcss';
import { volyumePreset } from '@volyume/ui/tailwind-preset';

export default {
  presets: [volyumePreset as Partial<Config>],
  content: [
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
} satisfies Config;
