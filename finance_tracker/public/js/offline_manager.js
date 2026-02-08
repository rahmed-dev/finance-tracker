/**
 * Offline Manager - IndexedDB Storage for Finance Tracker PWA
 * Handles offline transaction storage, party/category caching
 */

class OfflineManager {
    constructor() {
        this.dbName = 'finance_tracker_db';
        this.version = 1;
        this.db = null;
    }

    /**
     * Initialize IndexedDB
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => {
                console.error('[OfflineManager] Failed to open IndexedDB:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('[OfflineManager] IndexedDB initialized');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                console.log('[OfflineManager] Upgrading database schema...');

                // Create transactions store
                if (!db.objectStoreNames.contains('transactions')) {
                    const transactionStore = db.createObjectStore('transactions', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    transactionStore.createIndex('sync_status', 'sync_status', { unique: false });
                    transactionStore.createIndex('date', 'date', { unique: false });
                    transactionStore.createIndex('created_at', 'created_at', { unique: false });
                    console.log('[OfflineManager] Created transactions store');
                }

                // Create cached_parties store
                if (!db.objectStoreNames.contains('cached_parties')) {
                    const partyStore = db.createObjectStore('cached_parties', { keyPath: 'id' });
                    partyStore.createIndex('party_type', 'party_type', { unique: false });
                    partyStore.createIndex('transaction_count', 'transaction_count', { unique: false });
                    console.log('[OfflineManager] Created cached_parties store');
                }

                // Create cached_categories store
                if (!db.objectStoreNames.contains('cached_categories')) {
                    const categoryStore = db.createObjectStore('cached_categories', { keyPath: 'id' });
                    categoryStore.createIndex('category_type', 'category_type', { unique: false });
                    categoryStore.createIndex('is_active', 'is_active', { unique: false });
                    console.log('[OfflineManager] Created cached_categories store');
                }

                // Create app_settings store
                if (!db.objectStoreNames.contains('app_settings')) {
                    db.createObjectStore('app_settings', { keyPath: 'key' });
                    console.log('[OfflineManager] Created app_settings store');
                }
            };
        });
    }

    /**
     * Save transaction offline
     */
    async saveTransaction(transaction) {
        transaction.sync_status = 'pending';
        transaction.created_at = new Date().toISOString();
        transaction.retry_count = 0;

        const tx = this.db.transaction(['transactions'], 'readwrite');
        const store = tx.objectStore('transactions');
        const request = store.add(transaction);

        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                const id = request.result;
                console.log('[OfflineManager] Transaction saved with ID:', id);
                resolve(id);
            };
            request.onerror = () => {
                console.error('[OfflineManager] Failed to save transaction:', request.error);
                reject(request.error);
            };
        });
    }

    /**
     * Get all pending transactions
     */
    async getPendingTransactions() {
        const tx = this.db.transaction(['transactions'], 'readonly');
        const store = tx.objectStore('transactions');
        const index = store.index('sync_status');
        const request = index.getAll('pending');

        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                console.log('[OfflineManager] Retrieved', request.result.length, 'pending transactions');
                resolve(request.result);
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Update transaction status
     */
    async updateTransactionStatus(id, status, data = {}) {
        const tx = this.db.transaction(['transactions'], 'readwrite');
        const store = tx.objectStore('transactions');
        const getRequest = store.get(id);

        return new Promise((resolve, reject) => {
            getRequest.onsuccess = () => {
                const transaction = getRequest.result;

                if (!transaction) {
                    reject(new Error('Transaction not found'));
                    return;
                }

                transaction.sync_status = status;

                if (status === 'synced') {
                    transaction.synced_at = new Date().toISOString();
                    transaction.reference_doctype = data.reference_doctype;
                    transaction.reference_name = data.reference_name;
                    transaction.sync_error = null;
                } else if (status === 'failed') {
                    transaction.sync_error = data.error;
                    transaction.retry_count = (transaction.retry_count || 0) + 1;
                }

                const putRequest = store.put(transaction);
                putRequest.onsuccess = () => {
                    console.log('[OfflineManager] Transaction status updated:', id, '→', status);
                    resolve(transaction);
                };
                putRequest.onerror = () => reject(putRequest.error);
            };
            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    /**
     * Cache parties for offline use
     */
    async cacheParties(parties) {
        const tx = this.db.transaction(['cached_parties'], 'readwrite');
        const store = tx.objectStore('cached_parties');

        // Clear old cache
        const clearRequest = store.clear();
        await new Promise(resolve => clearRequest.onsuccess = resolve);

        // Add new cache
        for (const party of parties) {
            party.cached_at = new Date().toISOString();
            await new Promise((resolve, reject) => {
                const addRequest = store.add(party);
                addRequest.onsuccess = resolve;
                addRequest.onerror = reject;
            });
        }

        console.log('[OfflineManager] Cached', parties.length, 'parties');
    }

    /**
     * Get cached parties by type
     */
    async getCachedParties(partyType) {
        const tx = this.db.transaction(['cached_parties'], 'readonly');
        const store = tx.objectStore('cached_parties');
        const index = store.index('party_type');
        const request = index.getAll(partyType);

        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Cache categories
     */
    async cacheCategories(categories) {
        const tx = this.db.transaction(['cached_categories'], 'readwrite');
        const store = tx.objectStore('cached_categories');

        // Clear old cache
        const clearRequest = store.clear();
        await new Promise(resolve => clearRequest.onsuccess = resolve);

        // Add new cache
        for (const category of categories) {
            category.cached_at = new Date().toISOString();
            await new Promise((resolve, reject) => {
                const addRequest = store.add(category);
                addRequest.onsuccess = resolve;
                addRequest.onerror = reject;
            });
        }

        console.log('[OfflineManager] Cached', categories.length, 'categories');
    }

    /**
     * Get cached categories by type
     */
    async getCachedCategories(categoryType = null) {
        const tx = this.db.transaction(['cached_categories'], 'readonly');
        const store = tx.objectStore('cached_categories');

        if (categoryType) {
            const index = store.index('category_type');
            const request = index.getAll(categoryType);
            return new Promise((resolve, reject) => {
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        } else {
            const request = store.getAll();
            return new Promise((resolve, reject) => {
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        }
    }

    /**
     * Get all transactions (for display)
     */
    async getAllTransactions(limit = 50) {
        const tx = this.db.transaction(['transactions'], 'readonly');
        const store = tx.objectStore('transactions');
        const index = store.index('created_at');
        const request = index.openCursor(null, 'prev'); // Newest first

        return new Promise((resolve, reject) => {
            const transactions = [];
            let count = 0;

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor && count < limit) {
                    transactions.push(cursor.value);
                    count++;
                    cursor.continue();
                } else {
                    resolve(transactions);
                }
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get setting value
     */
    async getSetting(key) {
        const tx = this.db.transaction(['app_settings'], 'readonly');
        const store = tx.objectStore('app_settings');
        const request = store.get(key);

        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                if (request.result) {
                    resolve(request.result.value);
                } else {
                    resolve(null);
                }
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Set setting value
     */
    async setSetting(key, value) {
        const tx = this.db.transaction(['app_settings'], 'readwrite');
        const store = tx.objectStore('app_settings');
        const request = store.put({ key, value });

        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get transaction count by status
     */
    async getTransactionCountByStatus(status) {
        const tx = this.db.transaction(['transactions'], 'readonly');
        const store = tx.objectStore('transactions');
        const index = store.index('sync_status');
        const request = index.count(status);

        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
}

// Global instance
if (typeof window !== 'undefined') {
    window.offlineManager = new OfflineManager();
    console.log('[OfflineManager] Global instance created');
}
