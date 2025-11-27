// Augment NodeJS.ProcessEnv to add API_KEY support without shadowing the global process object.
// This resolves the "cwd not found" error in vite.config.ts and "redeclare" error in this file.

declare namespace NodeJS {
  interface ProcessEnv {
    API_KEY: string;
    [key: string]: any;
  }
}
