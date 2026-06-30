// Sync the web-ifc WASM into public/vendor/web-ifc/ so the served binary always
// matches the web-ifc JS glue the app actually bundles. A version skew between the
// wasm and the glue is the recurring failure in the IFC-loading area:
//   - LinkError: "function import requires a callable" (wasm newer/older than glue)
// and serving it from a CDN instead produced the other failure:
//   - CompileError: "expected magic word 00 61 73 6d, found 3c 21 44 4f" (the SPA
//     rewrite answered the wasm request with index.html).
// Running this as prebuild/predev makes both impossible: a real, version-matched
// static file is shipped in dist and served before any rewrite.
import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const frontendDir = join(here, '..');
const require = createRequire(join(frontendDir, 'package.json'));

// Resolve web-ifc exactly as web-ifc-three resolves it (its nested copy wins over
// the hoisted one), so the wasm matches the glue that instantiates it at runtime.
let webIfcDir;
try {
  const w3req = createRequire(require.resolve('web-ifc-three/package.json'));
  webIfcDir = dirname(w3req.resolve('web-ifc/package.json'));
} catch {
  webIfcDir = dirname(require.resolve('web-ifc/package.json'));
}

const outDir = join(frontendDir, 'public', 'vendor', 'web-ifc');
mkdirSync(outDir, { recursive: true });

let copied = 0;
for (const f of ['web-ifc.wasm', 'web-ifc-mt.wasm']) {
  const src = join(webIfcDir, f);
  if (existsSync(src)) {
    copyFileSync(src, join(outDir, f));
    copied++;
  }
}
console.log(`[copy-wasm] synced ${copied} wasm file(s) from ${webIfcDir} -> public/vendor/web-ifc/`);
if (copied === 0) {
  console.error('[copy-wasm] WARNING: no wasm found next to web-ifc; the IFC loader will fail to instantiate.');
  process.exitCode = 1;
}
