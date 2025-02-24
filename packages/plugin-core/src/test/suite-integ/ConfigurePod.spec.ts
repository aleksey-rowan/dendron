import { DirResult, tmpDir, writeYAML } from "@dendronhq/common-server";
import { NodeTestPresetsV2 } from "@dendronhq/common-test-utils";
import {
  JSONExportPod,
  podClassEntryToPodItemV4,
  PodUtils,
} from "@dendronhq/pods-core";
import { ensureDirSync } from "fs-extra";
import path from "path";
// // You can import and use all API from the 'vscode' module
// // as well as import your extension to test it
import * as vscode from "vscode";
import { ConfigurePodCommand } from "../../commands/ConfigurePodCommand";
import { VSCodeUtils } from "../../utils";
import { onWSInit, setupDendronWorkspace } from "../testUtils";
import { expect } from "../testUtilsv2";
import { setupBeforeAfter } from "../testUtilsV3";

suite("ConfigurePod", function () {
  let root: DirResult;
  let ctx: vscode.ExtensionContext;
  let vaultDir: string;
  let podsDir: string;

  ctx = setupBeforeAfter(this, {
    beforeHook: () => {
      root = tmpDir();
      podsDir = path.join(root.name, "pods");
    },
  });

  test("no config", function (done) {
    onWSInit(async () => {
      const cmd = new ConfigurePodCommand();
      const podChoice = podClassEntryToPodItemV4(JSONExportPod);
      cmd.gatherInputs = async () => {
        return { podClass: podChoice.podClass };
      };
      await cmd.run();
      const activePath = VSCodeUtils.getActiveTextEditor()?.document.uri.fsPath;
      expect(
        activePath?.endsWith("pods/dendron.json/config.export.yml")
      ).toBeTruthy();
      done();
    });

    setupDendronWorkspace(root.name, ctx, {
      lsp: true,
      useCb: async (_vaultDir) => {
        vaultDir = _vaultDir;
        await NodeTestPresetsV2.createOneNoteOneSchemaPresetWithBody({
          vaultDir,
        });
      },
    });
  });

  test("config present", function (done) {
    onWSInit(async () => {
      const cmd = new ConfigurePodCommand();
      const podChoice = podClassEntryToPodItemV4(JSONExportPod);
      const podClass = podChoice.podClass;
      cmd.gatherInputs = async () => {
        return { podClass };
      };

      // setup
      const configPath = PodUtils.getConfigPath({ podsDir, podClass });
      const exportDest = path.join(
        PodUtils.getPath({ podsDir, podClass }),
        "export.json"
      );
      ensureDirSync(path.dirname(configPath));

      writeYAML(configPath, { dest: exportDest });
      await cmd.run();
      const activePath = VSCodeUtils.getActiveTextEditor()?.document.uri.fsPath;
      expect(
        activePath?.endsWith("pods/dendron.json/config.export.yml")
      ).toBeTruthy();
      done();
    });

    setupDendronWorkspace(root.name, ctx, {
      lsp: true,
      useCb: async (_vaultDir) => {
        vaultDir = _vaultDir;
        await NodeTestPresetsV2.createOneNoteOneSchemaPresetWithBody({
          vaultDir,
        });
      },
    });
  });
});
