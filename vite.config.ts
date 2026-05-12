import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/supabase-file-manager/',
  plugins: [react()],
});
