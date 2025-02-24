import { Time } from "@dendronhq/common-all";
import fs from "fs-extra";
import os from "os";
import path from "path";

type Metadata = Partial<{
  /**
   * When was dendron first installed
   */
  firstInstall: number;
  /**
   * When the first workspace was initialized
   */
  firstWsInitialize: number;
}>;

let _singleton: MetadataService | undefined = undefined;

export class MetadataService {
  static instance() {
    if (!_singleton) {
      _singleton = new MetadataService();
    }
    return _singleton;
  }

  static metaFilePath() {
    return path.join(os.homedir(), ".dendron", "meta.json");
  }

  getMeta(): Metadata {
    const metaPath = MetadataService.metaFilePath();
    if (!fs.pathExistsSync(metaPath)) {
      fs.ensureFileSync(metaPath);
      fs.writeJSONSync(metaPath, {});
      return {};
    }
    return fs.readJSONSync(MetadataService.metaFilePath()) as Metadata;
  }

  setMeta(key: keyof Metadata, value: any) {
    const stateFromFile = this.getMeta();
    stateFromFile[key] = value;
    fs.writeJSONSync(MetadataService.metaFilePath(), stateFromFile, {
      spaces: 4,
    });
  }

  setInitialInstall() {
    return this.setMeta("firstInstall", Time.now().second);
  }

  setFirstWsInitialize() {
    return this.setMeta("firstWsInitialize", Time.now().second);
  }
}
