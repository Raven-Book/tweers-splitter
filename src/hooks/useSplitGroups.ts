import { useState, useCallback } from "react";
import type { SplitGroup } from "../types";

let nextId = 1;
function genId() {
  return String(nextId++);
}

function syncNextId(groups: SplitGroup[]) {
  for (const g of groups) {
    const n = parseInt(g.id, 10);
    if (!isNaN(n) && n >= nextId) nextId = n + 1;
  }
}

export function useSplitGroups() {
  const [groups, setGroupsRaw] = useState<SplitGroup[]>([]);

  const setGroups: typeof setGroupsRaw = useCallback((action) => {
    setGroupsRaw((prev) => {
      const next = typeof action === "function" ? action(prev) : action;
      syncNextId(next);
      return next;
    });
  }, []);

  const addGroup = useCallback((): string => {
    const id = genId();
    setGroups((prev) => [
      ...prev,
      { id, filename: `group${id}.twee`, passageNames: [] },
    ]);
    return id;
  }, []);

  const removeGroup = useCallback((id: string) => {
    setGroups((prev) => prev.filter((g) => g.id !== id));
  }, []);

  const renameGroup = useCallback((id: string, filename: string) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === id ? { ...g, filename } : g))
    );
  }, []);

  const assignPassages = useCallback(
    (groupId: string, names: string[]) => {
      setGroups((prev) => {
        // Remove from all groups first
        const cleaned = prev.map((g) => ({
          ...g,
          passageNames: g.passageNames.filter((n) => !names.includes(n)),
        }));
        // Add to target group
        return cleaned.map((g) =>
          g.id === groupId
            ? { ...g, passageNames: [...g.passageNames, ...names] }
            : g
        );
      });
    },
    []
  );

  const unassign = useCallback((groupId: string, name: string) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, passageNames: g.passageNames.filter((n) => n !== name) }
          : g
      )
    );
  }, []);

  return {
    groups,
    addGroup,
    removeGroup,
    renameGroup,
    assignPassages,
    unassign,
    setGroups,
  };
}
