"use client";

import { useAccount } from "../../state/AccountContext";
import { isSettingsSurface } from "../../lib/accountTypes";
import SettingsShell from "../account/SettingsShell";
import ImportDialog from "../workspace/ImportDialog";

import { useScreeningroom } from "../../state/useScreeningroom";
import Sidebar from "../navigation/Sidebar";
import WorkspaceHome from "../workspace/WorkspaceHome";
import WorkspaceSurface from "../workspace/WorkspaceSurface";
import WorkspaceToolbar from "../workspace/WorkspaceToolbar";
import ProjectBrowser from "../workspace/ProjectBrowser";
import FileOpenDialog from "../workspace/FileOpenDialog";
import FilePreview from "../workspace/FilePreview";
import ShareReferenceDialog from "../chat/ShareReferenceDialog";
import ChatDrawer from "../chat/ChatDrawer";
import WorkspaceContextMenu from "../workspace/WorkspaceContextMenu";
import FileContextMenu from "../workspace/FileContextMenu";
import FileEditor from "../workspace/FileEditor";
import MoveDialog from "../workspace/MoveDialog";
import NodeNameDialog from "../controls/NodeNameDialog";
import { downloadFile } from "../../lib/fileTypes";
import NameDialog from "../controls/NameDialog";
import DeleteDialog from "../controls/DeleteDialog";
import InvalidLocation from "./InvalidLocation";
import ErrorNotice from "./ErrorNotice";
import styles from "./Screeningroom.module.css";

