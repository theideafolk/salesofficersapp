// Component for creating test sales officers
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, Loader2 } from 'lucide-react';

type IdType = 'Aadhaar Card' | 'Driver\'s License' | 'Passport';

interface FormData {
  name: string;
  employee_id: string;
  dob: string;
  id_type: IdType;
  id_no: string;
  phone_number: string;
  address: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const CreateSalesOfficerModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    employee_id: '',
    dob: '',
    id_type: 'Aadhaar Card',
    id_no: '',
    phone_number: '',
    address: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setDebugInfo(null);
    
    // Validate mandatory fields
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }
    
    if (!formData.phone_number.trim()) {
      setError('Phone number is required');
      return;
    }
    
    // Validate phone number format (10 digits)
    if (!/^\d{10}$/.test(formData.phone_number)) {
      setError('Phone number must be 10 digits');
      return;
    }

    // Address is required in the schema
    if (!formData.address.trim()) {
      setError('Address is required');
      return;
    }

    setLoading(true);
    
    try {
      // Format phone number with country code for Supabase
      const phoneWithCountryCode = `+91${formData.phone_number}`;
      // Use phone number as temporary password for testing
      const password = `Test${formData.phone_number}`;
      
      // Create a debug object to track steps
      let debug = {
        steps: [] as string[],
        authData: null as any,
        userId: '',
        functionCallResult: null as any
      };
      
      // Step 1: Sign up the user with phone
      debug.steps.push("1. Signing up user with phone");
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        phone: phoneWithCountryCode,
        password: password,
        options: {
          data: {
            name: formData.name,
            phone: phoneWithCountryCode
          }
        }
      });
      
      debug.authData = authData || null;
      
      if (authError) {
        setDebugInfo(JSON.stringify(debug, null, 2));
        throw new Error(`Auth error: ${authError.message}`);
      }
      
      if (!authData?.user) {
        setDebugInfo(JSON.stringify(debug, null, 2));
        throw new Error('Failed to create user: No user data returned');
      }
      
      debug.userId = authData.user.id;
      debug.steps.push(`2. User created with ID: ${authData.user.id}`);
      
      // Step 2: Insert the sales officer data using our function
      debug.steps.push("3. Calling create_sales_officer function");
      
      const { data: fnData, error: fnError } = await supabase.rpc('create_sales_officer', {
        officer_id: authData.user.id,
        officer_name: formData.name,
        officer_employee_id: formData.employee_id || '',
        officer_dob: formData.dob || null,
        officer_id_type: formData.id_type,
        officer_id_no: formData.id_no || '',
        officer_phone_number: formData.phone_number,
        officer_address: formData.address
      });
      
      debug.functionCallResult = { data: fnData, error: fnError };
      debug.steps.push(`4. Function result: ${fnData === true ? 'Success' : 'Failed'}`);
      
      if (fnError) {
        debug.steps.push(`Error: ${fnError.message}`);
        setDebugInfo(JSON.stringify(debug, null, 2));
        
        // Try a direct insert as fallback
        debug.steps.push("5. Attempting direct insert as fallback");
        
        const { error: insertError } = await supabase
          .from('sales_officers')
          .insert([
            {
              sales_officers_id: authData.user.id,
              name: formData.name,
              employee_id: formData.employee_id || `EMP${formData.phone_number}`,
              dob: formData.dob || null,
              id_type: formData.id_type || 'Aadhaar Card',
              id_no: formData.id_no || 'PENDING',
              phone_number: formData.phone_number,
              address: formData.address
            }
          ]);
          
        if (insertError) {
          debug.steps.push(`Direct insert error: ${insertError.message}`);
          setDebugInfo(JSON.stringify(debug, null, 2));
          throw new Error(`Database error: ${fnError.message}\nDirect insert error: ${insertError.message}`);
        } else {
          debug.steps.push("6. Direct insert successful");
        }
      }
      
      // Verify the data was inserted
      debug.steps.push("7. Verifying data insertion");
      const { data: checkData, error: checkError } = await supabase
        .from('sales_officers')
        .select('*')
        .eq('sales_officers_id', authData.user.id)
        .single();
        
      if (checkError || !checkData) {
        debug.steps.push(`Verification failed: ${checkError?.message || 'No data found'}`);
        setDebugInfo(JSON.stringify(debug, null, 2));
      } else {
        debug.steps.push("8. Verification successful - data is in the database");
      }
      
      setSuccess(`Sales officer created successfully! Login credentials:\nPhone: ${formData.phone_number}\nPassword: ${password}\n\nNote: You may need to verify the phone number in Supabase authentication settings.`);
      
      // Reset form
      setFormData({
        name: '',
        employee_id: '',
        dob: '',
        id_type: 'Aadhaar Card',
        id_no: '',
        phone_number: '',
        address: '',
      });
      
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
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Create Test Sales Officer</h2>
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
              {error}
            </div>
          )}
          
          {success && (
            <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-md whitespace-pre-line">
              {success}
            </div>
          )}
          
          {debugInfo && (
            <div className="mb-4 p-3 bg-blue-100 border border-blue-400 text-blue-700 rounded-md overflow-auto max-h-40">
              <strong>Debug Info:</strong>
              <pre className="text-xs">{debugInfo}</pre>
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">
                Name *
              </label>
              <input
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500"
                id="name"
                name="name"
                type="text"
                placeholder="Enter name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="employee_id">
                Employee ID
              </label>
              <input
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500"
                id="employee_id"
                name="employee_id"
                type="text"
                placeholder="Enter employee ID"
                value={formData.employee_id}
                onChange={handleChange}
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="phone_number">
                Phone Number *
              </label>
              <input
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500"
                id="phone_number"
                name="phone_number"
                type="tel"
                pattern="[0-9]*"
                inputMode="numeric"
                placeholder="Enter 10-digit phone number"
                value={formData.phone_number}
                onChange={handleChange}
                maxLength={10}
                required
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="address">
                Address *
              </label>
              <input
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500"
                id="address"
                name="address"
                type="text"
                placeholder="Enter address"
                value={formData.address}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="dob">
                Date of Birth
              </label>
              <input
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500"
                id="dob"
                name="dob"
                type="date"
                value={formData.dob}
                onChange={handleChange}
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="id_type">
                ID Type
              </label>
              <select
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500"
                id="id_type"
                name="id_type"
                value={formData.id_type}
                onChange={handleChange}
              >
                <option value="Aadhaar Card">Aadhaar Card</option>
                <option value="Driver's License">Driver's License</option>
                <option value="Passport">Passport</option>
              </select>
            </div>
            
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="id_no">
                ID Number
              </label>
              <input
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500"
                id="id_no"
                name="id_no"
                type="text"
                placeholder="Enter ID number"
                value={formData.id_no}
                onChange={handleChange}
              />
            </div>
            
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
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline flex items-center"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Sales Officer'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateSalesOfficerModal;