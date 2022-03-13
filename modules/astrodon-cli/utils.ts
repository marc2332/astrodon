import {
  axiod,
  brightGreen,
  copy,
  exists,
  join,
  readerFromStreamReader,
  red,
  yellow,
} from "./deps.ts";
import meta from "../../astrodon.meta.ts";

interface BinaryConfig {
  url: string;
  binName: string;
}

type os = "darwin" | "linux" | "windows";

interface binContext {
  version: string;
  output: string;
  os?: os;
}

interface AcceptedModules {
  init: string;
  build: string;
  upgrade: string;
  run: string;
}

// Logger is an agnostic logger that can be used in any module of the CLI to show messages with different states.

export class Logger {
  constructor(private readonly module: keyof AcceptedModules) {}

  states = {
    success: brightGreen(`✅`),
    error: red(`❌`),
    info: yellow(`🔅`),
  };

  public log = (...args: unknown[]) => {
    console.log(
      `${this.states.success} ${brightGreen(`[astrodon ${this.module}]:`)} ${
        args.join(" ")
      }`,
    );
  };

  public error = (...args: unknown[]) => {
    console.error(
      `${this.states.error} ${red(`[astrodon ${this.module}]:`)} ${
        args.join(" ")
      }`,
    );
  };

  public info = (...args: unknown[]) => {
    console.info(
      `${this.states.info} ${yellow(`[astrodon ${this.module}]:`)} ${
        args.join(" ")
      }`,
    );
  };
}

export const binaryConfigs = (
  version: string,
): Record<string, Partial<BinaryConfig>> => ({
  darwin: {
    url:
      `https://github.com/astrodon/astrodon/releases/download/${version}/astrodon_darwin`,
    binName: "astrodon",
  },
  linux: {
    url:
      `https://github.com/astrodon/astrodon/releases/download/${version}/astrodon_linux`,
    binName: "astrodon",
  },
  windows: {
    url:
      `https://github.com/astrodon/astrodon/releases/download/${version}/astrodon.exe`,
    binName: "astrodon.exe",
  },
});


export const getAstrodonPath = (): string => {
  return join(
    Deno.env.get("APPDATA") || Deno.env.get("HOME") || Deno.cwd(),
    `.${meta.name}`,
  );
};

export const getBinaryPath = async (
  context: binContext,
  logger?: Logger,
): Promise<string> => {
  const { version, output, os } = context;
  const binaryName = binaryConfigs(version)[os || Deno.build.os]
    .binName as string;
  const url = binaryConfigs(version)[os || Deno.build.os].url as string;
  const binaryPath = join(output, version, binaryName);
  if (await exists(binaryPath)) {
    if (logger) logger.log(`binary found at ${binaryPath}`);
    return binaryPath;
  }
  await Deno.mkdir(join(output, version), { recursive: true });
  const response = await fetch(url);
  if (logger) logger.log(`downloading ${url}`);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  const reader = response?.body?.getReader();
  if (!reader) throw new Error("Could not fetch binary");
  if (logger) logger.log(`writing binary to ${binaryPath}`);
  const file = await Deno.open(binaryPath, {
    create: true,
    write: true,
    truncate: true,
  });
  await copy(readerFromStreamReader(reader), file);
  file.close();
  return binaryPath;
};
