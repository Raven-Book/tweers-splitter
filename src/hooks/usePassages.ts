import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { PassageInfo } from "../types";

export function usePassages() {
  const [passages, setPassages] = useState<PassageInfo[]>([]);
  const [selectedNames, setSelectedNames] = useState<Set<string>>(new Set());
  const [highlightedName, setHighlightedName] = useState<string | null>(null);
  const [filePath, setFilePath] = useState<string | null>(null);

  const loadFile = useCallback(async (path: string) => {
    const list = await invoke<PassageInfo[]>("open_twee", { path });
    setPassages(list);
    setSelectedNames(new Set());
    setHighlightedName(null);
    setFilePath(path);
  }, []);

  const toggleSelect = useCallback((name: string) => {
    setSelectedNames((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const highlight = useCallback((name: string | null) => {
    setHighlightedName(name);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedNames(new Set());
  }, []);

  const selectMany = useCallback((names: string[]) => {
    setSelectedNames(new Set(names));
  }, []);

  return {
    passages,
    selectedNames,
    highlightedName,
    filePath,
    loadFile,
    toggleSelect,
    highlight,
    clearSelection,
    selectMany,
  };
}
