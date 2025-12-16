/**
 * AuditLogger - Registro Inmutable de Auditoría
 * Logs completos de todas las operaciones para compliance
 */

import fs from 'fs/promises';
import path from 'path';
import { createHash } from 'crypto';

export type AuditEventType =
  | 'ANALYSIS_STARTED'
  | 'ANALYSIS_COMPLETED'
  | 'MIGRATION_STARTED'
  | 'MIGRATION_COMPLETED'
  | 'MIGRATION_FAILED'
  | 'BACKUP_CREATED'
  | 'ROLLBACK_EXECUTED'
  | 'VALIDATION_PASSED'
  | 'VALIDATION_FAILED'
  | 'FILE_MODIFIED'
  | 'SECURITY_ALERT';

export interface AuditEvent {
  type: AuditEventType;
  timestamp: string;
  user?: string;
  files?: string[];
  backupId?: string;
  error?: string;
  metadata?: Record<string, any>;
}

export interface AuditLogEntry extends AuditEvent {
  id: string;
  hash: string;
  previousHash?: string;
}

export class AuditLogger {
  private logFile = '.osmosis-audit.log';
  private previousHash?: string;
  
  /**
   * Registra un evento en el audit log
   */
  async log(event: AuditEvent, projectRoot: string): Promise<void> {
    const logPath = path.join(projectRoot, this.logFile);
    
    // Crear entrada con hash inmutable
    const entry: AuditLogEntry = {
      ...event,
      id: this.generateId(),
      timestamp: event.timestamp || new Date().toISOString(),
      hash: '',
      previousHash: this.previousHash
    };
    
    // Calcular hash de la entrada (sin incluir el hash mismo)
    const entryForHash = { ...entry };
    delete entryForHash.hash;
    entry.hash = this.calculateHash(JSON.stringify(entryForHash));
    
    // Actualizar previousHash para siguiente entrada
    this.previousHash = entry.hash;
    
    // Sanitizar datos sensibles
    const sanitized = this.sanitize(entry);
    
    // Append to log
    const logLine = JSON.stringify(sanitized) + '\n';
    await fs.appendFile(logPath, logLine);
    
    // También log a console en desarrollo
    if (process.env.NODE_ENV !== 'production') {
      this.consoleLog(entry);
    }
  }
  
  /**
   * Lee el audit log completo
   */
  async readLog(projectRoot: string): Promise<AuditLogEntry[]> {
    const logPath = path.join(projectRoot, this.logFile);
    
    try {
      const content = await fs.readFile(logPath, 'utf-8');
      const lines = content.trim().split('\n').filter(l => l);
      return lines.map(line => JSON.parse(line));
    } catch {
      return [];
    }
  }
  
