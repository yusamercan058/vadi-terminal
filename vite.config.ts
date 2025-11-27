import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    define: {
      // Direct integration of API Key as requested
      'process.env.API_KEY': JSON.stringify("AIzaSyAIy1YLvAcfKQBxgwOTffKs-25JYlgtREQ"),
      // Polyfill process.env for other libraries that might check it
      'process.env': {}
    }
  }
})