// Add New Shop page component with city, state, country dropdowns
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import BottomNavigation from '../components/BottomNavigation';
import { ArrowLeft, Camera, Loader2, AlertCircle, Check, X } from 'lucide-react';
import { uploadShopImage } from '../utils/storage';
import { useLanguage } from '../context/LanguageContext';

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
  const { t } = useLanguage();
  
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
  const [enlargedImage, setEnlargedImage] = useState(false);
  
  // Available options for dropdowns
  const cities = ['Mumbai', 'Pune', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata'];
  const states = ['Maharashtra', 'Delhi', 'Karnataka', 'Telangana', 'Tamil Nadu', 'West Bengal'];
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
      
      // Check file size (limit to 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image is too large. Maximum size is 5MB.');
        return;
      }
      
      // Create a preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setError(null); // Clear any previous errors
      };
      reader.readAsDataURL(file);
      
      setImageFile(file);
    }
  };
  
  // Handle image click to enlarge
  const handleImageClick = () => {
    if (imagePreview) {
      setEnlargedImage(true);
    }
  };
  
  // Close enlarged image view
  const closeEnlargedImage = () => {
    setEnlargedImage(false);
  };
  
  // Remove the captured image
  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.name.trim()) {
      setError(`${t('shopName')} ${t('required')}`);
      return;
    }
    
    if (!formData.address.trim()) {
      setError(`${t('shopAddress')} ${t('required')}`);
      return;
    }
    
    setLoading(true);
    setError(null);
    setUploadProgress(0);
    
    try {
      // Create a point string for PostgreSQL if location is available
      const pointString = userLocation ? `(${userLocation.lng},${userLocation.lat})` : null;
      
      if (!pointString) {
        setError(t('locationError'));
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
        try {
          // Upload the image using our utility function
          const imageUrl = await uploadShopImage(
            imageFile, 
            shopResult.shop_id,
            (progress) => setUploadProgress(progress)
          );
          
          if (imageUrl) {
            // Update the shop with the image URL
            await supabase
              .from('shops')
              .update({ photo: imageUrl })
              .eq('shop_id', shopResult.shop_id);
          }
        } catch (uploadErr) {
          console.error('Error uploading image:', uploadErr);
          // Continue anyway - at least the shop is created
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
        <h1 className="text-xl font-bold">{t('addNewShop')}</h1>
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
              {t('shopName')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t('shopName')}
              required
            />
          </div>
          
          {/* Owner Name */}
          <div>
            <label className="block text-gray-700 font-medium mb-2" htmlFor="owner_name">
              {t('ownerName')}
            </label>
            <input
              type="text"
              id="owner_name"
              name="owner_name"
              value={formData.owner_name}
              onChange={handleInputChange}
              className="w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t('ownerName')}
            />
          </div>
          
          {/* Phone Number */}
          <div>
            <label className="block text-gray-700 font-medium mb-2" htmlFor="phone_number">
              {t('phoneNumber')}
            </label>
            <input
              type="tel"
              id="phone_number"
              name="phone_number"
              value={formData.phone_number}
              onChange={handleInputChange}
              className="w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t('phoneNumber')}
            />
          </div>
          
          {/* Shop Address */}
          <div>
            <label className="block text-gray-700 font-medium mb-2" htmlFor="address">
              {t('shopAddress')} <span className="text-red-500">*</span>
            </label>
            <textarea
              id="address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              className="w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t('shopAddress')}
              rows={3}
              required
            />
          </div>
          
          {/* City Dropdown */}
          <div>
            <label className="block text-gray-700 font-medium mb-2" htmlFor="city">
              {t('city')} <span className="text-red-500">*</span>
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
              {t('state')} <span className="text-red-500">*</span>
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
              {t('country')} <span className="text-red-500">*</span>
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
              {t('locationCaptured')}: {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}
            </div>
          ) : (
            <div className="bg-yellow-50 p-2 rounded-lg text-yellow-700 text-sm flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {t('waitingLocation')}
            </div>
          )}
          
          {/* Capture Shop Photo */}
          <div>
            <p className="block text-gray-700 font-medium mb-2">
              {t('captureShopPhoto')}
            </p>
            
            {imagePreview ? (
              <div className="mb-3 relative">
                <img 
                  src={imagePreview} 
                  alt="Shop preview"
                  onClick={handleImageClick}
                  className="w-full h-48 object-cover rounded-lg cursor-pointer"
                />
                <button
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 shadow-md"
                  aria-label="Remove image"
                  type="button"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div 
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center mb-3 bg-gray-50"
              >
                <Camera className="h-10 w-10 mx-auto mb-2 text-gray-400" />
                <p className="text-gray-500">{t('takePhotoShop')}</p>
              </div>
            )}
            
            <div className="flex justify-center">
              <label className="flex items-center justify-center bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium py-2 px-4 rounded-md cursor-pointer transition-colors">
                <Camera className="h-5 w-5 mr-2" />
                <span>{t('capturePhoto')}</span>
                <input 
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageCapture}
                  className="sr-only"
                />
              </label>
            </div>
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
                {uploadProgress > 0 ? `${t('save')}... ${uploadProgress}%` : `${t('save')}...`}
              </>
            ) : (
              t('save')
            )}
          </button>
        </form>
      </main>
      
      {/* Enlarged Image Modal */}
      {enlargedImage && imagePreview && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
          <div className="relative w-full max-w-2xl">
            <button 
              onClick={closeEnlargedImage}
              className="absolute top-2 right-2 text-white hover:text-gray-300 bg-gray-800 bg-opacity-50 rounded-full p-1"
              aria-label="Close"
              type="button"
            >
              <X size={24} />
            </button>
            <img 
              src={imagePreview} 
              alt="Enlarged shop photo" 
              className="max-h-[80vh] max-w-full mx-auto object-contain"
            />
          </div>
        </div>
      )}
      
      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
};

export default AddShopPage;