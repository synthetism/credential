/**
 * Storage adapter for using @synet/storage with credential storage interface
 */

import { JSONAsyncStorage, MemoryAsyncStorage } from '@synet/storage/promises';
import { MemFileSystem } from '@synet/fs/promises';
import type { W3CVerifiableCredential, CredentialStorage } from '../src/types-base';

/**
 * Adapter for JSONAsyncStorage to work with credential storage interface
 */
export class JSONCredentialStorageAdapter<T extends W3CVerifiableCredential = W3CVerifiableCredential> 
  implements CredentialStorage<T> {
  
  private storage: JSONAsyncStorage<T>;

  constructor(filePath = './credentials.json') {
    const fs = new MemFileSystem();
    this.storage = new JSONAsyncStorage(fs, filePath, {
      autosave: true,
      createBackup: true,
      prettyPrint: true,
    });
  }

  async save(credential: T): Promise<void> {
    await this.storage.create(credential);
  }

  async load(id: string): Promise<T | null> {
    return await this.storage.get(id);
  }

  async delete(id: string): Promise<void> {
    await this.storage.delete(id);
  }

  async list(): Promise<T[]> {
    return await this.storage.list();
  }

  async search(query: Record<string, unknown>): Promise<T[]> {
    return await this.storage.search(query);
  }

  async clear(): Promise<void> {
    await this.storage.clear();
  }

  async count(): Promise<number> {
    const items = await this.storage.list();
    return items.length;
  }

  async export(): Promise<T[]> {
    return await this.storage.list();
  }

  async import(credentials: T[]): Promise<void> {
    await this.storage.clear();
    for (const credential of credentials) {
      await this.storage.create(credential);
    }
  }

  async getStats(): Promise<{
    totalCredentials: number;
    credentialsByType: Record<string, number>;
    credentialsByIssuer: Record<string, number>;
  }> {
    const credentials = await this.storage.list();
    const stats = {
      totalCredentials: credentials.length,
      credentialsByType: {} as Record<string, number>,
      credentialsByIssuer: {} as Record<string, number>,
    };

    for (const credential of credentials) {
      // Count by type
      const types = credential.type.filter(t => t !== 'VerifiableCredential');
      for (const type of types) {
        stats.credentialsByType[type] = (stats.credentialsByType[type] || 0) + 1;
      }

      // Count by issuer
      const issuerId = typeof credential.issuer === 'string' ? credential.issuer : credential.issuer.id;
      stats.credentialsByIssuer[issuerId] = (stats.credentialsByIssuer[issuerId] || 0) + 1;
    }

    return stats;
  }

  async flush(): Promise<void> {
    // Storage adapter doesn't need explicit flushing since it's auto-saved
    await Promise.resolve();
  }
}

/**
 * Adapter for MemoryAsyncStorage to work with credential storage interface
 */
export class MemoryCredentialStorageAdapter<T extends W3CVerifiableCredential = W3CVerifiableCredential> 
  implements CredentialStorage<T> {
  
  private storage: MemoryAsyncStorage<T>;

  constructor() {
    this.storage = new MemoryAsyncStorage<T>();
  }

  async save(credential: T): Promise<void> {
    await this.storage.create(credential);
  }

  async load(id: string): Promise<T | null> {
    return await this.storage.get(id);
  }

  async delete(id: string): Promise<void> {
    await this.storage.delete(id);
  }

  async list(): Promise<T[]> {
    return await this.storage.list();
  }

  async search(query: Record<string, unknown>): Promise<T[]> {
    return await this.storage.search(query);
  }

  async clear(): Promise<void> {
    await this.storage.clear();
  }

  async count(): Promise<number> {
    const items = await this.storage.list();
    return items.length;
  }

  async export(): Promise<T[]> {
    return await this.storage.list();
  }

  async import(credentials: T[]): Promise<void> {
    await this.storage.clear();
    for (const credential of credentials) {
      await this.storage.create(credential);
    }
  }

  async getStats(): Promise<{
    totalCredentials: number;
    credentialsByType: Record<string, number>;
    credentialsByIssuer: Record<string, number>;
  }> {
    const credentials = await this.storage.list();
    const stats = {
      totalCredentials: credentials.length,
      credentialsByType: {} as Record<string, number>,
      credentialsByIssuer: {} as Record<string, number>,
    };

    for (const credential of credentials) {
      // Count by type
      const types = credential.type.filter(t => t !== 'VerifiableCredential');
      for (const type of types) {
        stats.credentialsByType[type] = (stats.credentialsByType[type] || 0) + 1;
      }

      // Count by issuer
      const issuerId = typeof credential.issuer === 'string' ? credential.issuer : credential.issuer.id;
      stats.credentialsByIssuer[issuerId] = (stats.credentialsByIssuer[issuerId] || 0) + 1;
    }

    return stats;
  }

  async flush(): Promise<void> {
    // Memory storage doesn't need explicit flushing
    await Promise.resolve();
  }
}
