/**
 * Sync Manager - Background Sync for Finance Tracker PWA
 * Handles offline transaction syncing to ERPNext
 */

class SyncManager {
    constructor(offlineManager) {
        this.offlineManager = offlineManager;
        this.isSyncing = false;
        this.syncInProgress = new Set();
    }

    /**
     * Register background sync
     */
    async registerSync() {
        if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
            try {
                const registration = await navigator.serviceWorker.ready;
                await registration.sync.register('sync-transactions');
                console.log('[SyncManager] Background sync registered');
            } catch (error) {
                console.error('[SyncManager] Sync registration failed:', error);
                // Fallback: Manual sync
                this.syncAll();
            }
        } else {
            console.log('[SyncManager] Background Sync not supported, using manual sync');
            this.syncAll();
        }
    }

    /**
     * Sync all pending transactions
     */
    async syncAll() {
        if (this.isSyncing) {
            console.log('[SyncManager] Sync already in progress');
            return;
        }

        if (!navigator.onLine) {
            console.log('[SyncManager] Offline, skipping sync');
            return;
        }

        this.isSyncing = true;
        console.log('[SyncManager] Starting sync...');

        try {
            const pending = await this.offlineManager.getPendingTransactions();
            console.log('[SyncManager] Found', pending.length, 'pending transactions');

            for (const transaction of pending) {
                if (this.syncInProgress.has(transaction.id)) {
                    continue; // Already syncing
                }

                await this.syncTransaction(transaction);
            }

            console.log('[SyncManager] Sync completed');

            // Show notification
            this.showSyncNotification('success', `Synced ${pending.length} transactions`);

        } catch (error) {
            console.error('[SyncManager] Sync failed:', error);
            this.showSyncNotification('error', 'Sync failed');
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Sync single transaction
     */
    async syncTransaction(transaction) {
        this.syncInProgress.add(transaction.id);

        try {
            console.log('[SyncManager] Syncing transaction:', transaction.id);

            // Update status to syncing
            await this.offlineManager.updateTransactionStatus(transaction.id, 'syncing');

            // Upload photo first if exists
            let receipt_image_url = null;
            if (transaction.receipt_image_blob) {
                receipt_image_url = await this.uploadPhoto(
                    transaction.receipt_image_blob,
                    transaction.receipt_image_name
                );
            }

            // Prepare data for sync
            const syncData = {
                transaction_type: transaction.transaction_type,
                date: transaction.date,
                category: transaction.category_id,
                amount: transaction.amount,
                customer: transaction.customer_id || null,
                supplier: transaction.supplier_id || null,
                payment_account: transaction.payment_account_id,
                tax_amount: transaction.tax_amount || 0,
                description: transaction.description || '',
                receipt_image: receipt_image_url,
                tags: transaction.tags || ''
            };

            // Call server sync endpoint
            const result = await frappe.call({
                method: 'finance_tracker.sync_engine.sync_transaction_to_erpnext',
                args: { transaction_data: syncData },
                freeze: false
            });

            if (result.message && result.message.status === 'success') {
                // Mark as synced
                await this.offlineManager.updateTransactionStatus(transaction.id, 'synced', {
                    reference_doctype: result.message.reference_doctype,
                    reference_name: result.message.reference_name
                });

                console.log('[SyncManager] Transaction synced:', transaction.id, '→', result.message.reference_name);

                // Show success notification
                this.showSyncNotification('success', `Synced: ${result.message.reference_name}`);
            } else {
                throw new Error(result.message?.error || 'Sync failed');
            }
        } catch (error) {
            console.error('[SyncManager] Transaction sync failed:', error);

            // Mark as failed
            await this.offlineManager.updateTransactionStatus(transaction.id, 'failed', {
                error: error.message
            });

            // Retry logic (exponential backoff)
            if (transaction.retry_count < 3) {
                const delay = Math.pow(2, transaction.retry_count) * 1000; // 1s, 2s, 4s
                console.log(`[SyncManager] Will retry in ${delay}ms`);
                setTimeout(() => {
                    this.syncTransaction(transaction);
                }, delay);
            } else {
                console.error('[SyncManager] Max retries exceeded for transaction:', transaction.id);
                this.showSyncNotification('error', `Sync failed: ${error.message}`);
            }
        } finally {
            this.syncInProgress.delete(transaction.id);
        }
    }

    /**
     * Upload photo to ERPNext
     */
    async uploadPhoto(blob, filename) {
        const formData = new FormData();
        formData.append('file', blob, filename);
        formData.append('is_private', 0);
        formData.append('folder', 'Home/Attachments');

        const response = await fetch('/api/method/upload_file', {
            method: 'POST',
            body: formData,
            headers: {
                'X-Frappe-CSRF-Token': frappe.csrf_token
            }
        });

        if (!response.ok) {
            throw new Error('Photo upload failed');
        }

        const data = await response.json();
        return data.message.file_url;
    }

    /**
     * Show sync notification
     */
    showSyncNotification(type, message) {
        if (typeof frappe !== 'undefined' && frappe.show_alert) {
            frappe.show_alert({
                message: message,
                indicator: type === 'success' ? 'green' : 'red'
            }, 3);
        } else {
            console.log(`[SyncManager] ${type.toUpperCase()}: ${message}`);
        }
    }

    /**
     * Start periodic sync (every 5 minutes when online)
     */
    startPeriodicSync() {
        setInterval(() => {
            if (navigator.onLine && !this.isSyncing) {
                console.log('[SyncManager] Periodic sync triggered');
                this.syncAll();
            }
        }, 5 * 60 * 1000); // 5 minutes
    }
}

// Initialize when online
if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
        console.log('[SyncManager] Online, triggering sync');
        if (window.syncManager) {
            window.syncManager.syncAll();
        }
    });

    window.addEventListener('offline', () => {
        console.log('[SyncManager] Offline mode');
    });

    // Create global instance
    window.syncManager = new SyncManager(window.offlineManager);
    console.log('[SyncManager] Global instance created');
}
