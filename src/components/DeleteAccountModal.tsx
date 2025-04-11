// Component for confirming account deletion
import React, { useState } from 'react';
import { X, AlertTriangle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const DeleteAccountModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { deleteAccount } = useAuth();
  
  const handleDelete = async () => {
    // Verify confirmation text
    if (confirmation !== 'DELETE') {
      setError('Please type DELETE to confirm');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const { success, error } = await deleteAccount();
      
      if (!success) {
        throw error || new Error('Failed to delete account');
      }
      
      // If successful, notify parent component
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
          aria-label="Close"
        >
          <X size={20} />
        </button>
        
        <div className="p-6">
          <div className="flex items-center mb-4">
            <AlertTriangle className="h-6 w-6 text-red-600 mr-2" />
            <h2 className="text-2xl font-bold text-red-600">Delete Account</h2>
          </div>
          
          <div className="mb-6">
            <p className="text-gray-700 mb-4">
              This action is <span className="font-bold">permanent</span> and cannot be undone. 
              All your data will be permanently deleted.
            </p>
            
            <p className="text-gray-700 mb-4">
              Type <span className="font-bold">DELETE</span> below to confirm:
            </p>
            
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-red-500"
              type="text"
              placeholder="Type DELETE here"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
            />
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
              {error}
            </div>
          )}
          
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded mr-2 focus:outline-none focus:shadow-outline"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline flex items-center"
              disabled={loading || confirmation !== 'DELETE'}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Account'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteAccountModal;