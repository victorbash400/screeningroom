const prefix = "local-file:";
function database(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined")
    throw new Error("Browser file storage is unavailable.");
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("screeningroom-files", 1);
    request.onupgradeneeded = () =>
      request.result
        .createObjectStore("files", { keyPath: "id" })
        .createIndex("scope", "scope");
    request.onerror = () =>
      reject(new Error("Cannot open browser file storage."));
    request.onblocked = () =>
      reject(new Error("Close other Screeningroom tabs and retry."));
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
  });
}
async function transaction<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("files", mode);
    const request = action(tx.objectStore("files"));
    tx.oncomplete = () => {
      db.close();
      resolve(request.result);
    };
    tx.onabort = tx.onerror = () => {
      db.close();
      reject(
        new Error(
          "Cannot save browser files. Check available storage and retry.",
        ),
      );
    };
  });
}
export const isLocalFile = (content: string) => content.startsWith(prefix);
export async function storeLocalFile(file: File, scope: string) {
  const id = crypto.randomUUID();
  await transaction("readwrite", (store) => store.put({ id, scope, file }));
  return prefix + id;
}
export async function readLocalFile(content: string): Promise<Blob> {
  const value = await transaction("readonly", (store) =>
    store.get(content.slice(prefix.length)),
  );
  if (!value || !(value.file instanceof Blob))
    throw new Error("Local file is unavailable. Import it again.");
  return value.file;
}
export async function removeLocalFiles(contents: string[]) {
  const ids = [
    ...new Set(
      contents
        .filter(isLocalFile)
        .map((content) => content.slice(prefix.length)),
    ),
  ];
  if (!ids.length) return;
  const db = await database();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction("files", "readwrite");
    for (const id of ids) tx.objectStore("files").delete(id);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onabort = tx.onerror = () => {
      db.close();
      reject(new Error("Cannot remove browser file data."));
    };
  });
}
export async function clearLocalFiles(scope: string) {
  const keys = await transaction("readonly", (store) =>
    store.index("scope").getAllKeys(scope),
  );
  await removeLocalFiles(keys.map((key) => prefix + String(key)));
}
