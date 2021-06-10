import {
  assertUnreachable,
  DendronError,
  error2PlainObject,
  SeedCommands,
  SeedConfig,
} from "@dendronhq/common-all";
import {
  SeedInitMode,
  SeedRegistry,
  SeedService,
  SeedUtils,
} from "@dendronhq/engine-server";
import _ from "lodash";
import path from "path";
import yargs from "yargs";
import { CLICommand } from "./base";
import {
  setupEngine,
  setupEngineArgs,
  SetupEngineCLIOpts,
  SetupEngineOpts,
} from "./utils";

type CommandCLIOpts = {
  wsRoot: string;
  vault?: string;
  cmd: SeedCommands;
  id?: string;
  // INIT
  mode?: SeedInitMode;
  config?: SeedConfig;
};

type CommandOpts = CommandCLIOpts & SetupEngineOpts & {};

type CommandOutput = Partial<{ error: DendronError; data: any }>;

export { CommandOpts as SeedCLICommandOpts };

export class SeedCLICommand extends CLICommand<CommandOpts, CommandOutput> {
  constructor() {
    super({ name: "seed <cmd> <id>", desc: "seed bank related commands" });
  }

  buildArgs(args: yargs.Argv) {
    super.buildArgs(args);
    setupEngineArgs(args);
    args.positional("cmd", {
      describe: "a command to run",
      choices: Object.values(SeedCommands),
      type: "string",
    });
    args.positional("id", {
      describe: "id of seed",
      type: "string",
    });
    args.option("mode", {
      describe: "what mode to init a seed in",
      type: "string",
      choices: Object.values(SeedInitMode),
    });
  }

  async enrichArgs(args: CommandCLIOpts): Promise<CommandOpts> {
    const engineOpts: SetupEngineCLIOpts = { ...args, init: false };
    const engineArgs = await setupEngine(engineOpts);
    return { ...args, ...engineArgs };
  }

  async execute(opts: CommandOpts) {
    const { cmd, id, wsRoot, config, mode } = opts;
    const registry = SeedRegistry.create();
    const seedService = new SeedService(wsRoot);
    const ctx = "execute";
    this.L.info({ ctx, id });
    try {
      switch (cmd) {
        case SeedCommands.ADD: {
          if (!id) {
            throw new DendronError({ message: "missing arguments" });
          }
          const { error, data } = await registry.add({ id, wsRoot });
          if (error) {
            throw error;
          }
          return { data };
        }
        case SeedCommands.INIT: {
          if (!mode) {
            throw new DendronError({ message: "missing arguments" });
          }

          // TODO: gather config
          const initOpts: {
            name: string;
          } = _.defaults(
            {},
            {
              name: path.basename(process.cwd()),
            }
          );
          const seed = SeedUtils.genDefaultConfig({
            seed: config,
            ...initOpts,
          });
          const resp = await seedService.init({ wsRoot, mode, seed });
          return resp;
        }
        case SeedCommands.INFO: {
          if (!id) {
            throw new DendronError({ message: "missing arguments" });
          }
          const resp = registry.info({ id });
          if (_.isUndefined(resp)) {
            this.print(`${id} is not in seed bank`);
          } else {
            this.print(JSON.stringify(resp, null, 4));
          }
          return { data: resp };
        }
        default:
          assertUnreachable();
      }
    } catch (err) {
      this.L.error(err);
      if (err instanceof DendronError) {
        this.print(["status:", err.status, err.message].join(" "));
      } else {
        this.print("unknown error " + error2PlainObject(err));
      }
      return { error: err };
    } finally {
      if (opts.server.close) {
        opts.server.close();
      }
    }
  }
}
