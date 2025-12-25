import React, { useMemo, useState } from "react";
import Toolbox from "./components/FloatingToolbox";
import PdfEditor from "./components/PdfEditor";
import SignatureModal from "./components/modals/SignatureModal";
import ImageModal from "./components/modals/ImageModal";
import { burnPdf } from "./lib/api";

function readFileBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
      resolve(base64);
    };

    reader.onerror = () => reject(new Error("Failed to read PDF file"));
    reader.readAsDataURL(file);
  });
}

export default function App() {
  const [pdfFile, setPdfFile] = useState(null);

  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);

  const [fields, setFields] = useState([]);
  const [activeId, setActiveId] = useState(null);

  const [sigOpen, setSigOpen] = useState(false);
  const [imgOpen, setImgOpen] = useState(false);
  const [editId, setEditId] = useState(null);

  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");

  const activeField = useMemo(() => {
    if (!editId) return null;
    return fields.find((f) => f.id === editId) || null;
  }, [fields, editId]);

  function setFieldValue(id, value) {
    setFields((list) => list.map((f) => (f.id === id ? { ...f, value } : f)));
  }

  async function exportAndBurn() {
    setToast("");

    if (!pdfFile) {
      setToast("Upload a PDF first.");
      return;
    }

    setBusy(true);

    try {
      const pdfBase64 = await readFileBase64(pdfFile);

      const payload = {
        pdfId: pdfFile.name,
        pdfBase64,
        fields: fields.map((f) => ({
          id: f.id,
          page: f.page || 1,
          type: f.type,
          xPct: Number(f.xPct),
          yPct: Number(f.yPct),
          wPct: Number(f.wPct),
          hPct: Number(f.hPct),
          value: f.value ?? "",
        })),
      };

      const res = await burnPdf(payload);

      if (res && res.url) {
        const a = document.createElement("a");
        a.href = res.url;
        a.download = "signed.pdf";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setToast(" Signed PDF downloaded.");
      } else {
        setToast("Burn complete but no URL returned from backend.");
      }
    } catch (e) {
      setToast((e && e.message) || "Failed to sign PDF");
    } finally {
      setBusy(false);
    }
  }

  function onPickPdf(e) {
    const file = (e.target.files && e.target.files[0]) || null;
    setPdfFile(file);
    setPageNumber(1);
    setFields([]);
    setActiveId(null);
    setToast("");
  }

  return (
    <div className="appShell">
      <div className="topBar">
        <div>
          <div className="brand">Signature Injection Engine</div>
          <div className="muted">
            Upload → Drag fields → Resize → Mobile stays anchored → Burn to PDF
          </div>
        </div>

        <div className="headerActions">
          <label className="uploadBtn">
            <input type="file" accept="application/pdf" onChange={onPickPdf} />
            {pdfFile ? "Change PDF" : "Upload PDF"}
          </label>

          <button
            className="primaryBtn"
            onClick={exportAndBurn}
            disabled={busy || !pdfFile}
            title="Burn fields into PDF and download"
          >
            {busy ? "Signing…" : "Apply & Download Signed PDF"}
          </button>
        </div>
      </div>

      {toast ? <div className="toast">{toast}</div> : null}

      <div className="layout">
        <Toolbox />

        <div className="main">
          <PdfEditor
            pdfFile={pdfFile}
            pageNumber={pageNumber}
            setPageNumber={setPageNumber}
            numPages={numPages}
            setNumPages={setNumPages}
            fields={fields}
            setFields={setFields}
            activeId={activeId}
            setActiveId={setActiveId}
            onEditSignature={(id) => {
              setEditId(id);
              setSigOpen(true);
            }}
            onEditImage={(id) => {
              setEditId(id);
              setImgOpen(true);
            }}
          />
        </div>
      </div>

      {sigOpen ? (
        <SignatureModal
          initialDataUrl={(activeField && activeField.value) || ""}
          onClose={() => setSigOpen(false)}
          onSave={(dataUrl) => {
            if (editId) setFieldValue(editId, dataUrl);
            setSigOpen(false);
          }}
        />
      ) : null}

      {imgOpen ? (
        <ImageModal
          initialDataUrl={(activeField && activeField.value) || ""}
          onClose={() => setImgOpen(false)}
          onSave={(dataUrl) => {
            if (editId) setFieldValue(editId, dataUrl);
            setImgOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}
