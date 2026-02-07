import { useState, useMemo } from "react";
import type { PassageInfo, SplitGroup } from "../types";

interface Props {
  passages: PassageInfo[];
  selectedNames: Set<string>;
  highlightedName: string | null;
  groups: SplitGroup[];
  onToggleSelect: (name: string) => void;
  onHighlight: (name: string | null) => void;
  onAssign: (groupId: string, names: string[]) => void;
  onAddGroup: () => string;
  onClearSelection: () => void;
  onSelectMany: (names: string[]) => void;
}

export function PassageList({
  passages,
  selectedNames,
  highlightedName,
  groups,
  onToggleSelect,
  onHighlight,
  onAssign,
  onAddGroup,
  onClearSelection,
  onSelectMany,
}: Props) {
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string>("");

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const p of passages) {
      if (p.tags) {
        for (const t of p.tags.split(" ")) {
          if (t) set.add(t);
        }
      }
    }
    return Array.from(set).sort();
  }, [passages]);

  const filtered = useMemo(() => {
    return passages.filter((p) => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase()))
        return false;
      if (tagFilter && (!p.tags || !p.tags.split(" ").includes(tagFilter)))
        return false;
      return true;
    });
  }, [passages, search, tagFilter]);

  // Which passages are already assigned to any group
  const assigned = useMemo(() => {
    const set = new Set<string>();
    for (const g of groups) {
      for (const n of g.passageNames) set.add(n);
    }
    return set;
  }, [groups]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aAssigned = assigned.has(a.name) ? 1 : 0;
      const bAssigned = assigned.has(b.name) ? 1 : 0;
      return aAssigned - bAssigned;
    });
  }, [filtered, assigned]);

  const selected = Array.from(selectedNames);

  const unassignedNames = useMemo(
    () => sorted.filter((p) => !assigned.has(p.name)).map((p) => p.name),
    [sorted, assigned]
  );
  const allChecked = unassignedNames.length > 0 && unassignedNames.every((n) => selectedNames.has(n));

  return (
    <div className="passage-list">
      <div className="passage-filters">
        <input
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}>
          <option value="">All tags</option>
          {allTags.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Assign selected to group */}
      {selected.length > 0 && (
        <div className="assign-bar">
          <span>{selected.length} selected</span>
          <select
            defaultValue=""
            onChange={(e) => {
              const val = e.target.value;
              if (val === "__new__") {
                const id = onAddGroup();
                queueMicrotask(() => onAssign(id, selected));
              } else if (val) {
                onAssign(val, selected);
              }
              onClearSelection();
              e.target.value = "";
            }}
          >
            <option value="" disabled>Move to...</option>
            <option value="__new__">New Group</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.filename}</option>
            ))}
          </select>
        </div>
      )}

      <ul className="passage-items">
        <li className="select-all-row">
          <input
            type="checkbox"
            checked={allChecked}
            onChange={() => {
              if (allChecked) {
                onClearSelection();
              } else {
                onSelectMany(unassignedNames);
              }
            }}
          />
          <span className="passage-name">Select All</span>
        </li>
        {sorted.map((p) => (
          <li
            key={p.name}
            className={[
              highlightedName === p.name ? "highlighted" : "",
              assigned.has(p.name) ? "assigned" : "",
            ].join(" ")}
            onClick={() => onHighlight(p.name)}
          >
            <input
              type="checkbox"
              checked={selectedNames.has(p.name)}
              onChange={() => {
                onToggleSelect(p.name);
                onHighlight(p.name);
              }}
              onClick={(e) => e.stopPropagation()}
            />
            <span className="passage-name">{p.name}</span>
            {p.tags && <span className="passage-tags">{p.tags}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
