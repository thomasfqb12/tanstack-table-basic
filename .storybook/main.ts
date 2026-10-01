import type { StorybookConfig } from '@storybook/react-vite'
import type { PluginOption } from 'vite'

/** App-only plugins (router codegen, devtools) are not needed in Storybook. */
const isAppOnlyPlugin = (plugin: PluginOption) =>
  !!plugin &&
  typeof plugin === 'object' &&
  'name' in plugin &&
  /tanstack/i.test(plugin.name)

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs', '@storybook/addon-vitest'],
  framework: '@storybook/react-vite',
  // Reuses vite.config.ts (Tailwind, React Compiler, path aliases).
  viteFinal: (viteConfig) => ({
    ...viteConfig,
    plugins: (viteConfig.plugins ?? [])
      .flat(Infinity as 1)
      .filter((plugin) => !isAppOnlyPlugin(plugin as PluginOption)),
  }),
}

export default config
