import { useState, useRef } from 'react';
import { backupManager } from '@/lib/backup';
import type { BackupData } from '@/lib/backup';

interface BackupManagerProps {
  className?: string;
}

export default function BackupManager({ className = '' }: BackupManagerProps): JSX.Element {
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState<'export' | 'import' | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localBackups, setLocalBackups] = useState<Array<{ key: string; date: Date; metadata: BackupData['metadata'] }>>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingFile = useRef<File | null>(null);

  const loadLocalBackups = async () => {
    setIsLoadingBackups(true);
    try {
      const backups = await backupManager.getLocalBackups();
      setLocalBackups(backups);
    } catch (err) {
      console.error('Failed to load local backups:', err);
    } finally {
      setIsLoadingBackups(false);
    }
  };

  const handleExportBackup = (encrypted: boolean = false) => {
    if (encrypted) {
      setShowPasswordModal('export');
    } else {
      performExport();
    }
  };

  const performExport = async (password?: string) => {
    setIsCreatingBackup(true);
    setError(null);
    
    try {
      await backupManager.exportBackup(password);
      setShowPasswordModal(null);
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create backup');
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    pendingFile.current = file;
    
    // Try to detect if it's encrypted by reading the first part
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content.substring(0, 500)); // Read first 500 chars
        
        if (parsed.algorithm && parsed.iv && parsed.data) {
          // Encrypted backup
          setShowPasswordModal('import');
        } else {
          // Unencrypted backup
          performImport();
        }
      } catch {
        setError('Invalid backup file format');
      }
    };
    reader.readAsText(file.slice(0, 500));
  };

  const performImport = async (password?: string) => {
    if (!pendingFile.current) return;

    setIsImporting(true);
    setError(null);
    
    try {
      await backupManager.importBackup(pendingFile.current, password);
      setShowPasswordModal(null);
      setPassword('');
      setConfirmPassword('');
      pendingFile.current = null;
      
      // Refresh local backups
      await loadLocalBackups();
      
      alert('Backup imported successfully! The page will reload to apply changes.');
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import backup');
    } finally {
      setIsImporting(false);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (showPasswordModal === 'export') {
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      if (password.length < 8) {
        setError('Password must be at least 8 characters long');
        return;
      }
      performExport(password);
    } else if (showPasswordModal === 'import') {
      performImport(password);
    }
  };

  const handleRestoreLocal = async (backupKey: string) => {
    if (!confirm('This will replace all current data with the backup. Are you sure?')) {
      return;
    }

    try {
      await backupManager.restoreLocalBackup(backupKey);
      alert('Backup restored successfully! The page will reload to apply changes.');
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore backup');
    }
  };

  const handleCreateAutoBackup = async () => {
    try {
      await backupManager.createAutoBackup();
      await loadLocalBackups();
      alert('Auto backup created successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create auto backup');
    }
  };

  // Load local backups on mount
  useState(() => {
    loadLocalBackups();
  });

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          Backup & Restore
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Export your data or restore from a previous backup
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Error Display */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
              <div className="ml-auto pl-3">
                <button
                  onClick={() => setError(null)}
                  className="text-red-400 hover:text-red-600 dark:hover:text-red-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Export Section */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
            Export Data
          </h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => handleExportBackup(false)}
              disabled={isCreatingBackup}
              className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreatingBackup ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export Unencrypted
                </>
              )}
            </button>

            <button
              onClick={() => handleExportBackup(true)}
              disabled={isCreatingBackup}
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreatingBackup ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Export Encrypted
                </>
              )}
            </button>
          </div>
          
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Encrypted backups are recommended for sensitive data. You'll need the password to restore.
          </p>
        </div>

        {/* Import Section */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
            Import Data
          </h4>
          
          <div className="flex items-center justify-center w-full">
            <label htmlFor="backup-file" className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <svg className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  JSON backup files only
                </p>
              </div>
              <input
                ref={fileInputRef}
                id="backup-file"
                type="file"
                accept=".json"
                onChange={handleImportFile}
                disabled={isImporting}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Local Backups */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Local Auto Backups
            </h4>
            <button
              onClick={handleCreateAutoBackup}
              className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200"
            >
              Create Now
            </button>
          </div>
          
          {isLoadingBackups ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
              ))}
            </div>
          ) : localBackups.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 009.586 13H7" />
              </svg>
              <p className="text-sm">No local backups found</p>
              <p className="text-xs mt-1">Auto backups will appear here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {localBackups.map((backup) => (
                <div key={backup.key} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {backup.date.toLocaleDateString()} at {backup.date.toLocaleTimeString()}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {backup.metadata.totalExpenses} expenses, {backup.metadata.totalCategories} categories
                    </div>
                  </div>
                  <button
                    onClick={() => handleRestoreLocal(backup.key)}
                    className="ml-4 text-xs text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200 font-medium"
                  >
                    Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
              {showPasswordModal === 'export' ? 'Encrypt Backup' : 'Decrypt Backup'}
            </h3>
            
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-gray-100 sm:text-sm"
                  placeholder={showPasswordModal === 'export' ? 'Enter a strong password' : 'Enter backup password'}
                  required
                  minLength={showPasswordModal === 'export' ? 8 : undefined}
                />
              </div>
              
              {showPasswordModal === 'export' && (
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-gray-100 sm:text-sm"
                    placeholder="Confirm your password"
                    required
                    minLength={8}
                  />
                </div>
              )}
              
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {showPasswordModal === 'export' ? (
                  <>
                    <p>• Use at least 8 characters</p>
                    <p>• Remember this password - it cannot be recovered</p>
                  </>
                ) : (
                  <p>Enter the password used to encrypt this backup</p>
                )}
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(null);
                    setPassword('');
                    setConfirmPassword('');
                    pendingFile.current = null;
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingBackup || isImporting}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {showPasswordModal === 'export' ? 'Create Backup' : 'Import Backup'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
