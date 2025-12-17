/**
 * BackupManager - Sistema de Backup y Rollback Automático
 * Garantiza que NUNCA se pierda código original
 */

import fs from 'fs/promises';
import path from 'path';
import { createHash } from 'crypto';

export interface BackupMetadata {
  id: string;
  timestamp: number;
  files: string[];
  hash: string;
  gitCommit?: string;
}

export interface MigrationResult {
  success: boolean;
  migratedFiles: number;
  errors: string[];
  backupId: string;
}

export class BackupManager {
  private backupDir = '.osmosis-backups';
  
  /**
   * Crea un backup completo antes de migración
   */
  async createBackup(files: string[], projectRoot: string): Promise<string> {
    const timestamp = Date.now();
    const backupId = `backup-${timestamp}`;
    const backupPath = path.join(projectRoot, this.backupDir, backupId);
    
    console.log(`📦 Creando backup: ${backupId}...`);
    
    // Crear directorio de backup
    await fs.mkdir(backupPath, { recursive: true });
    
    // Copiar cada archivo
    for (const file of files) {
      const relativePath = path.relative(projectRoot, file);
      const backupFilePath = path.join(backupPath, relativePath);
      
      // Crear subdirectorios si es necesario
      await fs.mkdir(path.dirname(backupFilePath), { recursive: true });
      
      // Copiar archivo
      await fs.copyFile(file, backupFilePath);
    }
    
    // Guardar metadata
    const metadata: BackupMetadata = {
      id: backupId,
      timestamp,
      files: files.map(f => path.relative(projectRoot, f)),
      hash: await this.calculateBackupHash(backupPath),
      gitCommit: await this.getGitCommit(projectRoot)
    };
    
    await fs.writeFile(
      path.join(backupPath, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );
    
    console.log(`✅ Backup creado: ${backupId}`);
    console.log(`   Archivos: ${files.length}`);
    console.log(`   Ubicación: ${backupPath}`);
    
    return backupId;
  }
  
  /**
   * Rollback: Restaura archivos desde backup
   */
  async rollback(backupId: string, projectRoot: string): Promise<void> {
    const backupPath = path.join(projectRoot, this.backupDir, backupId);
    
    console.log(`⏮️  Iniciando rollback desde: ${backupId}...`);
    
    // Verificar que el backup existe
    if (!await this.backupExists(backupId, projectRoot)) {
      throw new Error(`Backup ${backupId} no encontrado`);
    }
    
    // Leer metadata
    const metadata = await this.getBackupMetadata(backupId, projectRoot);
    
    // Restaurar cada archivo
    for (const relativeFile of metadata.files) {
      const backupFilePath = path.join(backupPath, relativeFile);
      const originalFilePath = path.join(projectRoot, relativeFile);
      
      // Restaurar archivo
      await fs.copyFile(backupFilePath, originalFilePath);
      console.log(`   ✅ Restaurado: ${relativeFile}`);
    }
    
    console.log(`✅ Rollback completado. ${metadata.files.length} archivos restaurados.`);
  }
  
  /**
   * Migración segura con backup automático
   */
  async safeMigrate(
    files: string[],
    projectRoot: string,
    migrationFn: () => Promise<void>
  ): Promise<MigrationResult> {
    let backupId: string | null = null;
    const errors: string[] = [];
    
    try {
      // 1. BACKUP
      backupId = await this.createBackup(files, projectRoot);
      
      // 2. MIGRACIÓN
      console.log('\n🚀 Iniciando migración...');
      await migrationFn();
      
      console.log('✅ Migración completada exitosamente\n');
      
      return {
        success: true,
        migratedFiles: files.length,
        errors: [],
        backupId
      };
      
    } catch (error) {
      // 3. ROLLBACK si algo falla
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(errorMsg);
      
      console.error(`\n❌ Migración falló: ${errorMsg}`);
      
      if (backupId) {
        console.log('\n⏮️  Ejecutando rollback automático...');
        await this.rollback(backupId, projectRoot);
        console.log('✅ Archivos originales restaurados\n');
      }
      
      return {
        success: false,
        migratedFiles: 0,
        errors,
        backupId: backupId || 'none'
      };
    }
  }
  
  /**
   * Lista todos los backups disponibles
   */
  async listBackups(projectRoot: string): Promise<BackupMetadata[]> {
    const backupsPath = path.join(projectRoot, this.backupDir);
    
    try {
      const entries = await fs.readdir(backupsPath);
      const backups: BackupMetadata[] = [];
      
      for (const entry of entries) {
        const metadataPath = path.join(backupsPath, entry, 'metadata.json');
        try {
          const content = await fs.readFile(metadataPath, 'utf-8');
          backups.push(JSON.parse(content));
        } catch {
          // Skip si no hay metadata
        }
      }
      
      return backups.sort((a, b) => b.timestamp - a.timestamp);
    } catch {
      return [];
    }
  }
  
  /**
   * Limpia backups antiguos (mantener últimos N)
   */
  async cleanOldBackups(projectRoot: string, keepLast = 10): Promise<void> {
    const backups = await this.listBackups(projectRoot);
    
    if (backups.length <= keepLast) {
      return;
    }
    
    const toDelete = backups.slice(keepLast);
    
    console.log(`🗑️  Limpiando ${toDelete.length} backups antiguos...`);
    
    for (const backup of toDelete) {
      const backupPath = path.join(projectRoot, this.backupDir, backup.id);
      await fs.rm(backupPath, { recursive: true, force: true });
      console.log(`   Eliminado: ${backup.id}`);
    }
    
    console.log('✅ Limpieza completada');
  }
  
  // Helpers privados
  
  private async backupExists(backupId: string, projectRoot: string): Promise<boolean> {
    try {
      const backupPath = path.join(projectRoot, this.backupDir, backupId);
      await fs.access(backupPath);
      return true;
    } catch {
      return false;
    }
  }
  
  private async getBackupMetadata(backupId: string, projectRoot: string): Promise<BackupMetadata> {
    const metadataPath = path.join(projectRoot, this.backupDir, backupId, 'metadata.json');
    const content = await fs.readFile(metadataPath, 'utf-8');
    return JSON.parse(content);
  }
  
  private async calculateBackupHash(backupPath: string): Promise<string> {
    const hash = createHash('sha256');
    
    async function hashDir(dir: string) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          await hashDir(fullPath);
        } else if (entry.isFile() && entry.name !== 'metadata.json') {
          const content = await fs.readFile(fullPath);
          hash.update(content);
        }
      }
    }
    
    await hashDir(backupPath);
    return hash.digest('hex');
  }
  
  private async getGitCommit(projectRoot: string): Promise<string | undefined> {
    try {
      const { execSync } = await import('child_process');
      const commit = execSync('git rev-parse HEAD', {
        cwd: projectRoot,
        encoding: 'utf-8'
      }).trim();
      return commit;
    } catch {
      return undefined;
    }
  }
}

// Export singleton
export const backupManager = new BackupManager();


