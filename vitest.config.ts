import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import viteReact, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin'
import { playwright } from '@vitest/browser-playwright'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: { tsconfigPaths: true },
  // Same React Compiler setup as vite.config.ts: tests run compiled code, so
  // they catch stale values that only exist under the compiler.
  plugins: [
    tailwindcss(),
    viteReact(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
  test: {
    projects: [
      {
        // Logic + React Testing Library tests (`*.test.ts(x)`), in jsdom.
        extends: true,
        test: {
          name: 'unit',
          environment: 'jsdom',
          include: ['src/**/*.test.{ts,tsx}'],
          setupFiles: ['./src/test/setup.ts'],
        },
      },
      {
        // Every story renders and its `play` function passes, in Chromium.
        extends: true,
        plugins: [
          storybookTest({ configDir: path.join(dirname, '.storybook') }),
        ],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
})
