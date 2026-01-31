import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig(({ command }) => {
    const isProduction = command === 'build';
    
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
            sourcemap: !isProduction, // Disable sourcemap in production
            cssCodeSplit: true,
            minify: 'terser',
            terserOptions: {
                compress: {
                    drop_console: isProduction, // Remove console.log in production
                    drop_debugger: true,
                    pure_funcs: isProduction ? ['console.log', 'console.info', 'console.debug'] : []
                },
                mangle: {
                    safari10: true // iOS 10 compatibility
                }
            },
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
                        // Separate Firebase into its own chunk for lazy loading
                        if (id.includes('firebase')) {
                            return 'firebase';
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

