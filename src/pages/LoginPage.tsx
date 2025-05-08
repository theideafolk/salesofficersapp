// Login page component
import React, { useState } from 'react';
import LoginForm from '../components/LoginForm';
import CreateSalesOfficerModal from '../components/CreateSalesOfficerModal';
import { StoreIcon, UserPlus } from 'lucide-react';

const LoginPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const isTestEnvironment = import.meta.env.VITE_APP_ENV === 'test';

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center items-center p-4 relative">
      {/* Create Test User Button - Only shown in test environment */}
      {isTestEnvironment && (
        <button
          onClick={() => setIsModalOpen(true)}
          className="absolute top-4 right-4 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-3 rounded-md flex items-center text-sm"
          aria-label="Create Test User"
        >
          <UserPlus className="h-4 w-4 mr-1" />
          Create Test User
        </button>
      )}
      
      <div className="text-center mb-6">
        <div className="flex justify-center">
          <img src="/assets/Benzorgo_revised_logo.png" alt="Benzorgo Logo" className="h-60 w-auto" />
        </div>
      </div>
      
      <LoginForm />
      
      {/* Modal for creating test sales officer */}
      <CreateSalesOfficerModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};

export default LoginPage;