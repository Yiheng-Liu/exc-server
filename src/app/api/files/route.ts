import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getStorageAdapter } from "@/lib/storage";

const storage = getStorageAdapter();

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const files = await prisma.fileSystemItem.findMany({
      where: {
        ownerId: session.user.id,
        storageProvider: process.env.STORAGE_PROVIDER || "local"
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    return NextResponse.json(files);
  } catch (error) {
    return NextResponse.json({ message: "Error fetching files" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, type, parentId, content } = await req.json(); // type: "FILE" | "FOLDER"

    if (!name || !type) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    let parentPath = "";
    if (parentId) {
      console.log(`[API] POST /files - Creating item '${name}' in parent '${parentId}' for user: ${session.user.id}`);
      const parent = await prisma.fileSystemItem.findUnique({
        where: { id: parentId }
      });
      if (!parent || parent.ownerId !== session.user.id) {
        return NextResponse.json({ message: "Invalid parent" }, { status: 400 });
      }
      parentPath = parent.path === "/" ? "" : parent.path;
    } else {
      console.log(`[API] POST /files - Creating item '${name}' in root for user: ${session.user.id}`);
    }

    const itemName = name.endsWith(".excalidraw") || type === "FOLDER" ? name : `${name}.excalidraw`;
    const fullPath = `${parentPath}/${itemName}`;

    const storageProvider = process.env.STORAGE_PROVIDER || "local";

    // DUPLICATE CHECK
    const existing = await prisma.fileSystemItem.findFirst({
        where: {
            name: itemName,
            parentId: parentId || null,
            ownerId: session.user.id,
            storageProvider
        }
    });

    if (existing) {
        return NextResponse.json({ message: "A file or folder with this name already exists in this location." }, { status: 409 });
    }

    // Create DB Entry
    // If it is a file, we want to ensure storage consistency.
    // Strategy: Upload to Storage FIRST -> Create DB Entry -> If DB fails, Delete from Storage (Compensating Transaction)
    // This avoids "Ghost Database Entries" where DB says file exists but S3 doesn't.
    // The reverse (Ghost S3 file) is better (just waste space) than broken UI.
    
    // Prepare Content
    let buffer: Buffer;
    if (type === "FILE") {
        if (content) {
             if (typeof content === 'string') {
                  buffer = Buffer.from(content);
              } else {
                  buffer = Buffer.from(JSON.stringify(content));
              }
        } else {
              buffer = Buffer.from(JSON.stringify({
                type: "excalidraw",
                version: 2,
                source: "excalidraw-wrapper",
                elements: [],
                appState: { viewBackgroundColor: "#ffffff", gridModeEnabled: false },
                files: {}
              }));
        }
    }

    const storageKey = `${session.user.id}${fullPath}`;

    // 1. Upload to Storage (if it's a file)
    if (type === "FILE") {
        await storage.save(storageKey, buffer!);
    }

    // 2. Create DB Entry
    let newItem;
    try {
        newItem = await prisma.fileSystemItem.create({
          data: {
            name: itemName,
            type,
            parentId: parentId || null,
            ownerId: session.user.id,
            path: fullPath,
            storageProvider
          }
        });
    } catch (dbError) {
        // 3. Rollback: Delete from Storage if DB failed
        if (type === "FILE") {
            try {
                await storage.delete(storageKey);
                console.log("Rolled back storage file due to DB failure:", storageKey);
            } catch (cleanupError) {
                console.error("CRITICAL: Failed to rollback storage file after DB failure:", storageKey, cleanupError);
                // System admin intervention might be needed here, or a cron cleaner
            }
        }
        throw dbError; // Re-throw to be caught by outer try/catch
    }

    return NextResponse.json(newItem, { status: 201 });
  } catch (error) {
    console.error("Create File Error:", error);
    return NextResponse.json({ message: "Error creating file" }, { status: 500 });
  }
}
