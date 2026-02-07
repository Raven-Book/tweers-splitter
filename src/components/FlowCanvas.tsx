import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  useOnSelectionChange,
  useReactFlow,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { LockKeyhole, LockKeyholeOpen } from "lucide-react";
import type { PassageInfo, SplitGroup } from "../types";
import { parseLinks } from "../utils/parseLinks";
import { computePositions } from "../utils/autoLayout";

interface Props {
  passages: PassageInfo[];
  groups: SplitGroup[];
  onAssign: (groupId: string, names: string[]) => void;
  onAddGroup: () => string;
  onHighlight: (name: string | null) => void;
}

const COLORS = [
  "#4a90d9", "#e67e22", "#2ecc71", "#e74c3c",
  "#9b59b6", "#1abc9c", "#f39c12", "#3498db",
];

function getGroupColor(groups: SplitGroup[]): Map<string, string> {
  const map = new Map<string, string>();
  groups.forEach((g, i) => {
    const color = COLORS[i % COLORS.length];
    for (const name of g.passageNames) {
      map.set(name, color);
    }
  });
  return map;
}

export function FlowCanvas(props: Props) {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

function FlowCanvasInner({ passages, groups, onAssign, onAddGroup, onHighlight }: Props) {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [draggable, setDraggable] = useState(false);
  const [selBox, setSelBox] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const { screenToFlowPosition } = useReactFlow();
  const links = useMemo(() => parseLinks(passages), [passages]);
  const positions = useMemo(
    () => computePositions(passages, links),
    [passages, links]
  );
  const colorMap = useMemo(() => getGroupColor(groups), [groups]);

  const initialNodes: Node[] = useMemo(
    () =>
      passages.map((p) => {
        const pos = positions.get(p.name) ?? { x: 0, y: 0 };
        const color = colorMap.get(p.name);
        return {
          id: p.name,
          position: pos,
          data: { label: p.name },
          style: {
            width: 100,
            height: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center" as const,
            fontSize: 12,
            wordBreak: "break-word" as const,
            ...(color
              ? { background: color, color: "#fff", borderColor: color }
              : {}),
          },
        };
      }),
    [passages, positions, colorMap]
  );

  const initialEdges: Edge[] = useMemo(
    () =>
      links.map((l) => ({
        id: `${l.source}->${l.target}`,
        source: l.source,
        target: l.target,
        animated: true,
      })),
    [links]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync when passages/groups change
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges]);

  // Track selected node names
  const selectedRef = useRef<string[]>([]);

  useOnSelectionChange({
    onChange: ({ nodes: sel }) => {
      selectedRef.current = sel.map((n) => n.id);
      if (sel.length === 1) {
        onHighlight(sel[0].id);
      }
    },
  });

  const handleAssignFromCanvas = useCallback(
    (groupId: string) => {
      if (selectedRef.current.length > 0) {
        onAssign(groupId, selectedRef.current);
      }
    },
    [onAssign]
  );

  // Right-click drag: start selection box
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 2) return;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    setSelBox({ x1: e.clientX, y1: e.clientY, x2: e.clientX, y2: e.clientY });
    setMenu(null);
  }, []);

  // Document-level mousemove/mouseup for right-click drag selection
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return;
      const start = dragStartRef.current;
      setSelBox({ x1: start.x, y1: start.y, x2: e.clientX, y2: e.clientY });

      // Real-time highlight nodes inside the box
      const tl = screenToFlowPosition({
        x: Math.min(start.x, e.clientX),
        y: Math.min(start.y, e.clientY),
      });
      const br = screenToFlowPosition({
        x: Math.max(start.x, e.clientX),
        y: Math.max(start.y, e.clientY),
      });
      setNodes((nds) =>
        nds.map((n) => {
          const w = n.measured?.width ?? 150;
          const h = n.measured?.height ?? 40;
          const cx = n.position.x + w / 2;
          const cy = n.position.y + h / 2;
          return {
            ...n,
            selected: cx >= tl.x && cx <= br.x && cy >= tl.y && cy <= br.y,
          };
        })
      );
    };

    const handleUp = (e: MouseEvent) => {
      if (e.button !== 2 || !dragStartRef.current) return;
      const start = dragStartRef.current;
      dragStartRef.current = null;

      const dx = Math.abs(e.clientX - start.x);
      const dy = Math.abs(e.clientY - start.y);

      if (dx > 5 || dy > 5) {
        // Convert screen coords to flow coords
        const tl = screenToFlowPosition({
          x: Math.min(start.x, e.clientX),
          y: Math.min(start.y, e.clientY),
        });
        const br = screenToFlowPosition({
          x: Math.max(start.x, e.clientX),
          y: Math.max(start.y, e.clientY),
        });

        // Compute selected from current nodes snapshot
        const currentNodes = nodes;
        const selected = currentNodes
          .filter((n) => {
            const w = n.measured?.width ?? 150;
            const h = n.measured?.height ?? 40;
            const cx = n.position.x + w / 2;
            const cy = n.position.y + h / 2;
            return cx >= tl.x && cx <= br.x && cy >= tl.y && cy <= br.y;
          })
          .map((n) => n.id);

        setNodes((nds) =>
          nds.map((n) => ({
            ...n,
            selected: selected.includes(n.id),
          }))
        );
        selectedRef.current = selected;

        setSelBox(null);
        if (selected.length > 0) {
          setMenu({ x: e.clientX, y: e.clientY });
        }
      } else {
        // Just a right-click (no drag) — show menu if already selected
        setSelBox(null);
        if (selectedRef.current.length > 0) {
          setMenu({ x: e.clientX, y: e.clientY });
        }
      }
    };

    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };
  }, [screenToFlowPosition, setNodes]);

  const closeMenu = useCallback(() => setMenu(null), []);

  const handleNewGroupFromMenu = useCallback(() => {
    const names = [...selectedRef.current];
    const id = onAddGroup();
    // Need a microtask so the group state updates first
    queueMicrotask(() => onAssign(id, names));
    setMenu(null);
  }, [onAddGroup, onAssign]);

  return (
    <div
      className="flow-canvas"
      onMouseDown={handleMouseDown}
      onContextMenu={(e) => e.preventDefault()}
      onClick={menu ? closeMenu : undefined}
    >
      <div className="canvas-assign-bar">
        <button
          className={`btn ${draggable ? "btn-active" : ""}`}
          onClick={() => setDraggable((v) => !v)}
          title={draggable ? "Lock nodes" : "Unlock nodes"}
        >
          {draggable ? <LockKeyholeOpen size={14} /> : <LockKeyhole size={14} />}
        </button>
        {groups.map((g, i) => (
          <button
            key={g.id}
            className="btn-sm canvas-group-btn"
            style={{ color: COLORS[i % COLORS.length] }}
            onClick={() => handleAssignFromCanvas(g.id)}
          >
            {g.filename}
          </button>
        ))}
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        panOnDrag={[0]}
        nodesDraggable={draggable}
        selectionOnDrag={false}
        fitView
      >
        <Background />
        <Controls showInteractive={false} />
      </ReactFlow>

      {selBox && (
        <div
          className="selection-box"
          style={{
            left: Math.min(selBox.x1, selBox.x2),
            top: Math.min(selBox.y1, selBox.y2),
            width: Math.abs(selBox.x2 - selBox.x1),
            height: Math.abs(selBox.y2 - selBox.y1),
          }}
        />
      )}

      {menu && (
        <div
          className="context-menu"
          style={{ left: menu.x, top: menu.y }}
        >
          <div className="context-menu-header">
            {selectedRef.current.length} selected
          </div>
          <button onClick={handleNewGroupFromMenu}>New Group</button>
          {groups.map((g, i) => (
            <button
              key={g.id}
              style={{ color: COLORS[i % COLORS.length] }}
              onClick={() => {
                handleAssignFromCanvas(g.id);
                setMenu(null);
              }}
            >
              {g.filename}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}