import fs from "fs/promises";
import path from "path";
import { StorageAdapter } from "./index";

const BASE_DIR = path.join(process.cwd(), "data", "blobs");

export class LocalStorageAdapter implements StorageAdapter {
  private getAbsolutePath(relativePath: string): string {
    // Prevent directory traversal attacks
    const safePath = relativePath.replace(/\.\./g, "");
    return path.join(BASE_DIR, safePath);
  }

  async save(relativePath: string, content: Buffer): Promise<void> {
    const fullPath = this.getAbsolutePath(relativePath);
    const dir = path.dirname(fullPath);
    
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(fullPath, content);
  }

  async read(relativePath: string): Promise<Buffer | null> {
    const fullPath = this.getAbsolutePath(relativePath);
    try {
      return await fs.readFile(fullPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }

  async delete(relativePath: string): Promise<void> {
    const fullPath = this.getAbsolutePath(relativePath);
    try {
      await fs.rm(fullPath, { recursive: true, force: true });
    } catch (error) {
       // Ignore if already missing
    }
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    const fullOldPath = this.getAbsolutePath(oldPath);
    const fullNewPath = this.getAbsolutePath(newPath);
    const newDir = path.dirname(fullNewPath);

    await fs.mkdir(newDir, { recursive: true });
    
    try {
      await fs.rename(fullOldPath, fullNewPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        // Source doesn't exist, maybe ignore or throw?
        return; 
      }
      throw error;
    }
  }
}