  /**
   * Verifica integridad del audit log (chain of hashes)
   */
  async verifyIntegrity(projectRoot: string): Promise<{ valid: boolean; errors: string[] }> {
    const entries = await this.readLog(projectRoot);
    const errors: string[] = [];
    
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      
      // Verificar hash de la entrada
      const entryForHash = { ...entry };
      delete entryForHash.hash;
      const expectedHash = this.calculateHash(JSON.stringify(entryForHash));
      
      if (entry.hash !== expectedHash) {
        errors.push(`Entry ${i} hash mismatch`);
      }
      
      // Verificar chain (excepto primera entrada)
      if (i > 0) {
        const previousEntry = entries[i - 1];
        if (entry.previousHash !== previousEntry.hash) {
          errors.push(`Entry ${i} chain broken`);
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Genera reporte de auditoría
   */
  async generateReport(projectRoot: string, format: 'json' | 'html' = 'json'): Promise<string> {
    const entries = await this.readLog(projectRoot);
    
    if (format === 'json') {
      return JSON.stringify({
        totalEvents: entries.length,
        firstEvent: entries[0]?.timestamp,
        lastEvent: entries[entries.length - 1]?.timestamp,
        events: entries,
        integrity: await this.verifyIntegrity(projectRoot)
      }, null, 2);
    }
    
    // HTML Report
    return this.generateHTMLReport(entries, await this.verifyIntegrity(projectRoot));
  }
  
  /**
   * Helper methods privados
   */
  
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private calculateHash(data: string): string {
    return createHash('sha256').update(data).digest('hex');
  }
  
  private sanitize(entry: AuditLogEntry): AuditLogEntry {
    const sanitized = { ...entry };
    
    // Remover paths absolutos (solo nombres de archivo)
    if (sanitized.files) {
      sanitized.files = sanitized.files.map(f => path.basename(f));
    }
    
    // Remover datos potencialmente sensibles
    if (sanitized.metadata) {
      const cleaned = { ...sanitized.metadata };
      delete cleaned.password;
      delete cleaned.apiKey;
      delete cleaned.token;
      delete cleaned.secret;
      sanitized.metadata = cleaned;
    }
    
    return sanitized;
  }
  
  private consoleLog(entry: AuditLogEntry): void {
    const emoji = this.getEmoji(entry.type);
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    
    console.log(`${emoji} [${timestamp}] ${entry.type}`);
    
    if (entry.files && entry.files.length > 0) {
      console.log(`   Files: ${entry.files.map(f => path.basename(f)).join(', ')}`);
    }
    
    if (entry.backupId) {
      console.log(`   Backup: ${entry.backupId}`);
    }
    
    if (entry.error) {
      console.log(`   Error: ${entry.error}`);
    }
  }
  
  private getEmoji(type: AuditEventType): string {
    const emojis: Record<AuditEventType, string> = {
      'ANALYSIS_STARTED': '🔍',
      'ANALYSIS_COMPLETED': '✅',
      'MIGRATION_STARTED': '🚀',
      'MIGRATION_COMPLETED': '✅',
      'MIGRATION_FAILED': '❌',
      'BACKUP_CREATED': '📦',
      'ROLLBACK_EXECUTED': '⏮️',
      'VALIDATION_PASSED': '✅',
      'VALIDATION_FAILED': '❌',
      'FILE_MODIFIED': '📝',
      'SECURITY_ALERT': '🚨'
    };
    
    return emojis[type] || '📋';
  }
  
  private generateHTMLReport(entries: AuditLogEntry[], integrity: { valid: boolean; errors: string[] }): string {
    return `<!DOCTYPE html>
<html>
<head>
  <title>Osmosis Audit Report</title>
  <style>
    body { font-family: 'Inter', sans-serif; max-width: 1200px; margin: 0 auto; padding: 2rem; }
    h1 { color: #667eea; }
    .integrity { padding: 1rem; border-radius: 8px; margin-bottom: 2rem; }
    .integrity.valid { background: #d1fae5; color: #065f46; }
    .integrity.invalid { background: #fee2e2; color: #991b1b; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 0.75rem; border-bottom: 1px solid #e5e7eb; }
    th { background: #f3f4f6; font-weight: 600; }
    .event-type { font-weight: 600; color: #667eea; }
  </style>
</head>
<body>
  <h1>🔒 Osmosis Audit Report</h1>
  
  <div class="integrity ${integrity.valid ? 'valid' : 'invalid'}">
    <h3>Integrity Check: ${integrity.valid ? '✅ VALID' : '❌ INVALID'}</h3>
    ${integrity.errors.length > 0 ? `<ul>${integrity.errors.map(e => `<li>${e}</li>`).join('')}</ul>` : ''}
  </div>
  
  <h2>Events (${entries.length} total)</h2>
  <table>
    <thead>
      <tr>
        <th>Timestamp</th>
        <th>Event</th>
        <th>Files</th>
        <th>Backup ID</th>
      </tr>
    </thead>
    <tbody>
      ${entries.map(e => `
        <tr>
          <td>${new Date(e.timestamp).toLocaleString()}</td>
          <td class="event-type">${e.type}</td>
          <td>${e.files ? e.files.length : '-'}</td>
          <td>${e.backupId || '-'}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  
  <p style="margin-top: 2rem; color: #6b7280; font-size: 0.875rem;">
    Generated: ${new Date().toISOString()}<br>
    Total Events: ${entries.length}<br>
    First Event: ${entries[0]?.timestamp || 'N/A'}<br>
    Last Event: ${entries[entries.length - 1]?.timestamp || 'N/A'}
  </p>
</body>
</html>`;
  }
}

// Export singleton
export const auditLogger = new AuditLogger();

