/**
 * Finance Tracker PWA - Main Dashboard UI Logic
 * Handles transaction list, form modal, sync status, pull-to-refresh
 */

class TrackerUI {
    constructor() {
        this.currentType = 'Expense';
        this.selectedPhoto = null;
        this.pullStartY = 0;
        this.pullThreshold = 80;
        this.isPulling = false;
    }

    /**
     * Initialize the tracker UI
     */
    async init() {
        console.log('[TrackerUI] Initializing...');

        // Initialize offline manager
        try {
            await window.offlineManager.init();
            console.log('[TrackerUI] OfflineManager initialized');
        } catch (error) {
            console.error('[TrackerUI] Failed to initialize OfflineManager:', error);
            this.showError('Failed to initialize database');
            return;
        }

        // Setup event listeners
        this.setupEventListeners();

        // Setup pull-to-refresh
        this.setupPullToRefresh();

        // Update sync status
        await this.updateSyncStatus();

        // Load transactions
        await this.loadTransactions();

        // Check network status
        this.updateNetworkStatus();
        window.addEventListener('online', () => this.updateNetworkStatus());
        window.addEventListener('offline', () => this.updateNetworkStatus());

        console.log('[TrackerUI] Initialization complete');
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // FAB button - open modal
        document.getElementById('addTransactionBtn').addEventListener('click', () => {
            this.openTransactionModal();
        });

        // Modal buttons
        document.getElementById('cancelBtn').addEventListener('click', () => {
            this.closeTransactionModal();
        });

        document.getElementById('saveBtn').addEventListener('click', () => {
            this.saveTransaction();
        });

        // Transaction type buttons
        document.querySelectorAll('.type-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectType(e.target.dataset.type);
            });
        });

        // Photo upload
        document.getElementById('photoBtn').addEventListener('click', () => {
            document.getElementById('photoInput').click();
        });

        document.getElementById('photoInput').addEventListener('change', (e) => {
            this.handlePhotoSelection(e);
        });

        document.getElementById('removePhotoBtn').addEventListener('click', () => {
            this.removePhoto();
        });

        // Category selection
        document.getElementById('categoryInput').addEventListener('click', () => {
            this.showCategorySelector();
        });

        // Set default date to today
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('dateInput').value = today;
    }

    /**
     * Show category selector (simple prompt for now)
     */
    showCategorySelector() {
        // Predefined categories for testing
        const categories = {
            'Expense': ['Food & Dining', 'Transportation', 'Shopping', 'Bills & Utilities', 'Entertainment', 'Healthcare', 'Other'],
            'Income': ['Salary', 'Freelance', 'Investment', 'Gift', 'Other'],
            'Transfer': ['Savings', 'Investment', 'Other']
        };

        const options = categories[this.currentType] || categories['Expense'];
        const selectedCategory = prompt('Select Category:\n\n' + options.map((cat, idx) => `${idx + 1}. ${cat}`).join('\n'));

        if (selectedCategory) {
            const index = parseInt(selectedCategory) - 1;
            if (index >= 0 && index < options.length) {
                document.getElementById('categoryInput').value = options[index];
            } else {
                document.getElementById('categoryInput').value = selectedCategory;
            }
        }
    }

    /**
     * Setup pull-to-refresh functionality
     */
    setupPullToRefresh() {
        let startY = 0;
        const indicator = document.getElementById('ptrIndicator');
        const container = document.querySelector('.pwa-container');

        container.addEventListener('touchstart', (e) => {
            if (container.scrollTop === 0) {
                startY = e.touches[0].pageY;
            }
        }, { passive: true });

        container.addEventListener('touchmove', (e) => {
            if (container.scrollTop === 0 && !this.isPulling) {
                const currentY = e.touches[0].pageY;
                const pullDistance = currentY - startY;

                if (pullDistance > 10) {
                    this.isPulling = true;
                    indicator.classList.add('visible');
                }

                if (pullDistance > this.pullThreshold) {
                    indicator.innerHTML = '<span>↻ Release to refresh</span>';
                }
            }
        }, { passive: true });

        container.addEventListener('touchend', async (e) => {
            if (this.isPulling) {
                const endY = e.changedTouches[0].pageY;
                const pullDistance = endY - startY;

                if (pullDistance > this.pullThreshold) {
                    indicator.innerHTML = '<span>⟳ Refreshing...</span>';
                    await this.refreshTransactions();
                }

                indicator.classList.remove('visible');
                indicator.innerHTML = '<span>↓ Pull to refresh</span>';
                this.isPulling = false;
            }
        }, { passive: true });
    }

    /**
     * Open transaction modal
     */
    openTransactionModal() {
        // Reset form
        document.getElementById('amountInput').value = '';
        document.getElementById('categoryInput').value = '';
        document.getElementById('descriptionInput').value = '';
        this.removePhoto();

        // Select default type
        this.selectType('Expense');

        // Show modal
        document.getElementById('transactionModal').style.display = 'flex';
    }

    /**
     * Close transaction modal
     */
    closeTransactionModal() {
        document.getElementById('transactionModal').style.display = 'none';
    }

    /**
     * Select transaction type
     */
    selectType(type) {
        this.currentType = type;

        // Update button states
        document.querySelectorAll('.type-btn').forEach(btn => {
            if (btn.dataset.type === type) {
                btn.classList.remove('btn-secondary');
                btn.classList.add('btn-primary');
            } else {
                btn.classList.remove('btn-primary');
                btn.classList.add('btn-secondary');
            }
        });
    }

    /**
     * Handle photo selection
     */
    async handlePhotoSelection(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            // Compress photo if photo_compressor is available
            if (window.photoCompressor) {
                const compressed = await window.photoCompressor.compress(file);
                this.selectedPhoto = compressed;
            } else {
                // Fallback: use file as-is
                const reader = new FileReader();
                reader.onload = (e) => {
                    this.selectedPhoto = e.target.result;
                    this.showPhotoPreview(this.selectedPhoto);
                };
                reader.readAsDataURL(file);
                return;
            }

            this.showPhotoPreview(this.selectedPhoto);
        } catch (error) {
            console.error('[TrackerUI] Photo processing error:', error);
            alert('Failed to process photo');
        }
    }

    /**
     * Show photo preview
     */
    showPhotoPreview(dataUrl) {
        document.getElementById('photoPreviewImg').src = dataUrl;
        document.getElementById('photoPreview').style.display = 'block';
    }

    /**
     * Remove selected photo
     */
    removePhoto() {
        this.selectedPhoto = null;
        document.getElementById('photoInput').value = '';
        document.getElementById('photoPreview').style.display = 'none';
    }

    /**
     * Save transaction
     */
    async saveTransaction() {
        // Validate form
        const amount = parseFloat(document.getElementById('amountInput').value);
        const category = document.getElementById('categoryInput').value;
        const date = document.getElementById('dateInput').value;
        const description = document.getElementById('descriptionInput').value;

        if (!amount || amount <= 0) {
            alert('Please enter a valid amount');
            return;
        }

        if (!category) {
            alert('Please select a category');
            return;
        }

        if (!date) {
            alert('Please select a date');
            return;
        }

        // Create transaction object
        const transaction = {
            transaction_type: this.currentType,
            amount: amount,
            category: category,
            date: date,
            description: description || '',
            party_type: 'Customer', // TODO: Get from category
            party: 'Default Party', // TODO: Get from category
            photo: this.selectedPhoto
        };

        try {
            // Save to IndexedDB
            const id = await window.offlineManager.saveTransaction(transaction);
            console.log('[TrackerUI] Transaction saved:', id);

            // Close modal
            this.closeTransactionModal();

            // Reload transactions
            await this.loadTransactions();

            // Update sync status
            await this.updateSyncStatus();

            // Show success message (brief)
            this.showSuccess('Transaction saved!');
        } catch (error) {
            console.error('[TrackerUI] Failed to save transaction:', error);
            alert('Failed to save transaction. Please try again.');
        }
    }

    /**
     * Load and display transactions
     */
    async loadTransactions() {
        const loadingState = document.getElementById('loadingState');
        const emptyState = document.getElementById('emptyState');
        const transactionList = document.getElementById('transactionList');

        // Show loading
        loadingState.style.display = 'block';
        emptyState.style.display = 'none';
        transactionList.style.display = 'none';

        try {
            const transactions = await window.offlineManager.getAllTransactions(50);
            console.log('[TrackerUI] Loaded', transactions.length, 'transactions');

            // Hide loading
            loadingState.style.display = 'none';

            if (transactions.length === 0) {
                emptyState.style.display = 'block';
            } else {
                transactionList.style.display = 'block';
                this.renderTransactions(transactions);
            }
        } catch (error) {
            console.error('[TrackerUI] Failed to load transactions:', error);
            loadingState.style.display = 'none';
            this.showError('Failed to load transactions');
        }
    }

    /**
     * Render transaction cards
     */
    renderTransactions(transactions) {
        const container = document.getElementById('transactionList');
        container.innerHTML = '';

        transactions.forEach(txn => {
            const card = this.createTransactionCard(txn);
            container.appendChild(card);
        });
    }

    /**
     * Create transaction card element
     */
    createTransactionCard(txn) {
        const card = document.createElement('div');
        card.className = `transaction-card ${txn.transaction_type.toLowerCase()}`;

        // Icon based on type
        const icons = {
            'Expense': '💸',
            'Income': '💰',
            'Transfer': '🔄'
        };

        const icon = icons[txn.transaction_type] || '📊';

        // Format amount
        const formattedAmount = new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(txn.amount);

        // Format date
        const date = new Date(txn.date);
        const formattedDate = date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });

        card.innerHTML = `
            <div class="transaction-icon">${icon}</div>
            <div class="transaction-details">
                <div class="transaction-category">${txn.category}</div>
                <div class="transaction-description">
                    ${txn.description || formattedDate}
                </div>
            </div>
            <div class="transaction-amount ${txn.transaction_type.toLowerCase()}">
                ${txn.transaction_type === 'Income' ? '+' : '-'}$${formattedAmount}
            </div>
            <div class="transaction-status ${txn.sync_status}">
                ${txn.sync_status === 'synced' ? '✓' : '⟳'}
            </div>
        `;

        return card;
    }

    /**
     * Refresh transactions (pull-to-refresh)
     */
    async refreshTransactions() {
        await new Promise(resolve => setTimeout(resolve, 500)); // Brief delay for UX
        await this.loadTransactions();
        await this.updateSyncStatus();
    }

    /**
     * Update sync status indicator
     */
    async updateSyncStatus() {
        try {
            const pending = await window.offlineManager.getTransactionCountByStatus('pending');
            const syncing = await window.offlineManager.getTransactionCountByStatus('syncing');
            const failed = await window.offlineManager.getTransactionCountByStatus('failed');

            const indicator = document.getElementById('syncIndicator');
            const text = document.getElementById('syncText');
            const countEl = document.getElementById('pendingCount');

            if (syncing > 0) {
                indicator.className = 'sync-indicator syncing';
                text.textContent = 'Syncing...';
                countEl.textContent = '';
            } else if (failed > 0) {
                indicator.className = 'sync-indicator error';
                text.textContent = 'Sync Failed';
                countEl.textContent = `(${failed})`;
            } else if (pending > 0) {
                indicator.className = 'sync-indicator offline';
                text.textContent = 'Offline';
                countEl.textContent = `(${pending} pending)`;
            } else {
                indicator.className = 'sync-indicator online';
                text.textContent = 'All synced';
                countEl.textContent = '';
            }
        } catch (error) {
            console.error('[TrackerUI] Failed to update sync status:', error);
        }
    }

    /**
     * Update network status
     */
    updateNetworkStatus() {
        const isOnline = navigator.onLine;
        console.log('[TrackerUI] Network status:', isOnline ? 'Online' : 'Offline');

        if (isOnline) {
            // TODO: Trigger background sync
        }
    }

    /**
     * Show success message
     */
    showSuccess(message) {
        // Simple console log for now - can enhance with toast notification later
        console.log('[TrackerUI] Success:', message);
    }

    /**
     * Show error message
     */
    showError(message) {
        console.error('[TrackerUI] Error:', message);
        alert(message);
    }
}

// Initialize when DOM is ready
if (typeof window !== 'undefined') {
    window.trackerUI = new TrackerUI();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.trackerUI.init();
        });
    } else {
        window.trackerUI.init();
    }
}
