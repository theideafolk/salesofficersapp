// Add New Shop page component with city, state, country dropdowns
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import BottomNavigation from '../components/BottomNavigation';
import { ArrowLeft, Camera, Loader2, AlertCircle, Check } from 'lucide-react';

interface ShopFormData {
  name: string;
  owner_name: string;
  phone_number: string;
  address: string;
  city: string;
  state: string;
  country: string;
}

const AddShopPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [formData, setFormData] = useState<ShopFormData>({
    name: '',
    owner_name: '',
    phone_number: '',
    address: '',
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India'
  });
  
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Available options for dropdowns
  const cities = ['Mumbai', 'Pune'];
  const states = ['Maharashtra'];
  const countries = ['India'];
  
  // Get user's location automatically when component mounts
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
        },
        (error) => {
          console.error('Error getting location:', error);
          // Don't show error to user, just let them proceed without location
        },
        { enableHighAccuracy: true }
      );
    }
  }, []);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle image capture
  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Create a preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      setImageFile(file);
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.name.trim()) {
      setError('Shop name is required');
      return;
    }
    
    if (!formData.address.trim()) {
      setError('Shop address is required');
      return;
    }
    
    setLoading(true);
    setError(null);
    setUploadProgress(0);
    
    try {
      // Create a point string for PostgreSQL if location is available
      const pointString = userLocation ? `(${userLocation.lng},${userLocation.lat})` : null;
      
      if (!pointString) {
        setError('Unable to get your location. Please enable location services and try again.');
        setLoading(false);
        return;
      }
      
      // Prepare the shop data using form values directly
      const shopData: any = {
        name: formData.name,
        address: formData.address,
        territory: formData.city, // Use city as territory
        city: formData.city,
        state: formData.state,
        country: formData.country,
        owner_name: formData.owner_name || null,
        phone_number: formData.phone_number || null,
        gps_location: pointString,
        created_by: user?.id // Add the user ID as created_by to track ownership
      };
      
      // Insert the shop data
      const { data: shopResult, error: shopError } = await supabase
        .from('shops')
        .insert([shopData])
        .select('shop_id')
        .single();
        
      if (shopError) {
        throw new Error(`Failed to create shop: ${shopError.message}`);
      }
      
      // If we have an image file, upload it
      if (imageFile && shopResult?.shop_id) {
        const fileName = `shop-photos/${shopResult.shop_id}-${Date.now()}.jpg`;
        
        const { error: uploadError } = await supabase.storage
          .from('shop-photos')
          .upload(fileName, imageFile, {
            cacheControl: '3600',
            upsert: false,
            onUploadProgress: (progress) => {
              const percent = Math.round((progress.loaded / progress.total) * 100);
              setUploadProgress(percent);
            }
          });
          
        if (uploadError) {
          console.error('Error uploading image:', uploadError);
          // Continue without the image
        } else {
          // Get the public URL
          const { data: publicURLData } = await supabase.storage
            .from('shop-photos')
            .getPublicUrl(fileName);
            
          const imageUrl = publicURLData?.publicUrl;
          
          // Update the shop with the image URL
          if (imageUrl) {
            await supabase
              .from('shops')
              .update({ photo: imageUrl })
              .eq('shop_id', shopResult.shop_id);
          }
        }
      }
      
      // Navigate back to shops list with success message
      navigate('/shops', { 
        state: { 
          success: true, 
          message: 'Shop created successfully' 
        } 
      });
      
    } catch (err) {
      console.error('Error creating shop:', err);
      setError(err instanceof Error ? err.message : 'Failed to create shop');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle cancel/back button
  const handleCancel = () => {
    navigate('/shops');
  };
  
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="flex items-center py-4 px-4 bg-white shadow-sm">
        <button 
          onClick={handleCancel}
          className="text-gray-800 focus:outline-none mr-3"
          aria-label="Back"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold">Add New Shop</h1>
      </header>
      
      {/* Main Content */}
      <main className="flex-grow px-4 pb-20 pt-4">
        {/* Error display */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Shop Name */}
          <div>
            <label className="block text-gray-700 font-medium mb-2" htmlFor="name">
              Shop Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter shop name"
              required
            />
          </div>
          
          {/* Owner Name */}
          <div>
            <label className="block text-gray-700 font-medium mb-2" htmlFor="owner_name">
              Owner Name
            </label>
            <input
              type="text"
              id="owner_name"
              name="owner_name"
              value={formData.owner_name}
              onChange={handleInputChange}
              className="w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter owner name"
            />
          </div>
          
          {/* Phone Number */}
          <div>
            <label className="block text-gray-700 font-medium mb-2" htmlFor="phone_number">
              Phone Number
            </label>
            <input
              type="tel"
              id="phone_number"
              name="phone_number"
              value={formData.phone_number}
              onChange={handleInputChange}
              className="w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter phone number"
            />
          </div>
          
          {/* Shop Address */}
          <div>
            <label className="block text-gray-700 font-medium mb-2" htmlFor="address">
              Shop Address <span className="text-red-500">*</span>
            </label>
            <textarea
              id="address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              className="w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter shop address"
              rows={3}
              required
            />
          </div>
          
          {/* City Dropdown */}
          <div>
            <label className="block text-gray-700 font-medium mb-2" htmlFor="city">
              City <span className="text-red-500">*</span>
            </label>
            <select
              id="city"
              name="city"
              value={formData.city}
              onChange={handleInputChange}
              className="w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              {cities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>
          
          {/* State Dropdown */}
          <div>
            <label className="block text-gray-700 font-medium mb-2" htmlFor="state">
              State <span className="text-red-500">*</span>
            </label>
            <select
              id="state"
              name="state"
              value={formData.state}
              onChange={handleInputChange}
              className="w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              {states.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>
          
          {/* Country Dropdown */}
          <div>
            <label className="block text-gray-700 font-medium mb-2" htmlFor="country">
              Country <span className="text-red-500">*</span>
            </label>
            <select
              id="country"
              name="country"
              value={formData.country}
              onChange={handleInputChange}
              className="w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              {countries.map(country => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
          </div>
          
          {/* Location Status */}
          {userLocation ? (
            <div className="bg-green-50 p-2 rounded-lg text-green-700 text-sm flex items-center">
              <Check className="h-4 w-4 mr-1" />
              Location captured: {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}
            </div>
          ) : (
            <div className="bg-yellow-50 p-2 rounded-lg text-yellow-700 text-sm flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              Waiting for location... Please ensure location services are enabled.
            </div>
          )}
          
          {/* Capture Shop Photo */}
          <div>
            <p className="block text-gray-700 font-medium mb-2">
              Capture Shop Photo
            </p>
            
            {imagePreview ? (
              <div className="mb-3">
                <img 
                  src={imagePreview} 
                  alt="Shop preview" 
                  className="w-full h-48 object-cover rounded-lg"
                />
              </div>
            ) : (
              <div 
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center mb-3 bg-gray-50"
              >
                <Camera className="h-10 w-10 mx-auto mb-2 text-gray-400" />
                <p className="text-gray-500">Take a photo of the shop</p>
              </div>
            )}
            
            <label className="block">
              <span className="sr-only">Choose photo</span>
              <input 
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageCapture}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-medium
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100"
              />
            </label>
          </div>
          
          {/* Save Button */}
          <button
            type="submit"
            className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center"
            disabled={loading || !userLocation}
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                {uploadProgress > 0 ? `Saving... ${uploadProgress}%` : 'Saving...'}
              </>
            ) : (
              'Save'
            )}
          </button>
        </form>
      </main>
      
      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
};

export default AddShopPage;