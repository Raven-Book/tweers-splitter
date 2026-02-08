import { useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { usePassages } from "./hooks/usePassages";
import { useSplitGroups } from "./hooks/useSplitGroups";
import { Toolbar } from "./components/Toolbar";
import { PassageList } from "./components/PassageList";
import { GroupPanel } from "./components/GroupPanel";
import { PassagePreview } from "./components/PassagePreview";
import { FlowCanvas } from "./components/FlowCanvas";
import "./App.css";

type Tab = "split" | "canvas";

function App() {
  const {
    passages,
    selectedNames,
    highlightedName,
    filePath,
    loadFile,
    toggleSelect,
    highlight,
    clearSelection,
    selectMany,
  } = usePassages();

  const {
    groups,
    addGroup,
    removeGroup,
    renameGroup,
    assignPassages,
    unassign,
    setGroups,
  } = useSplitGroups();

  const [tab, setTab] = useState<Tab>("split");
  const loaded = useRef(false);

  const openFile = useCallback(async (path: string) => {
    await loadFile(path);
    setGroups([]);
  }, [loadFile, setGroups]);

  // Load saved state on startup
  useEffect(() => {
    invoke<{ filePath: string | null; groups: import("./types").SplitGroup[] } | null>("load_state")
      .then(async (state) => {
        if (state) {
          if (state.filePath) {
            await loadFile(state.filePath).catch(() => {});
          }
          if (state.groups.length > 0) {
            setGroups(state.groups);
          }
        }
        loaded.current = true;
      })
      .catch(() => {
        loaded.current = true;
      });
  }, []);

  // Auto-save when filePath or groups change
  useEffect(() => {
    if (!loaded.current) return;
    invoke("save_state", {
      state: { filePath, groups },
    }).catch(() => {});
  }, [filePath, groups]);

  return (
    <div className="app">
      <Toolbar
        passages={passages}
        groups={groups}
        filePath={filePath}
        onLoadFile={openFile}
        onSetGroups={setGroups}
      />
      <div className="tab-bar">
        <button
          className={`tab-btn ${tab === "split" ? "active" : ""}`}
          onClick={() => setTab("split")}
        >
          Split
        </button>
        <button
          className={`tab-btn ${tab === "canvas" ? "active" : ""}`}
          onClick={() => setTab("canvas")}
        >
          Canvas
        </button>
      </div>
      {tab === "split" ? (
        <>
          <div className="main-area">
            <PassageList
              passages={passages}
              selectedNames={selectedNames}
              highlightedName={highlightedName}
              groups={groups}
              onToggleSelect={toggleSelect}
              onHighlight={highlight}
              onAssign={assignPassages}
              onAddGroup={addGroup}
              onClearSelection={clearSelection}
              onSelectMany={selectMany}
            />
            <GroupPanel
              groups={groups}
              onRename={renameGroup}
              onRemoveGroup={removeGroup}
              onUnassign={unassign}
              onAddGroup={addGroup}
            />
          </div>
          <PassagePreview filePath={filePath} passageName={highlightedName} />
        </>
      ) : (
        <FlowCanvas
          passages={passages}
          groups={groups}
          onAssign={assignPassages}
          onAddGroup={addGroup}
          onHighlight={highlight}
        />
      )}
    </div>
  );
}

export default App;
