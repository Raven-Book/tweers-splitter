import { invoke } from "@tauri-apps/api/core";
import type { PassageInfo, SplitGroup } from "../types";
import { groupByTag } from "../utils/autoGroup";

interface Props {
  passages: PassageInfo[];
  groups: SplitGroup[];
  filePath: string | null;
  onLoadFile: (path: string) => Promise<void>;
  onSetGroups: (groups: SplitGroup[]) => void;
}

export function Toolbar({
  passages,
  groups,
  filePath,
  onLoadFile,
  onSetGroups,
}: Props) {
  const handleOpen = async () => {
    const path = await invoke<string | null>("pick_file");
    if (path) await onLoadFile(path);
  };

  const handleAutoGroup = () => {
    onSetGroups(groupByTag(passages));
  };

  const validate = (): boolean => {
    if (!filePath) {
      alert("No file loaded.");
      return false;
    }
    const filenames = groups.map((g) => g.filename);
    if (new Set(filenames).size !== filenames.length) {
      alert("Duplicate filenames detected.");
      return false;
    }
    return true;
  };

  const handleExport = async () => {
    if (!validate()) return;

    const dir = await invoke<string | null>("pick_directory");
    if (!dir) return;

    const plan = {
      sourcePath: filePath,
      outputDir: dir,
      groups: groups.map((g) => ({
        filename: g.filename,
        passageNames: g.passageNames,
      })),
    };

    try {
      const result = await invoke<{ filesWritten: number; totalPassages: number }>(
        "execute_split",
        { plan }
      );
      alert(`Done! ${result.filesWritten} files, ${result.totalPassages} passages.`);
    } catch (e) {
      alert(`Export failed: ${e}`);
    }
  };

  const handleExportZip = async () => {
    if (!validate()) return;

    const zipPath = await invoke<string | null>("pick_save_file");
    if (!zipPath) return;

    const plan = {
      sourcePath: filePath,
      zipPath,
      groups: groups.map((g) => ({
        filename: g.filename,
        passageNames: g.passageNames,
      })),
    };

    try {
      const result = await invoke<{ filesWritten: number; totalPassages: number }>(
        "execute_split_zip",
        { plan }
      );
      alert(`Done! ${result.filesWritten} files, ${result.totalPassages} passages.`);
    } catch (e) {
      alert(`Export failed: ${e}`);
    }
  };

  return (
    <div className="toolbar">
      <button className="btn" onClick={handleOpen}>Open File</button>
      <button className="btn" onClick={handleAutoGroup} disabled={passages.length === 0}>
        Auto Group (by Tag)
      </button>
      <button className="btn" onClick={handleExport} disabled={groups.length === 0}>
        Export Files
      </button>
      <button className="btn" onClick={handleExportZip} disabled={groups.length === 0}>
        Export Zip
      </button>
    </div>
  );
}
