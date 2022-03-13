
import { Logger, getAstrodonPath, getBinaryPath } from '../utils.ts';
import meta from '../../../astrodon.meta.ts';

interface RunOptions {
  name: string; // default: "my-astrodon-app"
}

const runLogger = new Logger("run");

export const run = async (_options: RunOptions, path: string) => {
  const astrodonPath = getAstrodonPath();
  const binaryContext = {
    output: astrodonPath,
    version: meta.version,
  }
  const executable = await getBinaryPath(binaryContext, runLogger);
  runLogger.log(`executing ${executable}`);
}

