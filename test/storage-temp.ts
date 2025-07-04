/**
 * Simple JSON-based storage for verifiable credentials
 * 
 * This module provides a basic file-based storage implementation for
 * verifiable credentials using JSON files. It's designed to be simple,
 * dependency-free, and suitable for development and testing.
 * 
 * Features:
 * - JSON file-based storage
 * - Type-safe credential handling
 * - Search and filtering capabilities
 * - Thread-safe operations
 * - Automatic backup and recovery
 * 
 * @author Synet Team
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { W3CVerifiableCredential, BaseCredentialSubject, CredentialStorage } from '../src/types-base';

/**
 * JSON file-based credential storage
 */
export class JSONCredentialStorage<T extends W3CVerifiableCredential = W3CVerifiableCredential> 
  implements CredentialStorage<T> {
  
  private readonly storageFile: string;
  private readonly backupFile: string;
  private credentials: Map<string, T> = new Map();
  private lastSaveTime= 0;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor(
    storageFile = './credentials.json',
    private readonly autosave: boolean = true,
    private readonly autosaveDelay: number = 1000,
  ) {
    this.storageFile = path.resolve(storageFile);
    this.backupFile = `${this.storageFile}.backup`;
    this.loadFromFile();
  }

  /**
   * Load credentials from JSON file
   */
  private loadFromFile(): void {
    try {
      if (fs.existsSync(this.storageFile)) {
        const data = fs.readFileSync(this.storageFile, 'utf8');
        const credentialData = JSON.parse(data);
        
        // Convert object to Map
        this.credentials = new Map();
        for (const [id, credential] of Object.entries(credentialData)) {
          this.credentials.set(id, credential as T);
        }
      } else {
        this.credentials = new Map();
      }
    } catch (error) {
      console.warn(`Failed to load credentials from ${this.storageFile}:`, error);
      
      // Try to load from backup
      if (fs.existsSync(this.backupFile)) {
        try {
          const backupData = fs.readFileSync(this.backupFile, 'utf8');
          const credentialData = JSON.parse(backupData);
          
          this.credentials = new Map();
          for (const [id, credential] of Object.entries(credentialData)) {
            this.credentials.set(id, credential as T);
          }
          
          console.log(`Loaded credentials from backup file: ${this.backupFile}`);
        } catch (backupError) {
          console.error('Failed to load backup file:', backupError);
          this.credentials = new Map();
        }
      } else {
        this.credentials = new Map();
      }
    }
  }

  /**
   * Save credentials to JSON file
   */
  private saveToFile(): void {
    try {
      // Create backup before saving
      if (fs.existsSync(this.storageFile)) {
        fs.copyFileSync(this.storageFile, this.backupFile);
      }

      // Convert Map to object
      const credentialData: Record<string, T> = {};
      for (const [id, credential] of this.credentials.entries()) {
        credentialData[id] = credential;
      }

      // Ensure directory exists
      const dir = path.dirname(this.storageFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Write to file
      fs.writeFileSync(this.storageFile, JSON.stringify(credentialData, null, 2), 'utf8');
      this.lastSaveTime = Date.now();
    } catch (error) {
      console.error(`Failed to save credentials to ${this.storageFile}:`, error);
      throw error;
    }
  }

  /**
   * Schedule autosave if enabled
   */
  private scheduleAutosave(): void {
    if (!this.autosave) return;

    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = setTimeout(() => {
      this.saveToFile();
      this.saveTimeout = null;
    }, this.autosaveDelay);
  }

  /**
   * Save a credential
   */
  async save(credential: T): Promise<void> {
    if (!credential.id) {
      throw new Error('Credential must have an ID');
    }

    this.credentials.set(credential.id, credential);
    this.scheduleAutosave();
  }

  /**
   * Load a credential by ID
   */
  async load(id: string): Promise<T | null> {
    return this.credentials.get(id) || null;
  }

  /**
   * Delete a credential by ID
   */
  async delete(id: string): Promise<void> {
    const deleted = this.credentials.delete(id);
    if (deleted) {
      this.scheduleAutosave();
    }
  }

  /**
   * List all credentials
   */
  async list(): Promise<T[]> {
    return Array.from(this.credentials.values());
  }

  /**
   * Search credentials by criteria
   */
  async search(query: Record<string, unknown>): Promise<T[]> {
    const results: T[] = [];
    
    for (const credential of this.credentials.values()) {
      let matches = true;
      
      for (const [key, value] of Object.entries(query)) {
        if (!this.matchesQuery(credential, key, value)) {
          matches = false;
          break;
        }
      }
      
      if (matches) {
        results.push(credential);
      }
    }
    
    return results;
  }

  /**
   * Check if a credential matches a query
   */
  private matchesQuery(credential: T, key: string, value: unknown): boolean {
    try {
      const credentialValue = this.getNestedValue(credential, key);
      
      if (credentialValue === undefined) {
        return false;
      }
      
      // Handle different types of matching
      if (typeof value === 'string' && typeof credentialValue === 'string') {
        return credentialValue.toLowerCase().includes(value.toLowerCase());
      }
      
      if (Array.isArray(value) && Array.isArray(credentialValue)) {
        return value.some(v => credentialValue.includes(v));
      }
      
      if (Array.isArray(credentialValue) && !Array.isArray(value)) {
        return credentialValue.includes(value);
      }
      
      return credentialValue === value;
    } catch (error) {
      console.warn(`Error matching query ${key}:`, error);
      return false;
    }
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): unknown {
    return path.split('.').reduce((current, key) => {
      return current && typeof current === 'object' ? current[key] : undefined;
    }, obj);
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<{
    totalCredentials: number;
    fileSize: number;
    lastSaved: number;
    types: Record<string, number>;
    issuers: Record<string, number>;
  }> {
    const stats = {
      totalCredentials: this.credentials.size,
      fileSize: 0,
      lastSaved: this.lastSaveTime,
      types: {} as Record<string, number>,
      issuers: {} as Record<string, number>,
    };

    try {
      if (fs.existsSync(this.storageFile)) {
        const fileStats = fs.statSync(this.storageFile);
        stats.fileSize = fileStats.size;
      }
    } catch (error) {
      console.warn('Failed to get file stats:', error);
    }

    // Analyze credential types and issuers
    for (const credential of this.credentials.values()) {
      // Count types
      if (credential.type && Array.isArray(credential.type)) {
        for (const type of credential.type) {
          if (type !== 'VerifiableCredential') {
            stats.types[type] = (stats.types[type] || 0) + 1;
          }
        }
      }

      // Count issuers
      if (credential.issuer?.id) {
        stats.issuers[credential.issuer.id] = (stats.issuers[credential.issuer.id] || 0) + 1;
      }
    }

    return stats;
  }

  /**
   * Manually save all credentials to file
   */
  async flush(): Promise<void> {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    this.saveToFile();
  }

  /**
   * Clear all credentials
   */
  async clear(): Promise<void> {
    this.credentials.clear();
    this.scheduleAutosave();
  }

  /**
   * Check if a credential exists
   */
  async exists(id: string): Promise<boolean> {
    return this.credentials.has(id);
  }

  /**
   * Get credential count
   */
  async count(): Promise<number> {
    return this.credentials.size;
  }

  /**
   * Import credentials from another storage file
   */
  async import(sourceFile: string, overwrite: boolean | false): Promise<number> {
    try {
      if (!fs.existsSync(sourceFile)) {
        throw new Error(`Source file does not exist: ${sourceFile}`);
      }

      const data = fs.readFileSync(sourceFile, 'utf8');
      const credentialData = JSON.parse(data);
      
      let importedCount = 0;
      
      for (const [id, credential] of Object.entries(credentialData)) {
        if (overwrite || !this.credentials.has(id)) {
          this.credentials.set(id, credential as T);
          importedCount++;
        }
      }
      
      if (importedCount > 0) {
        this.scheduleAutosave();
      }
      
      return importedCount;
    } catch (error) {
      throw new Error(`Failed to import credentials: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Export credentials to another file
   */
  async export(targetFile: string, filter?: (credential: T) => boolean): Promise<number> {
    try {
      let credentialsToExport = Array.from(this.credentials.values());
      
      if (filter) {
        credentialsToExport = credentialsToExport.filter(filter);
      }
      
      const exportData: Record<string, T> = {};
      for (const credential of credentialsToExport) {
        exportData[credential.id] = credential;
      }
      
      const targetDir = path.dirname(targetFile);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      
      fs.writeFileSync(targetFile, JSON.stringify(exportData, null, 2), 'utf8');
      
      return credentialsToExport.length;
    } catch (error) {
      throw new Error(`Failed to export credentials: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Cleanup method - call this when shutting down
   */
  async cleanup(): Promise<void> {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    
    // Final save
    this.saveToFile();
  }
}

/**
 * In-memory credential storage (for testing)
 */
export class MemoryCredentialStorage<T extends W3CVerifiableCredential = W3CVerifiableCredential> 
  implements CredentialStorage<T> {
  
  private credentials: Map<string, T> = new Map();

  async save(credential: T): Promise<void> {
    if (!credential.id) {
      throw new Error('Credential must have an ID');
    }
    this.credentials.set(credential.id, credential);
  }

  async load(id: string): Promise<T | null> {
    return this.credentials.get(id) || null;
  }

  async delete(id: string): Promise<void> {
    this.credentials.delete(id);
  }

  async list(): Promise<T[]> {
    return Array.from(this.credentials.values());
  }

  async search(query: Record<string, unknown>): Promise<T[]> {
    const results: T[] = [];
    
    for (const credential of this.credentials.values()) {
      let matches = true;
      
      for (const [key, value] of Object.entries(query)) {
        const credentialValue = this.getNestedValue(credential, key);
        if (credentialValue !== value) {
          matches = false;
          break;
        }
      }
      
      if (matches) {
        results.push(credential);
      }
    }
    
    return results;
  }

  private getNestedValue(obj: any, path: string): unknown {
    return path.split('.').reduce((current, key) => {
      return current && typeof current === 'object' ? current[key] : undefined;
    }, obj);
  }

  async clear(): Promise<void> {
    this.credentials.clear();
  }

  async count(): Promise<number> {
    return this.credentials.size;
  }
}

export default JSONCredentialStorage;
