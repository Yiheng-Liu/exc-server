import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, CopyObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { StorageAdapter } from "./index";

export class S3StorageAdapter implements StorageAdapter {
  private client: S3Client;
  private bucket: string;

  constructor() {
    let endpoint = process.env.AWS_S3_ENDPOINT;
    // Auto-fix missing protocol for S3 compatible endpoints (e.g. Aliyun OSS)
    if (endpoint && !endpoint.startsWith("http://") && !endpoint.startsWith("https://")) {
        endpoint = `https://${endpoint}`;
    }

    this.client = new S3Client({
      endpoint,
      region: process.env.AWS_S3_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
      },
    });
    this.bucket = process.env.AWS_S3_BUCKET || "";
  }

  async save(path: string, content: Buffer): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: path,
      Body: content,
    });
    await this.client.send(command);
  }

  async read(path: string): Promise<Buffer | null> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: path,
      });
      const response = await this.client.send(command);
      if (!response.Body) return null;
      // Convert stream to Buffer
      const byteArray = await response.Body.transformToByteArray();
      return Buffer.from(byteArray);
    } catch (error: any) {
      if (error.name === "NoSuchKey" || error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) return null;
      console.error("S3 Read Error:", error);
      throw error;
    }
  }

  async delete(path: string): Promise<void> {
    // Check if it looks like a folder (no extension, or purely logic based)
    // S3 keys use '/'
    // To recursively delete, we list and delete.
    
    // Attempt single delete first (file)
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: path }));

    // Also try to list with prefix (folder)
    // Ensure prefix ends with / if it thinks it is a folder?
    // For safety, path input should be handled by caller. 
    // If we assume 'path' is the exact key or prefix:
    
    const prefix = path.endsWith("/") ? path : `${path}/`;
    const listCmd = new ListObjectsV2Command({ Bucket: this.bucket, Prefix: prefix });
    const listed = await this.client.send(listCmd);

    if (listed.Contents && listed.Contents.length > 0) {
      const deleteParams = {
        Bucket: this.bucket,
        Delete: { Objects: listed.Contents.map(({ Key }) => ({ Key })) },
      };
      await this.client.send(new DeleteObjectsCommand(deleteParams));
    }
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    // 1. Copy
    // 2. Delete
    // Note: This is efficient for files, expensive for folders.
    // Simplifying assumption: mostly used for files.
    
    // Check if it is a directory by listing?
    // For file:
    await this.client.send(new CopyObjectCommand({
        Bucket: this.bucket,
        CopySource: `${this.bucket}/${oldPath}`,
        Key: newPath
    }));
    
    await this.delete(oldPath);
  }
}
