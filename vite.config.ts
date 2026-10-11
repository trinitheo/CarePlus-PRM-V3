import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(({ command, mode }) => {
  return {
    build: {
      target: 'es2022',
    },
    plugins: [
      react(),
      tailwindcss(),
      // In production builds, stub files under src/dev/, plus exactly src/services/mock.ts and src/services/seed.ts
      {
        name: 'exclude-dev-in-production',
        enforce: 'pre',
        async resolveId(source, importer, options) {
          if (mode !== 'production') return null;

          const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
          if (!resolved || resolved.external) return null;

          const normalizedPath = path.resolve(resolved.id.split('?')[0]);

          // Nothing inside node_modules should ever match
          if (normalizedPath.includes('/node_modules/')) return null;

          const devDir = path.resolve(__dirname, 'src/dev');
          const mockFileTs = path.resolve(__dirname, 'src/services/mock.ts');
          const mockFileJs = path.resolve(__dirname, 'src/services/mock.js');
          const seedFileTs = path.resolve(__dirname, 'src/services/seed.ts');
          const seedFileJs = path.resolve(__dirname, 'src/services/seed.js');

          if (normalizedPath.startsWith(devDir + path.sep) || normalizedPath === devDir) {
            return '\0virtual:empty-dev';
          }
          if (normalizedPath === mockFileTs || normalizedPath === mockFileJs) {
            return '\0virtual:empty-mock';
          }
          if (normalizedPath === seedFileTs || normalizedPath === seedFileJs) {
            return '\0virtual:empty-seed';
          }

          return null;
        },
        load(id) {
          if (id === '\0virtual:empty-dev') {
            return `
export const DevUserSwitcher = () => {
  throw new Error("DevUserSwitcher cannot be rendered in production");
};
export const RulesMatrix = () => {
  throw new Error("RulesMatrix cannot be rendered in production");
};
export const RULES_MATRIX_DATA = new Proxy([], {
  get() {
    throw new Error("RULES_MATRIX_DATA cannot be accessed in production");
  }
});
export default () => {
  throw new Error("Dev component cannot be rendered in production");
};
`;
          }
          if (id === '\0virtual:empty-mock') {
            return `
export class MockDataService {
  reset() {
    throw new Error("MockDataService.reset cannot be called in production");
  }
  async getStaffPatients() {
    throw new Error("MockDataService.getStaffPatients cannot be called in production");
  }
  async getPatient() {
    throw new Error("MockDataService.getPatient cannot be called in production");
  }
  async getUser() {
    throw new Error("MockDataService.getUser cannot be called in production");
  }
}
export class MockSessionService {
  getCurrentUser() {
    throw new Error("MockSessionService.getCurrentUser cannot be called in production");
  }
  subscribe() {
    throw new Error("MockSessionService.subscribe cannot be called in production");
  }
  signInAs() {
    throw new Error("MockSessionService.signInAs cannot be called in production");
  }
}
`;
          }
          if (id === '\0virtual:empty-seed') {
            return `
export const CANONICAL_SEED = new Proxy({}, {
  get(target, prop) {
    throw new Error(\`CANONICAL_SEED.\${String(prop)} cannot be accessed in production\`);
  }
});
`;
          }
          return null;
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
