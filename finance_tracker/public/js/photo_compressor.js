/**
 * Photo Compressor - Client-side image compression using Canvas API
 * Resizes and compresses images before upload to save bandwidth and storage
 */

class PhotoCompressor {
    constructor(options = {}) {
        this.maxWidth = options.maxWidth || 1024;
        this.maxHeight = options.maxHeight || 1024;
        this.quality = options.quality || 0.8;
        this.outputFormat = options.outputFormat || 'image/jpeg';
    }

    /**
     * Compress an image file
     * @param {File} file - Image file to compress
     * @returns {Promise<string>} Base64 data URL of compressed image
     */
    async compress(file) {
        return new Promise((resolve, reject) => {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                reject(new Error('File is not an image'));
                return;
            }

            console.log('[PhotoCompressor] Original file:', {
                name: file.name,
                size: this.formatBytes(file.size),
                type: file.type
            });

            const reader = new FileReader();

            reader.onload = (e) => {
                const img = new Image();

                img.onload = () => {
                    try {
                        const compressed = this.compressImage(img);
                        console.log('[PhotoCompressor] Compression complete');
                        resolve(compressed);
                    } catch (error) {
                        reject(error);
                    }
                };

                img.onerror = () => {
                    reject(new Error('Failed to load image'));
                };

                img.src = e.target.result;
            };

            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };

            reader.readAsDataURL(file);
        });
    }

    /**
     * Compress image using Canvas API
     * @param {HTMLImageElement} img - Image element
     * @returns {string} Base64 data URL
     */
    compressImage(img) {
        // Calculate new dimensions while maintaining aspect ratio
        let { width, height } = this.calculateDimensions(
            img.width,
            img.height,
            this.maxWidth,
            this.maxHeight
        );

        console.log('[PhotoCompressor] Resizing from', img.width, 'x', img.height, 'to', width, 'x', height);

        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');

        // Enable image smoothing for better quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw image on canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to data URL
        const dataUrl = canvas.toDataURL(this.outputFormat, this.quality);

        // Log compression stats
        const originalSize = this.estimateSize(img.width * img.height);
        const compressedSize = this.estimateBase64Size(dataUrl);
        const compressionRatio = ((1 - compressedSize / originalSize) * 100).toFixed(1);

        console.log('[PhotoCompressor] Compression stats:', {
            originalSize: this.formatBytes(originalSize),
            compressedSize: this.formatBytes(compressedSize),
            compressionRatio: compressionRatio + '%'
        });

        return dataUrl;
    }

    /**
     * Calculate new dimensions maintaining aspect ratio
     */
    calculateDimensions(width, height, maxWidth, maxHeight) {
        if (width <= maxWidth && height <= maxHeight) {
            return { width, height };
        }

        const widthRatio = maxWidth / width;
        const heightRatio = maxHeight / height;
        const ratio = Math.min(widthRatio, heightRatio);

        return {
            width: Math.round(width * ratio),
            height: Math.round(height * ratio)
        };
    }

    /**
     * Estimate file size from dimensions
     */
    estimateSize(pixels) {
        // Rough estimate: 3 bytes per pixel for RGB
        return pixels * 3;
    }

    /**
     * Estimate size of base64 string
     */
    estimateBase64Size(dataUrl) {
        // Remove data URL prefix
        const base64 = dataUrl.split(',')[1];
        // Base64 encoding increases size by ~33%
        return (base64.length * 3) / 4;
    }

    /**
     * Format bytes to human-readable string
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * Compress to blob instead of data URL
     * @param {File} file - Image file
     * @returns {Promise<Blob>} Compressed image blob
     */
    async compressToBlob(file) {
        const dataUrl = await this.compress(file);
        return this.dataUrlToBlob(dataUrl);
    }

    /**
     * Convert data URL to Blob
     */
    dataUrlToBlob(dataUrl) {
        const arr = dataUrl.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);

        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }

        return new Blob([u8arr], { type: mime });
    }
}

// Create global instance
if (typeof window !== 'undefined') {
    window.photoCompressor = new PhotoCompressor({
        maxWidth: 1024,
        maxHeight: 1024,
        quality: 0.8,
        outputFormat: 'image/jpeg'
    });
    console.log('[PhotoCompressor] Initialized');
}
