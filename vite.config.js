import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig(({ command }) => {
    return {
        root: 'public',
        publicDir: false,  // Don't copy public/ since it's our root
        // Development: serve from /, Production: /v2/
        base: command === 'serve' ? '/' : '/v2/',
        server: {
            port: 3000,
            strictPort: true,
            open: false
        },
        build: {
            // V2 outputs to public/v2/
            outDir: path.resolve(__dirname, 'public/v2'),
            emptyOutDir: true,
            assetsDir: 'assets',
            sourcemap: true,
            cssCodeSplit: true,
            rollupOptions: {
                input: {
                    v2: 'public/v2.html'
                },
                output: {
                    manualChunks: (id) => {
                        // Force core styles into v2 chunk
                        if (id.includes('src2/styles')) {
                            return 'v2-core-styles';
                        }
                        if (id.includes('maplibre-gl')) {
                            return 'maplibre';
                        }
                        if (id.includes('pmtiles')) {
                            return 'pmtiles';
                        }
                    }
                }
            }
        },
        optimizeDeps: {
            include: ['maplibre-gl', 'pmtiles']
        }
    };
});

