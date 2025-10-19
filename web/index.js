// pk_load_image_paste v7 - frontend button (unchanged)
import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";

async function readClipboardImage() {
  if (!navigator.clipboard?.read) throw new Error("Clipboard API not available");
  const items = await navigator.clipboard.read();
  for (const item of items) {
    const type = item.types.find(t => t.startsWith("image/"));
    if (type) {
      const blob = await item.getType(type);
      const ext = type.split("/")[1] || "png";
      const fname = `paste_${Date.now()}.${ext}`;
      return { blob, filename: fname };
    }
  }
  throw new Error("No image in clipboard");
}

async function uploadToInput(blob, filename, subfolder = "pasted") {
  const body = new FormData();
  body.append("image", new File([blob], filename, { type: blob.type || "image/png" }));
  body.append("type", "input");
  body.append("subfolder", subfolder);
  body.append("overwrite", "true");
  const resp = await api.fetchApi("/upload/image", { method: "POST", body });
  if (!resp.ok) throw new Error(`Upload failed: ${resp.status}`);
  const data = await resp.json().catch(() => ({}));
  return `${subfolder}/${data?.name || filename}`;
}

function setImageWidget(node, filenameRel) {
  const w = node.widgets?.find(w => w.name === "image");
  if (!w) throw new Error("Widget 'image' not found");
  w.value = filenameRel;
  if (node.onWidgetChanged) { try { node.onWidgetChanged(w, w.value, null, null); } catch {} }
  app.graph.setDirtyCanvas(true, true);
}

function addPasteButton(node) {
  const btn = node.addWidget("button", "Paste from clipboard", null, async () => {
    btn.disabled = true;
    const old = node.title;
    try {
      node.title = "Paste Image (Pasting…)";
      const { blob, filename } = await readClipboardImage();
      const rel = await uploadToInput(blob, filename, "pasted");
      setImageWidget(node, rel);
      console.log("[PKLoadImagePaste] pasted:", rel);
    } catch (e) {
      console.warn("[PKLoadImagePaste] error:", e);
      alert(e.message || String(e));
    } finally {
      node.title = old;
      btn.disabled = false;
      app.graph.setDirtyCanvas(true, true);
    }
  });
  if (btn) btn.serialize = false;
}

app.registerExtension({
  name: "pk.loadImagePaste.button",
  setup() { console.log("[pk_load_image_paste v7] frontend loaded"); },
  nodeCreated(node) { if (node?.comfyClass === "PKLoadImagePaste") addPasteButton(node); }
});
