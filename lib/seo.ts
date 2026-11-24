export const SITE_NAME = 'CPex';

export const SITE_TITLE =
  'CPex — Browser-Native C++17 DSA Experimentation Playground';

export const SITE_DESCRIPTION =
  'Write, compile, and run real C++17 code in your browser via Clang/LLVM WebAssembly, visualize 10 data structures and 11 algorithms, compare code versions, and push commits directly to GitHub.';

export const SITE_KEYWORDS = [
  'CPex',
  'C++17 online compiler',
  'browser C++ playground',
  'WebAssembly Clang C++',
  'DSA visualizer',
  'data structures and algorithms playground',
  'Monaco C++ IDE',
  'interactive algorithm visualizer',
  'C++ DSA laboratory',
  'GitHub C++ commits',
];

export function getSiteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : '') ||
    'http://localhost:3000';

  return raw.replace(/\/+$/, '');
}

export const SITE_URL = getSiteUrl();
