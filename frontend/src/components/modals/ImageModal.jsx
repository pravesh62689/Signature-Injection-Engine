import React, { useEffect, useRef, useState } from "react";

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = () => reject(new Error("Failed to read file"));
    r.readAsDataURL(file);
  });
}

export default function ImageModal({ initialDataUrl, onClose, onSave }) {
  const inputRef = useRef(null);
  const lastUrlRef = useRef("");

  const [previewUrl, setPreviewUrl] = useState(initialDataUrl || "");
  const [dataUrl, setDataUrl] = useState(initialDataUrl || "");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    setPreviewUrl(initialDataUrl || "");
    setDataUrl(initialDataUrl || "");
  }, [initialDataUrl]);

  useEffect(() => {
    return () => {
      if (lastUrlRef.current) URL.revokeObjectURL(lastUrlRef.current);
    };
  }, []);

  function pick() {
    if (inputRef.current) inputRef.current.click();
  }

  async function onFile(e) {
    const file = (e.target.files && e.target.files[0]) || null;
    e.target.value = "";
    if (!file) return;

    setErr("");

    if (!file.type.startsWith("image/")) {
      setErr("Please select a valid image.");
      return;
    }

    if (file.size > 6 * 1024 * 1024) {
      setErr("Image too large. Please use < 6MB.");
      return;
    }

    if (lastUrlRef.current) URL.revokeObjectURL(lastUrlRef.current);
    const objUrl = URL.createObjectURL(file);
    lastUrlRef.current = objUrl;
    setPreviewUrl(objUrl);

    setLoading(true);
    try {
      const url = await readAsDataUrl(file);
      setDataUrl(url);
    } catch (e2) {
      setErr((e2 && e2.message) || "Failed to read image");
      setPreviewUrl("");
      setDataUrl("");
    } finally {
      setLoading(false);
    }
  }

  function save() {
    if (!dataUrl || loading) return;
    onSave(dataUrl);
  }

  return (
    <div
      className="modalBack"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal">
        <div className="row">
          <div className="title">Image</div>
          <button className="btn2" onClick={onClose} type="button">
            Close
          </button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={onFile}
        />

        <div className="row" style={{ marginTop: 10 }}>
          <button className="btn2" onClick={pick} type="button">
            Choose file
          </button>
          <button
            className="btn2 primaryGhost"
            onClick={save}
            disabled={!dataUrl || loading}
            type="button"
          >
            {loading ? "Loading…" : "Save"}
          </button>
        </div>

        {err ? (
          <div className="hint" style={{ color: "#fca5a5" }}>
            {err}
          </div>
        ) : null}

        <div className="imgPreview">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="preview"
              style={{ maxHeight: 420, objectFit: "contain" }}
            />
          ) : (
            <div>No image</div>
          )}
        </div>
      </div>
    </div>
  );
}
