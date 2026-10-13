/**
 * A MapLibre háttérszála modul-worker, amelyet a Turbopack nem csomagol be. A csomag dist-mappájából
 * statikus fájlként kiszolgáljuk (public/maplibre), a térkép pedig a setWorkerUrl()-lel erre mutat.
 * Fut a `dev` és a `build` előtt; a másolatok nem kerülnek gitbe.
 */
import { copyFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const source = path.join(process.cwd(), "node_modules", "maplibre-gl", "dist");
const target = path.join(process.cwd(), "public", "maplibre");
mkdirSync(target, { recursive: true });
for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  copyFileSync(path.join(source, file), path.join(target, file));
}
