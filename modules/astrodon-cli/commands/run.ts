import { Develop } from "../../astrodon-build/mod.ts";
import { IAppConfig } from "../../astrodon/mod.ts";
import { Logger } from "../utils.ts";
import { dirname, resolve } from "../deps.ts";

export interface RunOptions {
  config?: string;
  allowAll?: boolean;
  allowEnv?: string[];
  allowHrtime?: boolean;
  allowNet?: string[];
  allowFFI?: string[];
  allowRead?: string[];
  allowWrite?: string[];
  allowRun?: string[];
  prompt?: boolean;
}

// TODO(marc2332): The default config could inherit some env values such as: user -> author, year -> year
const DEFAULT_CONFIG: IAppConfig = {
  name: "Astrodon",
  id: "Astrodon",
  main: "",
  copyright: "2022",
  version: "0.0.0",
  author: "",
  shortDescription: "",
  longDescription: "",
  homepage: "",
  permissions: {
    allow_hrtime: false,
    prompt: false,
  },
  unstable: false,
  build: {
    output: "",
    icons: [],
    resources: [],
  },
};

const runLogger = new Logger("run");

async function resolveConfiguration(
  options: RunOptions,
  file?: string,
): Promise<IAppConfig | null> {
  // Default Local path config
  let configFile = `file://${resolve(Deno.cwd(), "astrodon.config.ts")}`;

  if (options.config?.startsWith("http")) {
    configFile = options.config;
  } else if (file?.startsWith("http")) {
    // Default HTTP path config
    const fileUrl = new URL(file);
    const { origin, pathname } = fileUrl;
    const remoteDirname = dirname(pathname);
    configFile = `https://${origin}${remoteDirname}/astrodon.config.ts`;

  } else if (options.config) {
    // Custom Local path config
    configFile = `file://${resolve(Deno.cwd(), options.config)}`;
  }

  const configPath = new URL(configFile).href;

  try {
    // Fetch the configuration file
    const { default: projectInfo }: { default: IAppConfig } = await import(
      configPath
    );
    if (file) return {
      ...projectInfo,
      main: file,
    }
    return projectInfo;

  } catch (_e) {
    if (file) {
      // Use the default config if no file is found
      runLogger.warn(
        `Could not find a valid configuration file, using default.`,
      );
      return {
        ...DEFAULT_CONFIG,
        main: file,
      };
    } else {
      // Throw error when neither a config file or a run file are found
      runLogger.error(`Configuration file <astrodon.config.ts> not found.`);
      return null;
    }
  }
}

export async function run(options: RunOptions, file?: string) {
  const config = await resolveConfiguration(options, file);

  if (config != null) {
    // Set to an empty array (true), otherwise set it to false

    const placeAllowAll = options.allowAll ? [] : false;

    // CLI permissions have priority over the config-defined ones

    config.permissions = Object.assign(
      config.permissions || {},
      {
        allow_env: placeAllowAll || !options.allowEnv
          ? config.permissions?.allow_env
          : options.allowEnv,
        allow_net: placeAllowAll || !options.allowNet
          ? config.permissions?.allow_net
          : options.allowNet,
        allow_ffi: placeAllowAll || !options.allowFFI
          ? config.permissions?.allow_ffi
          : options.allowFFI,
        allow_read: placeAllowAll || !options.allowRead
          ? config.permissions?.allow_read
          : options.allowRead,
        allow_run: placeAllowAll || !options.allowRun
          ? config.permissions?.allow_run
          : options.allowRun,
        allow_write: placeAllowAll || !options.allowWrite
          ? config.permissions?.allow_write
          : options.allowWrite,
        prompt: Boolean(options.allowAll) || !options.prompt
          ? Boolean(config.permissions?.prompt)
          : Boolean(options.prompt),
        allow_hrtime: Boolean(options.allowAll) || !options.allowHrtime
          ? Boolean(config.permissions?.allow_hrtime)
          : Boolean(options.allowHrtime),
      },
    );

    const dev = new Develop({
      config,
      logger: runLogger,
    });

    await dev.run();
  }
}
