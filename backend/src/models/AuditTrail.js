import mongoose from "mongoose";

const FieldSchema = new mongoose.Schema(
  {
    id: String,
    page: Number,
    type: String,
    xPct: Number,
    yPct: Number,
    wPct: Number,
    hPct: Number,
  },
  { _id: false }
);

const AuditTrailSchema = new mongoose.Schema(
  {
    pdfId: { type: String, index: true, required: true },
    originalHash: { type: String, required: true },
    finalHash: { type: String, required: true },
    signedUrl: { type: String, required: true },
    fields: { type: [FieldSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model("AuditTrail", AuditTrailSchema);
