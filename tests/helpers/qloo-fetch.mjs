import { registerHooks } from 'node:module';

registerHooks({ load(url, context, next) {
  if (url.endsWith('/app/server/qloo-fetch.ts')) return {
    format: 'module', source: 'export const qlooFetch = (...args) => globalThis.fetch(...args);', shortCircuit: true,
  };
  return next(url, context);
} });
