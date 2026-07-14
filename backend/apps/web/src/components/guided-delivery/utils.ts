export function deliverySlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "architecture";
}

export function downloadDeliveryFile(filename: string, content: string | Uint8Array, type = "text/markdown") {
  let blobPart: string | ArrayBuffer;
  if (typeof content === "string") {
    blobPart = content;
  } else {
    const copy = new Uint8Array(content.byteLength);
    copy.set(content);
    blobPart = copy.buffer;
  }
  const blob = new Blob([blobPart], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
