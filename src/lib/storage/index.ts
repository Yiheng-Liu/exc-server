import { LocalStorageAdapter } from "./local";
import { S3StorageAdapter } from "./s3";

export interface StorageAdapter {
  /**
   * Save content to the specified path.
   * Path should be relative to the user/root, e.g., "userId/folder/file.excalidraw"
   */
  save(path: string, content: Buffer): Promise<void>;
  
  /**
   * Read content from the specified path.
   */
  read(path: string): Promise<Buffer | null>;
  
  /**
   * Delete the file or directory at the specified path.
   */
  delete(path: string): Promise<void>;
  
  /**
   * Rename/Move a file or directory.
   */
  rename(oldPath: string, newPath: string): Promise<void>;
}

export function getStorageAdapter(): StorageAdapter {
  const provider = process.env.STORAGE_PROVIDER || "local";
  
  if (provider === "s3") {
    return new S3StorageAdapter();
  }
  
  return new LocalStorageAdapter();
}
