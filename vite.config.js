import { defineConfig } from 'vite';

export default defineConfig({
    root: '.',
    publicDir: 'public',
    server: {
        port: 3000,
        open: true
    },
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        sourcemap: true,
        rollupOptions: {
            output: {
                manualChunks: {
                    'maplibre': ['maplibre-gl'],
                    'pmtiles': ['pmtiles'],
                    'turf': ['@turf/turf']
                }
            }
        }
    },
    optimizeDeps: {
        include: ['maplibre-gl', 'pmtiles', '@turf/turf']
    }
});
