import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const brainRuntimeSource = fileURLToPath(new URL('../../packages/brain-runtime/src/index.ts', import.meta.url));

function fileName(id: string): string {
  return id.split('/').pop() ?? id;
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@aiw/brain-runtime': brainRuntimeSource,
    },
  },
  build: {
    chunkSizeWarningLimit: 650,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('@xyflow')) return 'canvas-runtime';
          if (id.includes('lucide-react')) return 'icons';
          if (id.includes('react-dom') || id.includes('/react/')) return 'react';
          if (id.includes('zustand') || id.includes('immer')) return 'state-runtime';
          if (id.includes('/apps/web/src/store/')) return 'workspace-state';
          if (id.includes('/apps/web/src/lib/')) return 'workspace-foundation';
          if (id.includes('/apps/web/src/components/Shell') || id.includes('/apps/web/src/components/Role') || id.includes('/apps/web/src/components/TaskWorkspaceFrame')) return 'product-shell';
          if (id.includes('/packages/brain-runtime/')) return 'aiw-brain-runtime';
          if (id.includes('/packages/domain/')) {
            const name = fileName(id).toLowerCase();
            if (/(pattern|knowledge|designlibrary|providerproduct|sourceauthority|calibration)/.test(name)) return 'aiw-domain-knowledge';
            if (/(sample|reference|scenario|seed)/.test(name)) return 'aiw-domain-samples';
            if (/(types|schema|project|architecture|collaboration|governance)/.test(name)) return 'aiw-domain-core';
            return 'aiw-domain-support';
          }
          if (id.includes('/packages/engine/')) {
            const name = fileName(id).toLowerCase();
            if (/(synthesis|pattern|knowledge|recommend|intelligence)/.test(name)) return 'aiw-engine-intelligence';
            if (/(portfolio|governance|review|conformance|drift|security)/.test(name)) return 'aiw-engine-assurance';
            return 'aiw-engine-core';
          }
          if (id.includes('/packages/artifacts/')) {
            const name = fileName(id).toLowerCase();
            if (name.includes('accessiblepdf')) return 'aiw-artifacts-pdf';
            if (name.includes('diagram')) return 'aiw-artifacts-diagrams';
            return 'aiw-artifacts-core';
          }
          return undefined;
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:4100',
      '/health': 'http://127.0.0.1:4100',
    },
  },
});
