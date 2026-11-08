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
