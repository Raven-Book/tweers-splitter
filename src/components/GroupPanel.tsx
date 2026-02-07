import type { SplitGroup } from "../types";
import { GroupCard } from "./GroupCard";

interface Props {
  groups: SplitGroup[];
  onRename: (id: string, filename: string) => void;
  onRemoveGroup: (id: string) => void;
  onUnassign: (groupId: string, name: string) => void;
  onAddGroup: () => void;
}

export function GroupPanel({
  groups,
  onRename,
  onRemoveGroup,
  onUnassign,
  onAddGroup,
}: Props) {
  return (
    <div className="group-panel">
      <div className="group-list">
        {groups.map((g) => (
          <GroupCard
            key={g.id}
            id={g.id}
            filename={g.filename}
            passageNames={g.passageNames}
            onRename={onRename}
            onRemoveGroup={onRemoveGroup}
            onUnassign={onUnassign}
          />
        ))}
      </div>
      <button className="btn" onClick={onAddGroup}>
        + New Group
      </button>
    </div>
  );
}
