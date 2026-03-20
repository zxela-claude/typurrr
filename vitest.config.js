import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    environment: 'node',
  },
  resolve: {
    alias: {
      'https://esm.sh/@supabase/supabase-js@2': new URL('./tests/__mocks__/supabase-mock.js', import.meta.url).pathname,
    },
  },
});
