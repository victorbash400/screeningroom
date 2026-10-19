import type { FileNode } from "../../lib/types";

export const exampleWorkspace = { id: "tour-workspace", name: "Night Signals" };
export const exampleFiles: FileNode[] = [
  { id: "tour-trailer", name: "Trailer.mp4", mimeType: "video/mp4", size: 12_400_000 },
  { id: "tour-brief", name: "Production brief.txt", mimeType: "text/plain", size: 2400, content: "Night Signals is a short documentary about independent music. Taste references: Radiohead and Stop Making Sense. Release plan: London screening with a discussion, followed by an online release. Selected materials: trailer, production brief and poster." },
  { id: "tour-poster", name: "Poster.jpg", mimeType: "image/jpeg", size: 820_000 },
].map(file => ({ ...file, kind: "file", workspaceId: exampleWorkspace.id, parentId: null, updatedAt: "2026-10-01T12:00:00Z" }));
export const exampleQuestion = "I’m making a short documentary about independent music. Where could I screen it in London?";
export const exampleLinkedFile: FileNode = { id: "tour-link", name: "Me at the zoo", kind: "file", workspaceId: exampleWorkspace.id, parentId: null, updatedAt: "2026-10-01T12:00:00Z", sourceUrl: "https://youtu.be/jNQXAC9IVRw" };

export const exampleArea = { name: "London", latitude: 51.5072, longitude: -.1276, radius: 5000 };
export const exampleMap = {
  id: "tour-london",
  presentation: {
    threeD: true,
    locations: [
      { name: "BFI Southbank", category: "Cinema", address: "Belvedere Road, London SE1 8XT", website: "https://whatson.bfi.org.uk/Online/article/getting-to-bfi-southbank", latitude: 51.5068, longitude: -.115 },
      { name: "Curzon Soho", category: "Cinema", address: "99 Shaftesbury Avenue, London W1D 5DY", website: "https://www.curzon.com/venues/all-london-cinemas/", latitude: 51.5126, longitude: -.1301 },
      { name: "Prince Charles Cinema", category: "Cinema", address: "7 Leicester Place, London", website: "https://princecharlescinema.com/location/", latitude: 51.5113, longitude: -.1305 },
    ],
  },
};
