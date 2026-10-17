export interface Workspace {
  id: string;
  name: string;
}
export interface FileVersion {
  id: string;
  content: string;
  size: number;
  createdAt: string;
}
export interface FileComment {
  id: string;
  text: string;
  createdAt: string;
}
export interface FileNode {
  thumbnail?: { content: string; source: string; width: number; height: number };
  id: string;
  workspaceId: string;
  parentId: string | null;
  name: string;
  kind: "folder" | "file";
  updatedAt: string;
  versions?: FileVersion[];
  comments?: FileComment[];
  content?: string;
  sourceUrl?: string;
  mimeType?: string;
  size?: number;
}
export interface MessageTool {
  startedAt?: number;
  endedAt?: number;
  media?: import("./mediaAnalysis").MediaAnalysis;
  research?: import("./researchWidget").ResearchWidget;
  widget?: import("./audienceWidget").AudienceWidget;
  results?: import("./similarResults").SimilarResult[];
  id: string;
  name: string;
  error?: string;
  state: "running" | "done" | "failed" | "stopped";
}
export type MessageBlock =
  | { id: string; kind: "text"; text: string }
  | { id: string; kind: "tool"; tool: MessageTool };
export interface Message {
  references?: { id: string; name: string; kind: "file" | "folder"; workspaceId: string }[];
  role?: "user" | "assistant";
  status?: "streaming" | "complete" | "stopped" | "failed";
  error?: string;
  waiting?: boolean;
  tools?: MessageTool[];
  blocks?: MessageBlock[];
  replyToId?: string;
  id: string;
  text: string;
  createdAt: string;
  referenceId?: string;
  referenceName?: string;
  referenceKind?: "file" | "folder";
}
export type ChatChannel = "chat" | "locations" | "similar" | "performance" | "compare" | "fit";
export interface Conversation {
  mapScene?: import("./mapScene").MapScene;
  locationInterest?: import("./locationInterest").LocationInterest;
  channel?: ChatChannel;
  scope?: "workspace";
  threadDrafts?: Record<string, string>;
  id: string;
  workspaceId: string;
  title: string;
  messages: Message[];
  draft: string;
}
export interface ActivityEntry {
  id: string;
  name: string;
  action: "Create" | "Delete" | "Move" | "Rename" | "Write";
  workspace: string;
  createdAt: string;
  bytes: number;
}
export interface RoomData {
  activity?: ActivityEntry[];
  version: 1;
  workspaces: Workspace[];
  nodes: FileNode[];
  conversations: Conversation[];
}
export interface Location {
  workspaceId: string | null;
  folderId: string | null;
}
export type ViewMode = "grid" | "list" | "columns";
export type NameAction =
  | { kind: "workspace" }
  | { kind: "folder"; workspaceId: string; parentId: string | null }
  | { kind: "file"; workspaceId: string; parentId: string | null }
  | {
      kind: "rename";
      target: "workspace" | "node" | "conversation";
      id: string;
      name: string;
    };
