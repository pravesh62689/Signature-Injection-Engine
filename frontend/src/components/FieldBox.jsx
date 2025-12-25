import React, { useMemo, useState } from "react";
import { Rnd } from "react-rnd";

function clamp01(n) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function cleanText(v) {
  return String(v ?? "").trim();
}

export default function FieldBox({
  field,
  pageRect,
  selected,
  onSelect,
  onDelete,
  onChange,
  onEditSignature,
  onEditImage,
}) {
  const [editing, setEditing] = useState(false);

  const px = useMemo(() => {
    const x = (field.xPct || 0) * pageRect.width;
    const y = (field.yPct || 0) * pageRect.height;
    const w = (field.wPct || 0.2) * pageRect.width;
    const h = (field.hPct || 0.08) * pageRect.height;
    return { x, y, w, h };
  }, [
    field.xPct,
    field.yPct,
    field.wPct,
    field.hPct,
    pageRect.width,
    pageRect.height,
  ]);

  function commitFromPx({ x, y, w, h }) {
    const xPct = clamp01(x / pageRect.width);
    const yPct = clamp01(y / pageRect.height);
    const wPct = clamp01(w / pageRect.width);
    const hPct = clamp01(h / pageRect.height);

    onChange({
      xPct: +xPct.toFixed(6),
      yPct: +yPct.toFixed(6),
      wPct: +wPct.toFixed(6),
      hPct: +hPct.toFixed(6),
    });
  }

  function onRightClick(e) {
    e.preventDefault();
    onDelete();
  }

  const type = field.type;

  let valueText = "";
  if (type === "text") valueText = cleanText(field.value);
  if (type === "date") valueText = field.value || "";

  const isRadioChecked =
    type === "radio"
      ? typeof field.value === "boolean"
        ? field.value
        : !!(field.value && field.value.checked)
      : false;

  const showAsFilled =
    (type === "text" && !!valueText) ||
    (type === "date" && !!valueText) ||
    isRadioChecked;

  const canEditBox = true;

  function startEditIfNeeded() {
    if (type === "text" || type === "date") setEditing(true);
  }

  return (
    <Rnd
      bounds="parent"
      size={{ width: px.w, height: px.h }}
      position={{ x: px.x, y: px.y }}
      disableDragging={!canEditBox}
      enableResizing={
        canEditBox
          ? {
              top: true,
              right: true,
              bottom: true,
              left: true,
              topRight: true,
              bottomRight: true,
              bottomLeft: true,
              topLeft: true,
            }
          : false
      }
      onMouseDown={() => {
        onSelect();
        startEditIfNeeded();
      }}
      onTouchStart={() => {
        onSelect();
        startEditIfNeeded();
      }}
      onContextMenu={onRightClick}
      onDragStart={canEditBox ? onSelect : undefined}
      onDragStop={(e, d) => {
        if (!canEditBox) return;
        commitFromPx({ x: d.x, y: d.y, w: px.w, h: px.h });
      }}
      onResizeStop={(e, dir, ref, delta, pos) => {
        if (!canEditBox) return;
        commitFromPx({
          x: pos.x,
          y: pos.y,
          w: ref.offsetWidth,
          h: ref.offsetHeight,
        });
      }}
      style={{ zIndex: selected ? 10 : 5 }}
      cancel="input, textarea, button, select, label"
      minWidth={40}
      minHeight={28}
    >
      <div className={`fieldBox real ${selected ? "selected" : ""}`}>
        {selected && canEditBox ? (
          <button
            className="fieldDelete"
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            title="Delete field"
          >
            ×
          </button>
        ) : null}

        <div className="fieldInner">
          {type === "text" ? (
            editing || (selected && !valueText) ? (
              <input
                className="fieldInput real"
                placeholder="Enter text"
                value={field.value || ""}
                autoFocus
                onBlur={() => setEditing(false)}
                onChange={(e) => onChange({ value: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.currentTarget.blur();
                    setEditing(false);
                  }
                  if (e.key === "Escape") setEditing(false);
                }}
              />
            ) : (
              <div className={`fieldPrint ${showAsFilled ? "filled" : ""}`}>
                {valueText || <span className="ghost">Text</span>}
              </div>
            )
          ) : type === "date" ? (
            editing || (selected && !valueText) ? (
              <input
                className="fieldInput real"
                type="date"
                value={field.value || ""}
                autoFocus
                onBlur={() => setEditing(false)}
                onChange={(e) => onChange({ value: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setEditing(false);
                }}
              />
            ) : (
              <div className={`fieldPrint ${showAsFilled ? "filled" : ""}`}>
                {valueText || <span className="ghost">Date</span>}
              </div>
            )
          ) : type === "radio" ? (
            <div
              className="radioReal"
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
            >
              <input
                type="radio"
                name={`radio_${field.id}`}
                checked={isRadioChecked}
                onChange={(e) => {
                  const checked = e.target.checked;
                  const label =
                    typeof field.value === "object" &&
                    field.value &&
                    field.value.label
                      ? field.value.label
                      : "";
                  onChange({ value: { checked, label } });
                }}
              />

              <input
                type="text"
                className="radioTextInput"
                placeholder="Type option..."
                value={
                  typeof field.value === "object" &&
                  field.value &&
                  field.value.label
                    ? field.value.label
                    : ""
                }
                onChange={(e) => {
                  const label = e.target.value;
                  const checked =
                    typeof field.value === "boolean"
                      ? field.value
                      : !!(field.value && field.value.checked);
                  onChange({ value: { checked, label } });
                }}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          ) : type === "signature" ? (
            field.value ? (
              <img
                className="mediaInBox real"
                src={field.value}
                alt="signature"
              />
            ) : (
              <button
                className="ghostBtn"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditSignature();
                }}
              >
                Sign
              </button>
            )
          ) : type === "image" ? (
            field.value ? (
              <img
                className="mediaInBox real"
                src={field.value}
                alt="uploaded"
              />
            ) : (
              <button
                className="ghostBtn"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditImage();
                }}
              >
                Upload
              </button>
            )
          ) : (
            <div className="fieldPrint">
              <span className="ghost">Field</span>
            </div>
          )}
        </div>
      </div>
    </Rnd>
  );
}
