import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

interface Props {
  filePath: string | null;
  passageName: string | null;
}

export function PassagePreview({ filePath, passageName }: Props) {
  const [text, setText] = useState<string>("");

  useEffect(() => {
    if (!filePath || !passageName) {
      setText("");
      return;
    }
    invoke<string>("preview_passage", {
      path: filePath,
      name: passageName,
    }).then(setText, () => setText("Failed to load preview"));
  }, [filePath, passageName]);

  return (
    <div className="passage-preview">
      {text ? (
        <pre>{text}</pre>
      ) : (
        <span className="placeholder">Select a passage to preview</span>
      )}
    </div>
  );
}
