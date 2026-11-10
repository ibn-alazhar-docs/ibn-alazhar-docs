import path from "node:path";
import type { StorybookConfig } from "@storybook/react-vite";

const srcPath = path.resolve(import.meta.dirname, "../src");

const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: ["@storybook/addon-essentials", "@storybook/addon-interactions", "@storybook/addon-a11y"],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  viteFinal: async (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": srcPath,
    };
    return config;
  },
};

export default config;
