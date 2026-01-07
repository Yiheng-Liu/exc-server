"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { FileSystemItem } from "@prisma/client";
import { 
  Folder, File as FileIcon, ChevronRight, ChevronDown, 
  Plus, Trash2, LogOut, MoreVertical, Pencil, Loader2 
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useFileStatus } from "@/contexts/FileStatusContext";
import { useToast } from "@/contexts/ToastContext";

type FileNode = FileSystemItem & { children?: FileNode[] };

// Special ID for the ghost node being created
const GHOST_ID = "___GHOST___";

export function Sidebar({ className }: { className?: string }) {
  const { data: session } = useSession();
  const { isDirty } = useFileStatus();
  const { success, error } = useToast();
  const [items, setItems] = useState<FileSystemItem[]>([]);
  const [tree, setTree] = useState<FileNode[]>([]);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  
  // Creation State
  const [creationState, setCreationState] = useState<{
    parentId: string | null;
    type: "FILE" | "FOLDER";
  } | null>(null);
  const [ghostName, setGhostName] = useState("");
  const [isCreatingApi, setIsCreatingApi] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const ghostInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchFiles();
  }, []);

  useEffect(() => {
    setTree(buildTree(items));
  }, [items, creationState]); // Rebuild tree when creation state changes

  useEffect(() => {
    if (creationState) {
        // Auto-focus ghost input
        // Using timeout to ensure render happens first
        setTimeout(() => {
            ghostInputRef.current?.focus();
        }, 10);
    }
  }, [creationState]);

  const fetchFiles = async () => {
    try {
        const res = await fetch("/api/files");
        if (res.ok) {
            setItems(await res.json());
        }
    } catch (e) {
        console.error(e);
        error("Failed to fetch files");
    }
  };

  const buildTree = (allItems: FileSystemItem[]): FileNode[] => {
    const itemMap = new Map<string, FileNode>();
    // Deep copy to avoid mutating original items during children push
    const nodes: FileNode[] = allItems.map(item => ({ ...item, children: [] }));
    nodes.forEach(node => itemMap.set(node.id, node));
    
    const rootNodes: FileNode[] = [];
    
    nodes.forEach(node => {
      if (node.parentId) {
        const parent = itemMap.get(node.parentId);
        if (parent) {
          parent.children?.push(node);
        }
      } else {
        rootNodes.push(node);
      }
    });

    // Insert Ghost Node if creating
    if (creationState) {
        const ghostNode: FileNode = {
            id: GHOST_ID,
            name: ghostName,
            type: creationState.type,
            parentId: creationState.parentId,
            ownerId: "",
            // This is a placeholder for the UI only. 
            // The actual storageProvider is determined by the backend (env var) upon creation.
            storageProvider: "local",
            path: "",
            createdAt: new Date(),
            updatedAt: new Date(),
            children: []
        };

        if (creationState.parentId) {
            const parent = itemMap.get(creationState.parentId);
            if (parent) {
                // Ensure parent is expanded so we can see the new item
                if (!expanded.has(creationState.parentId)) {
                     setExpanded(prev => new Set(prev).add(creationState.parentId!));
                }
                // Prepend to children (or append, sorting usually dictates)
                // For now, prepend for visibility
                parent.children?.unshift(ghostNode);
            }
        } else {
            rootNodes.unshift(ghostNode);
        }
    }

    return rootNodes;
  };

  const commitCreation = async () => {
    if (!creationState || !ghostName.trim() || isCreatingApi) {
        cancelCreation();
        return;
    }
    
    setIsCreatingApi(true);
    try {
        const res = await fetch("/api/files", {
          method: "POST",
          body: JSON.stringify({ 
            name: ghostName, 
            type: creationState.type, 
            parentId: creationState.parentId 
          }),
          headers: { "Content-Type": "application/json" }
        });
        
        if (res.ok) {
            setGhostName("");
            setCreationState(null);
            fetchFiles();
        } else {
            const data = await res.json();
            error(data.message || "Create failed");
            // Do NOT cancel creation so user can fix name
            ghostInputRef.current?.focus(); 
        }
    } catch (e) {
        console.error(e);
        error("Create failed");
    } finally {
        setIsCreatingApi(false);
    }
  };
  
  const cancelCreation = () => {
      setCreationState(null);
      setGhostName("");
  };

  const startCreation = (type: "FILE" | "FOLDER", parentId: string | null) => {
      setCreationState({ type, parentId });
      setGhostName("");
      // Expand parent if needed
      if(parentId) {
          setExpanded(prev => new Set(prev).add(parentId));
      }
  };

  const handleDelete = async (id: string) => {
    if(!confirm("Are you sure?")) return;
    
    try {
        const res = await fetch(`/api/files/${id}`, {
            method: "DELETE"
        });

        if (res.ok) {
            setItems(items.filter(i => i.id !== id));
            
            const activeIdMatch = pathname?.match(/\/files\/([^\/]+)/);
            if (activeIdMatch) {
                const activeId = activeIdMatch[1];
                let shouldRedirect = false;
                
                if (activeId === id) shouldRedirect = true;
                
                if (!shouldRedirect) {
                    let current = items.find(i => i.id === activeId);
                    while (current && current.parentId) {
                        if (current.parentId === id) {
                            shouldRedirect = true;
                            break;
                        }
                        const parentId = current.parentId;
                        current = items.find(i => i.id === parentId);
                    }
                }
                
                if (shouldRedirect) {
                     router.push("/dashboard");
                }
            }
        } else {
            error("Failed to delete file");
        }
    } catch (e) {
        console.error("Delete failed", e);
        error("Error deleting file");
    }
  };

  const toggleExpand = (id: string) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpanded(next);
  };

  // Rename State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [renaming, setRenaming] = useState(false);

  const handleRename = async (id: string) => {
    if (!editName || editName === items.find(i => i.id === id)?.name) {
        setEditingId(null);
        return;
    }
    
    // If edit triggered by blur, and we are already submitting, ignore
    if (renaming) return;

    setRenaming(true);
    try {
        const res = await fetch(`/api/files/${id}`, {
            method: "PUT",
            body: JSON.stringify({ name: editName }),
            headers: { "Content-Type": "application/json" }
        });
        
        if (res.ok) {
            fetchFiles();
            setEditingId(null); 
        } else {
            const data = await res.json();
            error(data.message || "Rename failed");
            if (res.status === 409) return; 
            setEditingId(null);
        }
    } catch (e) {
        console.error("Rename failed", e);
        setEditingId(null);
    } finally {
        setRenaming(false);
    }
  };

  // DnD State
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragOverNodeId, setDragOverNodeId] = useState<string | null>(null);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    targetId: string | null; // null for root
    targetType: "FILE" | "FOLDER" | "ROOT";
  } | null>(null);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  const handleContextMenu = (e: React.MouseEvent, id: string | null, type: "FILE" | "FOLDER" | "ROOT") => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({
          x: e.clientX,
          y: e.clientY,
          targetId: id,
          targetType: type
      });
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.stopPropagation();
    setDraggedNodeId(id);
    e.dataTransfer.setData("application/json", JSON.stringify({ id }));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, node: FileNode) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (node.type === "FOLDER" && node.id !== draggedNodeId) {
         setDragOverNodeId(node.id);
         e.dataTransfer.dropEffect = "move";
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOverNodeId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetNode?: FileNode) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverNodeId(null);

    // 1. Internal Move
    const draggedId = draggedNodeId;
    setDraggedNodeId(null);

    if (draggedId) {
        if (!targetNode || targetNode.type !== "FOLDER") return;
        if (targetNode.id === draggedId) return;
        
        await handleMove(draggedId, targetNode.id);
        return;
    }

    // 2. External File Upload
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const files = Array.from(e.dataTransfer.files);
        let parentId: string | null = null;
        
        if (targetNode) {
            if (targetNode.type === "FOLDER") {
                parentId = targetNode.id;
            } else {
                parentId = targetNode.parentId;
            }
        } else {
            parentId = null;
        }
        
        await handleFileUpload(files, parentId);
    }
  };
  
  const handleMove = async (draggedId: string, targetParentId: string) => {
     try {
        const res = await fetch(`/api/files/${draggedId}`, {
            method: "PUT",
            body: JSON.stringify({ parentId: targetParentId }),
            headers: { "Content-Type": "application/json" }
        });
        if (res.ok) {
            fetchFiles();
        } else {
            console.error("Move failed");
            error("Failed to move file");
        }
     } catch (e) {
         console.error("Move error", e);
         error("Move error");
     }
  };

  const handleFileUpload = async (files: File[], parentId: string | null) => {
      for (const file of files) {
          if (!file.name.endsWith(".excalidraw") && !file.name.endsWith(".json")) continue;
          
          try {
              const text = await file.text();
              const content = JSON.parse(text); 
              
              const res = await fetch("/api/files", {
                  method: "POST",
                  body: JSON.stringify({
                      name: file.name,
                      type: "FILE",
                      parentId,
                      content
                  }),
                  headers: { "Content-Type": "application/json" }
              });
              
              if (!res.ok) {
                  const data = await res.json();
                  error(`Upload failed for ${file.name}: ${data.message}`);
              }
          } catch(e) {
              console.error("Error reading/uploading file", file.name, e);
              error(`Error uploading ${file.name}`);
          }
      }
      fetchFiles();
  };

  const renderNode = (node: FileNode, level: number = 0) => {
    const isExpanded = expanded.has(node.id);
    const isFolder = node.type === "FOLDER";
    const isActive = pathname === `/files/${node.id}`;
    const isEditing = editingId === node.id;
    const isGhost = node.id === GHOST_ID;
    const isDragOver = dragOverNodeId === node.id;
    const isDragged = draggedNodeId === node.id;

    if (isGhost) {
        // Ghost Node Render (Input)
        return (
            <div key={node.id} style={{ paddingLeft: `${level * 12}px` }}>
                <div className="flex items-center gap-2 p-1 rounded border border-blue-400 bg-blue-50">
                    <span className="text-gray-500">
                         {/* Indent icon placeholder */}
                         {isFolder ? <ChevronRight size={14} className="text-gray-300" /> : <span className="w-3.5" />}
                    </span>
                    <span className="text-blue-500">
                        {isFolder ? <Folder size={16} /> : <FileIcon size={16} />}
                    </span>
                    <div className="flex flex-1 items-center gap-1 min-w-0">
                         <input 
                            ref={ghostInputRef}
                            className="flex-1 min-w-0 text-sm border-none bg-transparent outline-none p-0.5"
                            placeholder={isFolder ? "Folder Name" : "File Name"}
                            value={ghostName}
                            onChange={e => setGhostName(e.target.value)}
                            onKeyDown={e => {
                                if (isCreatingApi) return;
                                if (e.key === "Enter") commitCreation();
                                if (e.key === "Escape") cancelCreation();
                            }}
                            onBlur={() => {
                                 // Delay slightly to allow click to register if it was a commit click
                                 // But usually blur = commit or cancel. 
                                 // VSCode behavior: Blur = Cancel if empty, Commit if valid? 
                                 // Better: Blur = Check if we should commit.
                                 if (!ghostName.trim()) cancelCreation();
                                 else commitCreation();
                            }}
                            disabled={isCreatingApi}
                        />
                        {isCreatingApi && <Loader2 size={12} className="animate-spin text-blue-500" />}
                    </div>
                </div>
            </div>
        );
    }

    // Normal Node Render
    return (
      <div key={node.id} style={{ paddingLeft: `${level * 12}px` }}>
        <div 
            draggable={!isEditing}
            onDragStart={(e) => handleDragStart(e, node.id)}
            onDragOver={(e) => handleDragOver(e, node)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, node)}
            onContextMenu={(e) => handleContextMenu(e, node.id, node.type as any)}
            className={`flex items-center gap-2 p-1 rounded cursor-pointer border border-transparent 
                ${isActive ? "bg-blue-100" : "hover:bg-gray-100"}
                ${isDragOver ? "bg-blue-200 border-blue-500" : ""}
                ${isDragged ? "opacity-50" : ""}
            `}
            onClick={() => {
                if (isEditing) return;
                if (isFolder) toggleExpand(node.id);
                else router.push(`/files/${node.id}`);
            }}
        >
            <span className="text-gray-500">
                {isFolder ? (isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <span className="w-3.5" />}
            </span>
            <span className="text-blue-500">
                {isFolder ? <Folder size={16} /> : <FileIcon size={16} />}
            </span>
            
            {isEditing ? (
                <div className="flex flex-1 items-center gap-1 min-w-0">
                    <input 
                        className="flex-1 min-w-0 text-sm border p-0.5 rounded"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onClick={e => e.stopPropagation()}
                        onKeyDown={e => {
                            if (renaming) return;
                            if (e.key === "Enter") handleRename(node.id);
                            if (e.key === "Escape") setEditingId(null);
                        }}
                        onBlur={() => !renaming && handleRename(node.id)}
                        autoFocus
                        disabled={renaming}
                    />
                    {renaming && <Loader2 size={12} className="animate-spin text-blue-500" />}
                </div>
            ) : (
                <div className="flex flex-1 items-center justify-between min-w-0">
                    <span className="text-sm truncate">{node.name}</span>
                    {isDirty(node.id) && (
                        <div className="w-2 h-2 bg-gray-500 rounded-full shrink-0 mr-1" title="Unsaved changes" />
                    )}
                </div>
            )}

            {!isEditing && (
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1"> 
                    {/* Only show actions on hover - added opacity control logic implicitly via CSS group-hover equivalent or simplified */}
                     <button onClick={(e) => { 
                        e.stopPropagation(); 
                        setEditingId(node.id); 
                        setEditName(node.name.replace(".excalidraw", "")); 
                    }} className="text-gray-400 hover:text-blue-500" title="Rename">
                        <Pencil size={12} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(node.id); }} className="text-gray-400 hover:text-red-500">
                        <Trash2 size={12} />
                    </button>
                    {isFolder && (
                        <button onClick={(e) => {
                            e.stopPropagation();
                            startCreation("FILE", node.id);
                        }} className="text-gray-400 hover:text-green-500" title="Add File">
                            <Plus size={12} />
                        </button>
                    )}
                </div>
            )}
        </div>
        {isFolder && isExpanded && node.children?.map(child => renderNode(child, level + 1))}
      </div>
    );
  };

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [width, setWidth] = useState(256);
  const [isResizing, setIsResizing] = useState(false);

  const startResizing = useCallback((mouseDownEvent: React.MouseEvent) => {
      setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
      setIsResizing(false);
  }, []);

  const resize = useCallback(
      (mouseMoveEvent: MouseEvent) => {
          if (isResizing) {
              const newWidth = mouseMoveEvent.clientX;
              if (newWidth < 100) {
                  setIsCollapsed(true);
                  setWidth(256); // Reset to default for when expanded again
                  setIsResizing(false);
              } else {
                  if (isCollapsed) setIsCollapsed(false);
                  setWidth(Math.max(200, Math.min(newWidth, 600))); // Min 200, Max 600
              }
          }
      },
      [isResizing, isCollapsed]
  );

  useEffect(() => {
      window.addEventListener("mousemove", resize);
      window.addEventListener("mouseup", stopResizing);
      return () => {
          window.removeEventListener("mousemove", resize);
          window.removeEventListener("mouseup", stopResizing);
      };
  }, [resize, stopResizing]);

  return (
    <div 
        className={`flex flex-col h-full bg-gray-50/50 backdrop-blur-xl border-r border-gray-200/50 transition-all duration-75 ease-linear relative group/sidebar
        ${className}`}
        style={{ width: isCollapsed ? 60 : width }}
    >
        {/* Toggle Button */}
        <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute -right-3 top-6 z-50 bg-white border border-gray-200 shadow-sm rounded-full p-1 text-gray-500 hover:text-blue-500 hover:shadow-md transition-all opacity-0 group-hover/sidebar:opacity-100"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
            {isCollapsed ? <ChevronRight size={14} /> : <div className="p-0.5"><ChevronRight size={14} className="rotate-180" /></div>}
        </button>
        
        {/* Resize Handle */}
        <div
            className={`absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-blue-400/50 z-40 transition-colors ${isResizing ? "bg-blue-500" : "bg-transparent"}`}
            onMouseDown={startResizing}
        />

        <div className={`p-4 flex justify-between items-center shrink-0 ${isCollapsed ? "justify-center flex-col gap-4" : ""}`}>
            {!isCollapsed ? (
                <>
                    <div className="font-semibold text-gray-800 text-sm tracking-tight text-opacity-80">My Workspace</div>
                    <div className="flex gap-1">
                        <button 
                            onClick={() => startCreation("FILE", null)}
                            className="p-1.5 hover:bg-gray-100 rounded text-gray-600 hover:text-blue-500 transition-colors"
                            title="New File"
                        >
                            <FileIcon size={18} />
                        </button>
                        <button 
                            onClick={() => startCreation("FOLDER", null)}
                            className="p-1.5 hover:bg-gray-100 rounded text-gray-600 hover:text-blue-500 transition-colors"
                            title="New Folder"
                        >
                            <Folder size={18} />
                        </button>
                    </div>
                </>
            ) : (
                <div className="flex flex-col gap-3 pt-2">
                     <button 
                        onClick={() => { setIsCollapsed(false); startCreation("FILE", null); }}
                        className="p-2 hover:bg-gray-100 rounded-xl text-gray-600 hover:text-blue-500 transition-colors"
                        title="New File"
                    >
                        <FileIcon size={20} />
                    </button>
                    <button 
                        onClick={() => { setIsCollapsed(false); startCreation("FOLDER", null); }}
                        className="p-2 hover:bg-gray-100 rounded-xl text-gray-600 hover:text-blue-500 transition-colors"
                        title="New Folder"
                    >
                        <Folder size={20} />
                    </button>
                </div>
            )}
        </div>
        
        {/* Removed Old Creation Input */}

        {/* Tree Content */}
        {!isCollapsed && (
            <div 
                className="flex-1 overflow-auto p-2"
                onContextMenu={(e) => handleContextMenu(e, null, "ROOT")}
                onDragOver={(e) => {
                    e.preventDefault();
                    e.type === "dragover" && e.dataTransfer.dropEffect === "none" && (e.dataTransfer.dropEffect = "copy");
                }}
                onDrop={(e) => handleDrop(e)}
            >
                {tree.map(node => renderNode(node))}
            </div>
        )}

        {/* User Footer */}
        <div className={`p-4 border-t border-gray-200/50 flex items-center gap-2 bg-white/30 backdrop-blur-md ${isCollapsed ? "justify-center" : ""}`}>
            {!isCollapsed ? (
                <>
                    <div className="flex-1 truncate text-xs font-medium text-gray-500">
                        {session?.user?.email}
                    </div>
                    <button onClick={() => signOut()} title="Sign Out" className="p-1 hover:bg-gray-200 rounded-md transition-colors">
                        <LogOut size={14} className="text-gray-500 hover:text-red-500" />
                    </button>
                </>
            ) : (
                <button onClick={() => signOut()} title="Sign Out" className="p-2 hover:bg-gray-200 rounded-md transition-colors text-gray-500 hover:text-red-500">
                    <LogOut size={16} />
                </button>
            )}
        </div>
        
        {/* Context Menu */}
        {contextMenu && (
            <div 
                className="fixed bg-white border border-gray-200 shadow-lg rounded-md py-1 z-50 text-sm min-w-[160px]"
                style={{ top: contextMenu.y, left: contextMenu.x }}
                onClick={(e) => e.stopPropagation()} 
            >
                {(contextMenu.targetType === "ROOT" || contextMenu.targetType === "FOLDER") && (
                    <>
                        <button 
                            className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                            onClick={() => {
                                setIsCollapsed(false);
                                startCreation("FILE", contextMenu.targetId);
                                setContextMenu(null);
                            }}
                        >
                            <FileIcon size={14} /> New File
                        </button>
                        <button 
                            className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                            onClick={() => {
                                setIsCollapsed(false);
                                startCreation("FOLDER", contextMenu.targetId);
                                setContextMenu(null);
                            }}
                        >
                            <Folder size={14} /> New Folder
                        </button>
                        <div className="border-b my-1" />
                    </>
                )}
                
                {contextMenu.targetType !== "ROOT" && (
                    <>
                        <button 
                            className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2"
                            onClick={() => {
                                if (contextMenu.targetId) {
                                    setEditingId(contextMenu.targetId);
                                    const item = items.find(i => i.id === contextMenu.targetId);
                                    if (item) setEditName(item.name.replace(".excalidraw", ""));
                                }
                                setContextMenu(null);
                            }}
                        >
                            <Pencil size={14} /> Rename
                        </button>
                        <button 
                            className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 text-red-600"
                            onClick={() => {
                                if (contextMenu.targetId) handleDelete(contextMenu.targetId);
                                setContextMenu(null);
                            }}
                        >
                            <Trash2 size={14} /> Delete
                        </button>
                    </>
                )}
            </div>
        )}
    </div>
  );
}
