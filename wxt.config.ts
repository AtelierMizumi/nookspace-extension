import { defineConfig } from 'wxt';
import path from 'path';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: ({ browser }) => ({
    name: 'NookSpace — Personal Productivity Workspace',
    description: 'Your Space. Your Workflow. Notion-inspired customizable personal productivity workspace on New Tab.',
    version: '0.1.0',
    permissions: ['storage', 'alarms', 'notifications'],
    content_security_policy:
      browser === 'firefox'
        ? "script-src 'self'; object-src 'self'; frame-src https://www.youtube-nocookie.com https://www.youtube.com https://open.spotify.com https://w.soundcloud.com;"
        : {
            extension_pages:
              "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'; frame-src https://www.youtube-nocookie.com https://www.youtube.com https://open.spotify.com https://w.soundcloud.com;",
          },
    chrome_url_overrides: {
      newtab: 'entrypoints/newtab/index.html',
    },
    ...(browser === 'firefox'
      ? {
          chrome_settings_overrides: {
            homepage: 'newtab.html',
          },
          browser_specific_settings: {
            gecko: {
              id: 'nookspace@local-dev',
              strict_min_version: '115.0',
            },
          },
        }
      : {}),
  }),
});
