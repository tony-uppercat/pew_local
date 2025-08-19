import { useState, useRef } from 'react';
import { db, type Expense } from '@/lib/database';
import { opfsStorage, StorageUtils } from '@/lib/storage';
import { preferences } from '@/lib/preferences';

interface ExpenseFormProps {
  expense?: Expense;
  onSave?: (expense: Expense) => void;
  onCancel?: () => void;
  className?: string;
}

export default function ExpenseForm({
  expense,
  onSave,
  onCancel,
  className = '',
}: ExpenseFormProps): JSX.Element {
  const [formData, setFormData] = useState({
    amount: expense?.amount?.toString() || '',
    description: expense?.description || '',
    category: expense?.category || 'Other',
    paymentMethod: expense?.paymentMethod || 'card',
    date: expense?.date ? expense.date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    notes: expense?.notes || '',
    tags: expense?.tags?.join(', ') || '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(
    expense?.receipt?.mediaId || null
  );
  const [categories, setCategories] = useState<Array<{ name: string; icon: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load categories on component mount
  useState(() => {
    db.categories.toArray().then(cats => {
      setCategories(cats.map(cat => ({ name: cat.name, icon: cat.icon })));
    });
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!StorageUtils.isValidMediaType(file.type)) {
      setError('Please select a valid image or PDF file.');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB.');
      return;
    }

    setReceiptFile(file);
    
    // Create preview for images
    if (file.type.startsWith('image/')) {
      const previewUrl = URL.createObjectURL(file);
      setReceiptPreview(previewUrl);
    } else {
      setReceiptPreview('pdf');
    }
  };

  const handleRemoveReceipt = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Validate form
      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Please enter a valid amount.');
      }

      if (!formData.description.trim()) {
        throw new Error('Please enter a description.');
      }

      // Handle receipt upload if present
      let receiptData = expense?.receipt;
      
      if (receiptFile) {
        const mediaId = StorageUtils.generateMediaId();
        
        const mediaMetadata = await opfsStorage.storeMediaFile(receiptFile, mediaId, {
          compress: true,
          quality: 0.8,
          maxWidth: 1920,
          maxHeight: 1080,
          generateThumbnail: true,
          thumbnailSize: 200,
        });

        // Store media metadata in database
        await db.addMediaFile({
          mediaId: mediaMetadata.id,
          fileName: mediaMetadata.fileName,
          mimeType: mediaMetadata.mimeType,
          size: mediaMetadata.size,
          thumbnailId: mediaMetadata.thumbnailId,
        });

        receiptData = {
          mediaId: mediaMetadata.id,
          fileName: mediaMetadata.fileName,
          mimeType: mediaMetadata.mimeType,
          size: mediaMetadata.size,
        };
      }

      // Prepare expense data
      const expenseData: Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'> = {
        amount,
        description: formData.description.trim(),
        category: formData.category,
        paymentMethod: formData.paymentMethod as Expense['paymentMethod'],
        date: new Date(formData.date),
        notes: formData.notes.trim() || undefined,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        receipt: receiptData,
      };

      let savedExpense: Expense;

      if (expense?.id) {
        // Update existing expense
        await db.updateExpense(expense.id, expenseData);
        savedExpense = { ...expense, ...expenseData, updatedAt: new Date() };
      } else {
        // Create new expense
        const id = await db.addExpense(expenseData);
        savedExpense = {
          ...expenseData,
          id,
          createdAt: new Date(),
          updatedAt: new Date(),
          syncStatus: 'pending',
        };
      }

      onSave?.(savedExpense);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save expense');
      console.error('Error saving expense:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`space-y-6 ${className}`}>
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
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Amount */}
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Amount *
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500 dark:text-gray-400 sm:text-sm">$</span>
            </div>
            <input
              type="number"
              step="0.01"
              min="0"
              id="amount"
              name="amount"
              value={formData.amount}
              onChange={handleInputChange}
              className="block w-full pl-7 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-gray-100 sm:text-sm"
              placeholder="0.00"
              required
            />
          </div>
        </div>

        {/* Date */}
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Date *
          </label>
          <input
            type="date"
            id="date"
            name="date"
            value={formData.date}
            onChange={handleInputChange}
            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-gray-100 sm:text-sm"
            required
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Description *
        </label>
        <input
          type="text"
          id="description"
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-gray-100 sm:text-sm"
          placeholder="What did you spend money on?"
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Category *
          </label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleInputChange}
            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-gray-100 sm:text-sm"
            required
          >
            {categories.map(cat => (
              <option key={cat.name} value={cat.name}>
                {cat.icon} {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Payment Method */}
        <div>
          <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Payment Method
          </label>
          <select
            id="paymentMethod"
            name="paymentMethod"
            value={formData.paymentMethod}
            onChange={handleInputChange}
            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-gray-100 sm:text-sm"
          >
            <option value="cash">💵 Cash</option>
            <option value="card">💳 Card</option>
            <option value="bank_transfer">🏦 Bank Transfer</option>
            <option value="digital_wallet">📱 Digital Wallet</option>
            <option value="other">🔄 Other</option>
          </select>
        </div>
      </div>

      {/* Tags */}
      <div>
        <label htmlFor="tags" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Tags
        </label>
        <input
          type="text"
          id="tags"
          name="tags"
          value={formData.tags}
          onChange={handleInputChange}
          className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-gray-100 sm:text-sm"
          placeholder="business, travel, urgent (comma separated)"
        />
      </div>

      {/* Receipt Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Receipt
        </label>
        
        {receiptPreview ? (
          <div className="relative">
            {receiptPreview === 'pdf' ? (
              <div className="flex items-center justify-center w-full h-32 bg-gray-100 dark:bg-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                <div className="text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm text-gray-500 dark:text-gray-400">PDF Receipt</p>
                </div>
              </div>
            ) : (
              <img
                src={receiptPreview}
                alt="Receipt preview"
                className="w-full h-48 object-cover rounded-lg"
              />
            )}
            
            <button
              type="button"
              onClick={handleRemoveReceipt}
              className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg">
            <div className="space-y-1 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="flex text-sm text-gray-600 dark:text-gray-400">
                <label htmlFor="receipt" className="relative cursor-pointer bg-white dark:bg-gray-700 rounded-md font-medium text-primary-600 dark:text-primary-400 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500">
                  <span>Upload a receipt</span>
                  <input
                    ref={fileInputRef}
                    id="receipt"
                    name="receipt"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleReceiptUpload}
                    className="sr-only"
                  />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                PNG, JPG, PDF up to 10MB
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          value={formData.notes}
          onChange={handleInputChange}
          className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-gray-100 sm:text-sm"
          placeholder="Additional notes or details..."
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Cancel
          </button>
        )}
        
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {expense ? 'Update Expense' : 'Save Expense'}
            </>
          )}
        </button>
      </div>
    </form>
  );
}
