import build from '@hono/vite-build/cloudflare-pages'
import devServer from '@hono/vite-dev-server'
import adapter from '@hono/vite-dev-server/cloudflare'
import { defineConfig } from 'vite'

export default defineConfig(({ command }) => ({
  plugins: [
    // minify:true active esbuild (natif Vite/Rollup) pour le Worker SSR bundle
    // → beaucoup plus rapide que terser ET compatible avec le SSR bundle Hono
    build({ minify: true }),
    devServer({
      adapter,
      entry: 'src/index.tsx'
    })
  ],
  build: {
    // minify pour les assets client éventuels (hors Worker)
    minify: 'esbuild',
    chunkSizeWarningLimit: 500,
  }
}))
