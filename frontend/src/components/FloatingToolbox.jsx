import React, { useEffect, useMemo, useRef, useState } from "react";

const TOOLS = [
  { type: "text", label: "Text" },
  { type: "signature", label: "Signature" },
  { type: "image", label: "Image" },
  { type: "date", label: "Date" },
  { type: "radio", label: "Radio" },
];

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

export default function FloatingToolbox() {
  const boxRef = useRef(null);
  const dragRef = useRef(false);
  const grabRef = useRef({ dx: 0, dy: 0 });

  const saved = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("toolbox_pos") || "null");
    } catch (e) {
      return null;
    }
  }, []);

  const [pos, setPos] = useState(
    saved || { x: 16, y: 84, dock: "right", collapsed: false }
  );

  function safeSet(next) {
    const el = boxRef.current;
    const w = el ? el.offsetWidth : 280;
    const h = el ? el.offsetHeight : 320;

    const maxX = window.innerWidth - w - 10;
    const maxY = window.innerHeight - h - 10;

    const fixed = {
      ...next,
      x: clamp(next.x, 8, Math.max(8, maxX)),
      y: clamp(next.y, 8, Math.max(8, maxY)),
    };

    setPos(fixed);
    localStorage.setItem("toolbox_pos", JSON.stringify(fixed));
  }

  useEffect(() => {
    function onMove(e) {
      if (!dragRef.current) return;

      if (e.cancelable) e.preventDefault();

      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      safeSet({
        ...pos,
        x: clientX - grabRef.current.dx,
        y: clientY - grabRef.current.dy,
        dock: "free",
      });
    }

    function onUp() {
      dragRef.current = false;
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [pos]);

  useEffect(() => {
    function onResize() {
      safeSet(pos);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [pos]);

  function startDrag(e) {
    const el = boxRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    grabRef.current = {
      dx: clientX - rect.left,
      dy: clientY - rect.top,
    };

    dragRef.current = true;
  }

  function dock(side) {
    const el = boxRef.current;
    const w = el ? el.offsetWidth : 280;

    if (side === "left") {
      safeSet({ ...pos, x: 12, dock: "left" });
      return;
    }

    if (side === "right") {
      safeSet({ ...pos, x: window.innerWidth - w - 12, dock: "right" });
    }
  }

  function resetPos() {
    safeSet({ x: 16, y: 84, dock: "right", collapsed: false });
  }

  let dockClass = "dockFree";
  if (pos.dock === "left") dockClass = "dockLeft";
  if (pos.dock === "right") dockClass = "dockRight";

  return (
    <div
      ref={boxRef}
      className={[
        "floatTools",
        dockClass,
        pos.collapsed ? "isCollapsed" : "",
      ].join(" ")}
      style={{ left: pos.x, top: pos.y }}
    >
      <div
        className="floatToolsHeader"
        onMouseDown={startDrag}
        onTouchStart={startDrag}
        title="Drag me"
      >
        <div className="floatToolsTitle">Fields</div>

        <div className="floatToolsBtns">
          <button
            className="miniBtn"
            onClick={() => setPos((p) => ({ ...p, collapsed: !p.collapsed }))}
            title={pos.collapsed ? "Expand" : "Collapse"}
            type="button"
          >
            {pos.collapsed ? "▢" : "—"}
          </button>

          <button
            className="miniBtn"
            onClick={() => dock("left")}
            type="button"
          >
            ⟵
          </button>

          <button
            className="miniBtn"
            onClick={() => dock("right")}
            type="button"
          >
            ⟶
          </button>

          <button className="miniBtn" onClick={resetPos} type="button">
            ↺
          </button>
        </div>
      </div>

      {pos.collapsed ? null : (
        <>
          <div className="toolGrid">
            {TOOLS.map((t) => (
              <div
                key={t.type}
                className="toolItem"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("toolType", t.type);
                  e.dataTransfer.effectAllowed = "copy";
                }}
                title="Drag onto the PDF"
              >
                {t.label}
              </div>
            ))}
          </div>

          <div className="toolHelp">
            Drag a field onto the PDF → resize → click to fill.
            <br />
            Right-click a field to delete.
          </div>
        </>
      )}
    </div>
  );
}
