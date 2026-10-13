import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cp, mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

export default defineConfig({
  root: resolve("mobile"),
  publicDir: resolve("public"),
  plugins: [react(), {
    name: "offline-recordings",
    async closeBundle() {
      const source = resolve("mobile/offline-audio");
      const target = resolve("mobile/android/app/src/main/assets/audio/offline");
      const catalog = JSON.parse(await readFile(resolve(source, "catalog.json"), "utf8"));
      await mkdir(target, { recursive: true });
      await cp(resolve(source, "manifest.json"), resolve(target, "manifest.json"));
      for (const { id } of catalog) await cp(resolve(source, `${id}.mp3`), resolve(target, `${id}.mp3`));
      await cp(resolve("third-party-licenses"), resolve("mobile/android/app/src/main/assets/licenses"), { recursive: true });
    },
  }],
  build: { outDir: resolve("mobile/android/app/src/main/assets"), emptyOutDir: true, target: "es2020" },
});
