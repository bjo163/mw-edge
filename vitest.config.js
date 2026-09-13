import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin'
import { defineConfig } from 'vitest/config'

const root = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(async () => {
  const migrations = await readD1Migrations(path.join(root, 'migrations'))

  return {
    plugins: [
      cloudflareTest({
        wrangler: {
          configPath: './wrangler.test.jsonc'
        },
        miniflare: {
          bindings: {
            TEST_MIGRATIONS: migrations
          }
        }
      })
    ],
    test: {
      include: ['test/integration/**/*.test.js'],
      setupFiles: ['./test/integration/apply-migrations.js']
    }
  }
})
