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
        dts: false,
        resolvers: [
          VuetifyResolver(),
          componentName => {
            if (componentName.startsWith('VJsf')) {
              return {name: componentName, as: componentName, from: '@koumoul/vjsf'};
            }
          },
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
    commonjsOptions: {
      esmExternals: true,
    },
    build: {
      target: 'es2021',
      cssTarget: 'chrome80',
      chunkSizeWarningLimit: 3000,
      commonjsOptions: {
        transformMixedEsModules: true
      }
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
