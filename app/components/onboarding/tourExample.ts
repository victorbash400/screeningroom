import type { FileNode } from "../../lib/types";

export const exampleWorkspace = { id: "tour-workspace", name: "Night Signals" };
export const exampleFiles: FileNode[] = [
  { id: "tour-trailer", name: "Trailer.mp4", mimeType: "video/mp4", size: 12_400_000 },
  { id: "tour-brief", name: "Production brief.txt", mimeType: "text/plain", size: 2400 },
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
      { name: "BFI Southbank", category: "Cinema", latitude: 51.5068, longitude: -.115, description: "Film screenings and events on the South Bank. Walkthrough example; no audience ranking has been calculated." },
      { name: "Curzon Soho", category: "Cinema", latitude: 51.5126, longitude: -.1301, description: "A central London cinema. Walkthrough example; inspect real search evidence before choosing a venue." },
      { name: "Prince Charles Cinema", category: "Cinema", latitude: 51.5113, longitude: -.1305, description: "A cinema near Leicester Square. Walkthrough example; availability and audience fit require a real search." },
    ],
  },
};
