import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Document, Page, pdfjs } from "react-pdf";
import FieldBox from "./FieldBox";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function makeId() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

export default function PdfEditor({
  pdfFile,
  pageNumber,
  setPageNumber,
  numPages,
  setNumPages,
  fields,
  setFields,
  activeId,
  setActiveId,
  onEditSignature,
  onEditImage,
}) {
  const shellRef = useRef(null);
  const pageWrapRef = useRef(null);

  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });
  const [pageWidth, setPageWidth] = useState(0);
  const [zoom, setZoom] = useState(1);

  const pageFields = useMemo(() => {
    return fields.filter((f) => (f.page || 1) === pageNumber);
  }, [fields, pageNumber]);

  const computeWidths = useCallback(() => {
    const shell = shellRef.current;
    if (!shell) return;

    const rect = shell.getBoundingClientRect();
    const safePadding = 24;
    const w = Math.max(280, Math.floor(rect.width - safePadding));

    const isPhone = window.innerWidth <= 520;
    const max = isPhone ? 420 : 980;
    const finalW = Math.min(w, max);

    setPageWidth((prev) => (prev !== finalW ? finalW : prev));
  }, []);

  const measureWrap = useCallback(() => {
    const el = pageWrapRef.current;
    if (!el) return;

    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return;

    const w = Math.round(r.width);
    const h = Math.round(r.height);

    setPageSize((prev) => {
      if (prev.width === w && prev.height === h) return prev;
      return { width: w, height: h };
    });
  }, []);

  useEffect(() => {
    computeWidths();
    window.addEventListener("resize", computeWidths);
    return () => window.removeEventListener("resize", computeWidths);
  }, [computeWidths]);

  useEffect(() => {
    const el = pageWrapRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => measureWrap());
    ro.observe(el);
    requestAnimationFrame(measureWrap);

    return () => ro.disconnect();
  }, [measureWrap, pageNumber, pageWidth, zoom]);

  function addField(type, clientX, clientY) {
    const el = pageWrapRef.current;
    if (!el || !pageSize.width || !pageSize.height) return;

    const rect = el.getBoundingClientRect();
    const xPx = clientX - rect.left;
    const yPx = clientY - rect.top;

    const sizes = {
      text: { wPct: 0.26, hPct: 0.06 },
      signature: { wPct: 0.28, hPct: 0.09 },
      image: { wPct: 0.28, hPct: 0.16 },
      date: { wPct: 0.22, hPct: 0.06 },
      radio: { wPct: 0.26, hPct: 0.06 },
    };

    const base = sizes[type] || { wPct: 0.24, hPct: 0.08 };

    let xPct = xPx / pageSize.width;
    let yPct = yPx / pageSize.height;

    xPct = clamp(xPct, 0, 1 - base.wPct);
    yPct = clamp(yPct, 0, 1 - base.hPct);

    const newField = {
      id: makeId(),
      page: pageNumber,
      type,
      xPct: +xPct.toFixed(6),
      yPct: +yPct.toFixed(6),
      wPct: +base.wPct.toFixed(6),
      hPct: +base.hPct.toFixed(6),
      value: type === "radio" ? { checked: false, label: "" } : "",
    };

    setFields((list) => [...list, newField]);
    setActiveId(newField.id);
  }

  function onDrop(e) {
    e.preventDefault();
    const type = e.dataTransfer.getData("toolType");
    if (!type) return;
    addField(type, e.clientX, e.clientY);
  }

  function onDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }

  function deleteField(id) {
    setFields((list) => list.filter((f) => f.id !== id));
    if (activeId === id) setActiveId(null);
  }

  function updateField(id, patch) {
    setFields((list) =>
      list.map((f) => (f.id === id ? { ...f, ...patch } : f))
    );
  }

  const canPrev = pageNumber > 1;
  const canNext = numPages ? pageNumber < numPages : false;

  return (
    <div className="editorShell" ref={shellRef}>
      <div className="editorHeader">
        <div>
          <div className="hTitle">PDF Editor</div>
          <div className="muted">
            {pdfFile ? pdfFile.name : "No PDF loaded"}
          </div>
        </div>

        <div className="pager">
          <button
            className="btn2"
            disabled={!canPrev}
            onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
          >
            Prev
          </button>

          <button
            className="btn2"
            disabled={!canNext}
            onClick={() => setPageNumber((p) => p + 1)}
          >
            Next
          </button>

          <div className="muted" style={{ fontWeight: 900 }}>
            Page {pageNumber} / {numPages || "—"}
          </div>

          <div className="zoomBar">
            <button
              className="btn2"
              onClick={() =>
                setZoom((z) => Math.max(0.75, +(z - 0.1).toFixed(2)))
              }
              title="Zoom out"
            >
              −
            </button>

            <div
              className="muted"
              style={{ fontWeight: 900, minWidth: 52, textAlign: "center" }}
            >
              {Math.round(zoom * 100)}%
            </div>

            <button
              className="btn2"
              onClick={() =>
                setZoom((z) => Math.min(1.8, +(z + 0.1).toFixed(2)))
              }
              title="Zoom in"
            >
              +
            </button>
          </div>
        </div>
      </div>

      <div className="pdfArea">
        {!pdfFile ? (
          <div className="uploadPanel">
            <div className="uploadPanelTitle">Upload a PDF to start</div>
            <div className="uploadPanelSub">
              Use the “Upload PDF” button in the top bar.
            </div>
          </div>
        ) : (
          <Document
            file={pdfFile}
            onLoadSuccess={({ numPages: n }) => {
              setNumPages(n);
              if (pageNumber > n) setPageNumber(1);
            }}
            loading={<div className="muted">Loading PDF…</div>}
            error={<div className="muted">Failed to load PDF.</div>}
          >
            <div
              className="pageStage"
              onDrop={onDrop}
              onDragOver={onDragOver}
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) setActiveId(null);
              }}
            >
              <div className="pageWrap" ref={pageWrapRef}>
                <Page
                  key={`${
                    pdfFile ? pdfFile.name : "pdf"
                  }::${pageNumber}::${pageWidth}::${zoom}`}
                  pageNumber={pageNumber}
                  width={Math.floor(pageWidth * zoom)}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  onRenderSuccess={() => requestAnimationFrame(measureWrap)}
                />

                {pageSize.width > 0 && pageSize.height > 0 ? (
                  <div className="overlay">
                    {pageFields.map((f) => (
                      <FieldBox
                        key={f.id}
                        field={f}
                        pageRect={pageSize}
                        selected={activeId === f.id}
                        onSelect={() => setActiveId(f.id)}
                        onDelete={() => deleteField(f.id)}
                        onChange={(patch) => updateField(f.id, patch)}
                        onEditSignature={() => onEditSignature(f.id)}
                        onEditImage={() => onEditImage(f.id)}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </Document>
        )}
      </div>
    </div>
  );
}
