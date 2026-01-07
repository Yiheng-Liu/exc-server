import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getStorageAdapter } from "@/lib/storage";

const storage = getStorageAdapter();

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const item = await prisma.fileSystemItem.findUnique({
      where: { id }
    });

    if (!item || item.ownerId !== session.user.id || item.type !== "FILE") {
      return NextResponse.json({ message: "File not found" }, { status: 404 });
    }

    const storageKey = `${session.user.id}${item.path}`;
    const content = await storage.read(storageKey);

    if (!content) {
       // Return empty valid excalidraw json if missing?
       return NextResponse.json({ elements: [], appState: {}, files: {} });
    }

    return new NextResponse(content as any, {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("API Content Read Error:", error);
    return NextResponse.json({ message: "Error reading file" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const item = await prisma.fileSystemItem.findUnique({
      where: { id }
    });

    if (!item || item.ownerId !== session.user.id || item.type !== "FILE") {
      return NextResponse.json({ message: "File not found" }, { status: 404 });
    }

    const body = await req.arrayBuffer(); // Read as buffer
    const buffer = Buffer.from(body);
    
    const storageKey = `${session.user.id}${item.path}`;
    await storage.save(storageKey, buffer);
    
    // Update updatedAt?
    await prisma.fileSystemItem.update({
      where: { id: item.id },
      data: { updatedAt: new Date() }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ message: "Error saving file" }, { status: 500 });
  }
}
