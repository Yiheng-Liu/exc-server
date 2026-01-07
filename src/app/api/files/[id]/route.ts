import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getStorageAdapter } from "@/lib/storage";

const storage = getStorageAdapter();

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    
    // Check ownership
    const item = await prisma.fileSystemItem.findUnique({
        where: { id }
    });

    if (!item || item.ownerId !== session.user.id) {
        return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    // Delete from storage (Recursive for folders handled by adapter)
    const key = `${session.user.id}${item.path}`;
    try {
        await storage.delete(key);
    } catch (e) {
        console.error("Storage delete failed", e);
    }

    // Delete from DB
    await prisma.fileSystemItem.delete({
        where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete error", error);
    return NextResponse.json({ message: "Error deleting file" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { name, parentId } = await req.json();

    const item = await prisma.fileSystemItem.findUnique({ where: { id } });
    if (!item || item.ownerId !== session.user.id) {
       return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {};
    let newFullPath = item.path;
    
    // Handle Rename or Move
    if (name || parentId !== undefined) {
        let newItemName = item.name;
        let newParentId = item.parentId;

        // 1. Determine New Name
        if (name && name !== item.name) {
             newItemName = (item.type === "FILE" && !name.endsWith(".excalidraw")) 
                 ? `${name}.excalidraw` 
                 : name;
             updateData.name = newItemName;
        }

        // 2. Determine New Parent
        if (parentId !== undefined && parentId !== item.parentId) {
             // Validate new parent
             if (parentId === null) {
                 newParentId = null;
                 updateData.parentId = null;
             } else {
                 const newParent = await prisma.fileSystemItem.findUnique({ where: { id: parentId } });
                 if (!newParent || newParent.ownerId !== session.user.id || newParent.type !== "FOLDER") {
                     return NextResponse.json({ message: "Invalid parent" }, { status: 400 });
                 }
                 // Prevent moving folder into itself or its children
                 if (item.type === "FOLDER" && newParent.path.startsWith(item.path)) {
                     return NextResponse.json({ message: "Cannot move folder into itself" }, { status: 400 });
                 }
                 newParentId = parentId;
                 updateData.parentId = parentId;
             }
        }

        // 3. Calculate New Path
        // Resolve parent path
        let parentPath = "";
        if (newParentId) {
            const parent = await prisma.fileSystemItem.findUnique({ where: { id: newParentId } });
            parentPath = parent?.path || "";
            // Handle root path normalization if implementation stores root as "/" or ""
             if (parentPath === "/") parentPath = "";
        }
        
        const newFullPath = `${parentPath}/${newItemName}`;

        // 4. Perform Move if path changed
        if (newFullPath !== item.path) {
             // DUPLICATE CHECK
             const checkParentId = (parentId !== undefined) ? newParentId : item.parentId;
             
             const existing = await prisma.fileSystemItem.findFirst({
                 where: {
                     name: newItemName,
                     parentId: checkParentId,
                     ownerId: session.user.id,
                     NOT: {
                         id: item.id
                     }
                 }
             });

             if (existing) {
                 return NextResponse.json({ message: "Duplicate name in destination." }, { status: 409 });
             }

             updateData.path = newFullPath;
             
             const oldStorageKey = `${session.user.id}${item.path}`;
             const newStorageKey = `${session.user.id}${newFullPath}`;
             
             // Move in Storage
             try {
                await storage.rename(oldStorageKey, newStorageKey);
             } catch(e) {
                console.error("Storage rename failed", e);
                return NextResponse.json({ message: "Storage move failed" }, { status: 500 });
             }

             // Transaction to update DB
             // If Folder, must update children recursively
             if (item.type === "FOLDER") {
                 // Fetch all descendants
                 const descendants = await prisma.fileSystemItem.findMany({
                     where: {
                         ownerId: session.user.id,
                         path: { startsWith: item.path + "/" }
                     }
                 });

                 // Update current item
                 await prisma.fileSystemItem.update({
                     where: { id },
                     data: updateData
                 });

                 // Update descendants paths
                 for (const child of descendants) {
                     const childNewPath = child.path.replace(item.path, newFullPath);
                     await prisma.fileSystemItem.update({
                         where: { id: child.id },
                         data: { path: childNewPath }
                     });
                 }
                 
                 return NextResponse.json({ ...item, ...updateData });
             } else {
                 // Simple file update
                 const updated = await prisma.fileSystemItem.update({
                     where: { id },
                     data: updateData
                 });
                 return NextResponse.json(updated);
             }
        }
    }

    return NextResponse.json(item);

  } catch (error) {
    console.error("Update error", error);
    return NextResponse.json({ message: "Error updating item" }, { status: 500 });
  }
}