export default function RoomApplication() {
  const app = useScreeningroom();
  const account = useAccount();
  const settings = isSettingsSurface(account.surface);
  const {
    room,
    navigation,
    workspace,
    path,
    nodes,
    children,
    chat,
    nameAction,
    deleting,
  } = app;
  const conversation = chat.conversation;
  return (
    <div className={styles.app}>
      {room.error && (
        <ErrorNotice
          message={room.error}
          onRetry={room.reload}
          onDismiss={() => room.setError(null)}
        />
      )}
      <div className={styles.layout}>
        <Sidebar
          selectedId={app.selected?.id}
          onOpenNode={app.selectNode}
          onMenu={app.showMenu}
          data={room.data}
          location={navigation.location}
          expanded={navigation.expanded}
          open={navigation.sidebarOpen}
          onToggle={navigation.toggle}
          onNavigate={app.navigate}
          onName={app.showName}
          onDelete={app.askDelete}
          onClose={() => navigation.setSidebarOpen(false)}
        />
        {settings ? (
          <SettingsShell
            onNavigation={() => app.navigation.setSidebarOpen(true)}
          />
        ) : app.invalidLocation ? (
          <InvalidLocation onCreate={() => app.showName({ kind: "workspace" })} />
        ) : workspace ? (
          <WorkspaceSurface
            count={children.length}
            toolbar={
              <WorkspaceToolbar
                workspace={workspace}
                path={path}
                mode={app.mode}
                chatOpen={chat.open}
                importing={app.importing}
                onMode={app.setMode}
                onNavigate={app.navigate}
                canShare={Boolean(app.selected)}
                onShare={() => {
                  if (app.selected) app.share(app.selected);
                }}
                onChat={chat.toggle}
                onImport={() =>
                  app.requestImport(workspace.id, navigation.location.folderId)
                }
                onNavigation={() => navigation.setSidebarOpen(true)}
              />
            }
            browser={
              <ProjectBrowser
                workspaceId={workspace.id}
                onMenu={(x, y, parentId, node) =>
                  app.showMenu(x, y, workspace.id, parentId, node)
                }
                nodes={nodes}
                path={path}
                folderId={navigation.location.folderId}
                mode={app.mode}
                selectedId={app.selected?.id}
                onSelect={(node) =>
                  app.mode === "columns"
                    ? app.selectNode(node)
                    : app.setSelection(node.id)
                }
                onOpen={app.openNode}
                onRename={(node) =>
                  app.showName({
                    kind: "rename",
                    target: "node",
                    id: node.id,
                    name: node.name,
                  })
                }
                onDelete={(node) => app.askDelete("node", node.id)}
                onCreate={app.createFolder}
                onMode={app.setMode}
              />
            }
            details={
              app.selected?.kind === "file" ? (
                <FilePreview
                  key={app.selected.id}
                  node={app.selected}
                  onClose={() => {
                    const id = app.selected?.id;
                    app.setSelection(null);
                    queueMicrotask(() => {
                      const row = Array.from(
                        document.querySelectorAll<HTMLElement>(
                          "[data-node-id]",
                        ),
                      ).find((element) => element.dataset.nodeId === id);
                      row?.querySelector<HTMLButtonElement>("button")?.focus();
                    });
                  }}
                  onComment={(text) =>
                    app.selected
                      ? app.actions.comment(app.selected.id, text)
                      : false
                  }
                />
              ) : null
            }
            chat={
              chat.open && conversation ? (
                <ChatDrawer
                  workspaceName={workspace.name}
                  referenceId={chat.referenceId}
                  referenceRequest={chat.referenceRequest}
                  key={workspace.id}
                  conversation={conversation}
                  thread={chat.thread}
                  draft={chat.draftValue}
                  onThread={chat.openThread}
                  conversations={chat.conversations}
                  nodes={nodes}
                  onClose={chat.close}
                  onNew={chat.create}
                  error={room.error}
                  onSelect={chat.select}
                  onRename={() =>
                    app.showName({
                      kind: "rename",
                      target: "conversation",
                      id: conversation.id,
                      name: conversation.title,
                    })
                  }
                  onDelete={() =>
                    app.askDelete("conversation", conversation.id)
                  }
                  onDraft={chat.draft}
                  onSend={chat.send}
                  onReference={(id) => {
                    const node = room.data.nodes.find((item) => item.id === id);
                    if (node) {
                      chat.close();
                      app.selectNode(node);
                    } else room.setError("Item no longer exists.");
                  }}
                />
              ) : null
            }
          />
        ) : (
          <WorkspaceHome
            onRefresh={room.reload}
            workspaces={room.data.workspaces}
            ready={room.ready}
            onCreate={() => app.showName({ kind: "workspace" })}
            onOpen={navigation.openWorkspace}
            onNavigation={() => navigation.setSidebarOpen(true)}
          />
        )}
      </div>
      {nameAction?.kind === "workspace" && (
        <NameDialog
          label="Workspace name"
          action="Create workspace"
          onSubmit={(name) => app.submitName(nameAction, name)}
          onClose={() => app.setNameAction(null)}
          error={room.error}
        />
      )}
      {nameAction && nameAction.kind !== "workspace" && (
        <NodeNameDialog
          key={JSON.stringify(nameAction)}
          action={nameAction.kind === "rename" ? "Rename" : "Create"}
          initial={
            nameAction.kind === "rename"
              ? nameAction.name
              : nameAction.kind === "file"
                ? "Untitled.txt"
                : ""
          }
          error={room.error}
          onSubmit={(name) => app.submitName(nameAction, name)}
          onClose={() => app.setNameAction(null)}
        />
      )}
      {app.importDestination && (
        <ImportDialog
          busy={app.importing}
          error={room.error}
          onFiles={(files, folder) => app.importFromMenu({ files, folder })}
          onDrop={(items) => app.importFromMenu({ items })}
          onLink={app.importLink}
          onClose={app.closeImport}
        />
      )}
      {app.menu && !app.menu.workspaceRoot && (
        <FileContextMenu
          x={app.menu.x}
          y={app.menu.y}
          node={app.menu.node}
          onClose={() => app.setMenu(null)}
          onCreate={(kind) => {
            if (app.menu) {
              app.navigate(
                app.menu.workspaceId,
                app.menu.node?.kind === "folder"
                  ? app.menu.node.id
                  : app.menu.parentId,
              );
              app.showName({
                kind,
                workspaceId: app.menu.workspaceId,
                parentId:
                  app.menu.node?.kind === "folder"
                    ? app.menu.node.id
                    : app.menu.parentId,
              });
            }
          }}
          onImport={() => {
            if (app.menu)
              app.requestImport(
                app.menu.workspaceId,
                app.menu.node?.kind === "folder"
                  ? app.menu.node.id
                  : app.menu.parentId,
              );
          }}
          onOpen={() => {
            if (app.menu?.node) app.openNode(app.menu.node);
          }}
          onRename={() => {
            if (app.menu?.node)
              app.showName({
                kind: "rename",
                target: "node",
                id: app.menu.node.id,
                name: app.menu.node.name,
              });
          }}
          onMove={() => {
            if (app.menu?.node) {
              room.setError(null);
              app.setMoving(app.menu.node);
            }
          }}
          onDelete={() => {
            if (app.menu?.node) app.askDelete("node", app.menu.node.id);
          }}
          onEdit={() => {
            if (app.menu?.node) app.editFile(app.menu.node);
          }}
          onExport={async () => {
            if (app.menu?.node?.content)
              try {
                await downloadFile(app.menu.node.name, app.menu.node.content);
              } catch (failure) {
                room.setError(
                  failure instanceof Error
                    ? failure.message
                    : "Cannot export file.",
                );
              }
          }}
          onChat={() => {
            if (!app.menu) return;
            const reference =
              app.menu.node?.id ?? app.menu.parentId ?? undefined;
            app.navigate(
              app.menu.workspaceId,
              app.menu.node?.parentId ?? app.menu.parentId,
            );
            chat.showFor(app.menu.workspaceId, reference);
          }}
          onShare={() => {
            if (app.menu?.node) app.share(app.menu.node);
          }}
        />
      )}
      {app.menu?.workspaceRoot && (
        <WorkspaceContextMenu
          x={app.menu.x}
          y={app.menu.y}
          onClose={() => app.setMenu(null)}
          onCreate={(kind) => {
            if (app.menu) {
              app.navigate(app.menu.workspaceId);
              app.showName({
                kind,
                workspaceId: app.menu.workspaceId,
                parentId: null,
              });
            }
          }}
          onImport={() => {
            if (app.menu) app.requestImport(app.menu.workspaceId, null);
          }}
          onChat={() => {
            if (!app.menu) return;
            app.navigate(app.menu.workspaceId);
            chat.showFor(app.menu.workspaceId);
          }}
          onRename={() => {
            const workspace = room.data.workspaces.find(
              (item) => item.id === app.menu?.workspaceId,
            );
            if (workspace)
              app.showName({
                kind: "rename",
                target: "workspace",
                id: workspace.id,
                name: workspace.name,
              });
          }}
          onDelete={() => {
            if (app.menu) app.askDelete("workspace", app.menu.workspaceId);
          }}
        />
      )}
      {app.previewing && (
        <FileOpenDialog
          node={app.previewing}
          onClose={() => app.setPreviewing(null)}
        />
      )}
      {app.sharing && (
        <ShareReferenceDialog
          node={app.sharing}
          workspaceName={
            room.data.workspaces.find(
              (item) => item.id === app.sharing?.workspaceId,
            )?.name ?? ""
          }
          error={room.error}
          onClose={() => app.setSharing(null)}
          onShare={(message) =>
            app.sharing ? chat.shareReference(app.sharing, message) : false
          }
        />
      )}
      {app.moving && (
        <MoveDialog
          node={app.moving}
          nodes={room.data.nodes}
          workspaceName={
            room.data.workspaces.find(
              (item) => item.id === app.moving?.workspaceId,
            )?.name ?? "Workspace"
          }
          error={room.error}
          onMove={(parentId) =>
            app.moving ? app.actions.move(app.moving.id, parentId) : false
          }
          onClose={() => app.setMoving(null)}
        />
      )}
      {app.editing && (
        <FileEditor
          node={app.editing.node}
          initial={app.editing.text}
          error={room.error}
          onSave={(text) =>
            app.editing
              ? app.actions.saveText(app.editing.node.id, text)
              : false
          }
          onClose={() => app.setEditing(null)}
        />
      )}
      {deleting && (
        <DeleteDialog
          name={deleting.name}
          onDelete={app.remove}
          onClose={() => app.setDeleting(null)}
          error={room.error}
        />
      )}
    </div>
  );
}
