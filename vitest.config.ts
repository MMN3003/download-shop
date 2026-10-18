import { defineConfig } from 'vitest/config'

// Unit tests only; the flow tests in tests/e2e start a server and run with `pnpm test:e2e`
export default defineConfig({
  test: { exclude: ['**/node_modules/**', 'tests/e2e/**'] },
})
