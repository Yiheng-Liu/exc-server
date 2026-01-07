import { ExcalidrawWrapper } from "@/components/ExcalidrawWrapper";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function FileEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
      return <div>Unauthorized</div>;
  }

  // Verify file existence
  const file = await prisma.fileSystemItem.findUnique({
      where: { id }
  });

  if (!file || file.ownerId !== session.user.id || file.type !== "FILE") {
      notFound();
  }

  return <ExcalidrawWrapper fileId={id} />;
}
