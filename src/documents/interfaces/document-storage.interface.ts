export type StoredDocumentRef = {
  storedName: string;
  storagePath: string;
};

export type SaveDocumentInput = {
  fileBuffer: Buffer;
  extension: string;
};

export interface DocumentStorage {
  save(input: SaveDocumentInput): Promise<StoredDocumentRef>;
  read(storagePath: string): Promise<Buffer>;
  remove(storagePath: string): Promise<void>;
  exists(storagePath: string): Promise<boolean>;
}

export const DOCUMENT_STORAGE = 'DOCUMENT_STORAGE';
