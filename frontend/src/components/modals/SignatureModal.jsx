import React, { useEffect, useRef, useState } from "react";

function getPos(e, canvas) {
  const r = canvas.getBoundingClientRect();
  const x = (e.clientX - r.left) * (canvas.width / r.width);
  const y = (e.clientY - r.top) * (canvas.height / r.height);
  return { x, y };
}

function isBlankCanvas(canvas) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return true;

  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] !== 0) return false;
  }
  return true;
}

export default function SignatureModal({ initialDataUrl, onClose, onSave }) {
  const canvasRef = useRef(null);
  const [down, setDown] = useState(false);
  const [hasInk, setHasInk] = useState(Boolean(initialDataUrl));

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;

    const ctx = c.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, c.width, c.height);

    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.strokeStyle = "#111827";

    if (!initialDataUrl) {
      setHasInk(false);
      return;
    }

    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      setHasInk(!isBlankCanvas(c));
    };
    img.src = initialDataUrl;
  }, [initialDataUrl]);

  function clear() {
    const c = canvasRef.current;
    if (!c) return;

    const ctx = c.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, c.width, c.height);
    setHasInk(false);
  }

  function start(e) {
    const c = canvasRef.current;
    if (!c) return;

    if (c.setPointerCapture) c.setPointerCapture(e.pointerId);

    const ctx = c.getContext("2d");
    if (!ctx) return;

    const p = getPos(e, c);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);

    setDown(true);
    setHasInk(true);
  }

  function move(e) {
    if (!down) return;

    const c = canvasRef.current;
    if (!c) return;

    const ctx = c.getContext("2d");
    if (!ctx) return;

    const p = getPos(e, c);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }

  function end() {
    setDown(false);
  }

  function save() {
    const c = canvasRef.current;
    if (!c) return;
    if (isBlankCanvas(c)) return;
    onSave(c.toDataURL("image/png"));
  }

  return (
    <div
      className="modalBack"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal">
        <div className="row">
          <div className="title">Signature</div>
          <button
            className="iconBtn"
            onClick={onClose}
            type="button"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="canvasWrap" aria-label="Signature pad">
          <canvas
            ref={canvasRef}
            width={900}
            height={260}
            style={{ width: "100%", display: "block", touchAction: "none" }}
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={end}
            onPointerLeave={end}
          />
        </div>

        <div className="row" style={{ marginTop: 10 }}>
          <button className="btn2" onClick={clear} type="button">
            Clear
          </button>
          <button
            className="primaryBtn"
            onClick={save}
            disabled={!hasInk}
            type="button"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
