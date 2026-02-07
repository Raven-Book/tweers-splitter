interface Props {
  id: string;
  filename: string;
  passageNames: string[];
  onRename: (id: string, filename: string) => void;
  onRemoveGroup: (id: string) => void;
  onUnassign: (groupId: string, name: string) => void;
}

export function GroupCard({
  id,
  filename,
  passageNames,
  onRename,
  onRemoveGroup,
  onUnassign,
}: Props) {
  return (
    <div className="group-card">
      <div className="group-header">
        <input
          className="group-filename"
          value={filename}
          onChange={(e) => onRename(id, e.target.value)}
        />
        <button className="btn-sm" onClick={() => onRemoveGroup(id)}>
          ✕
        </button>
      </div>
      <ul className="group-passages">
        {passageNames.map((name) => (
          <li key={name}>
            <span>{name}</span>
            <button
              className="btn-sm"
              onClick={() => onUnassign(id, name)}
            >
              ✕
            </button>
          </li>
        ))}
        {passageNames.length === 0 && (
          <li className="empty">No passages assigned</li>
        )}
      </ul>
    </div>
  );
}
