/* eslint-disable import/no-import-module-exports */
import Vue from '@vitejs/plugin-vue2';
import path from 'path';
import Components from 'unplugin-vue-components/vite';
import {VuetifyResolver} from 'unplugin-vue-components/resolvers';
import {defineConfig, loadEnv} from 'vite';

// https://vitejs.dev/config/

export default defineConfig(({mode}) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [
      Vue(),
      Components({
        resolvers: [
          componentName => {
            if (componentName.startsWith('VJsf'))
              // do not know the UI lib naming rule
              return {name: componentName, as: componentName, from: '@koumoul/vjsf'};
          },
          VuetifyResolver(),
        ],
      }),
    ],
    resolve: {
      alias: [
        {
          find: '@/',
          replacement: `${path.resolve(__dirname, './src')}/`,
        },
        {
          find: 'src/',
          replacement: `${path.resolve(__dirname, './src')}/`,
        },
      ],
      extensions: ['.vue', '.js'],
    },
    build: {
      sourcemap: false,
      target: 'es2021',
      cssTarget: 'chrome80',
      chunkSizeWarningLimit: 500,
    },
    server: {
      host: '0.0.0.0',
      port: 1024,
      proxy: {
        '/geoserver': {
          target: env.GEOSERVER_BASEURL,
          changeOrigin: true,
        },
        '/api': {
          target: env.API_URL,
          changeOrigin: true,
        },
      },
    },
  };
});
