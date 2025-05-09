// Shop visit page component for recording shop visits
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Camera, MapPin, CheckCircle, Loader2, X, AlertCircle, RefreshCw, Clock } from 'lucide-react';
import { uploadVisitProofImage } from '../utils/storage';

interface Shop {
  shop_id: string;
  name: string;
  address: string;
  gps_location: string;
  geom_location?: string;
}

// Location acquisition strategies with increasing timeouts
const locationStrategies = [
  { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }, // Quick, less accurate
  { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }, // More accurate, longer timeout
  { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 } // Highest accuracy, longest timeout
];

const ShopVisitPage: React.FC = () => {
  const { shopId } = useParams<{ shopId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [shop, setShop] = useState<Shop | null>(null);
  const [notes, setNotes] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [locationError, setLocationError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [enlargedImage, setEnlargedImage] = useState(false);
  const [photoRequired, setPhotoRequired] = useState(true);
  const [isGettingLocation, setIsGettingLocation] = useState(true);
  const [currentStrategyIndex, setCurrentStrategyIndex] = useState(0);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [visitTime, setVisitTime] = useState<string>('');
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [visitId, setVisitId] = useState<string | null>(null);
  
  // Get shop details
  useEffect(() => {
    const fetchShopDetails = async () => {
      if (!shopId) return;
      
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('shops')
          .select('*')
          .eq('shop_id', shopId)
          .single();
          
        if (error) {
          console.error('Error fetching shop:', error);
          setError('Failed to load shop details');
        } else if (data) {
          setShop(data);
        }
      } catch (err) {
        console.error('Error:', err);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    fetchShopDetails();
  }, [shopId]);
  
  // Try to get location using current strategy
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser');
      setIsGettingLocation(false);
      return;
    }

    // Clear any previous location errors
    setLocationError(null);
    setIsGettingLocation(true);
    
    // Get the current strategy
    const strategy = locationStrategies[currentStrategyIndex];
    
    // Try to get current position
    const locationId = navigator.geolocation.getCurrentPosition(
      // Success callback
      (position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        
        // Update the user location
        setUserLocation(newLocation);
        setLocationError(null);
        setIsGettingLocation(false);
        
        // Cache the location in session storage as fallback
        try {
          sessionStorage.setItem('lastKnownLocation', JSON.stringify({
            lat: newLocation.lat,
            lng: newLocation.lng,
            timestamp: Date.now()
          }));
        } catch (e) {
          // Ignore storage errors
        }
      },
      // Error callback
      (error) => {
        console.error('Error getting location:', error);
        
        // Check if we can try next strategy
        if (currentStrategyIndex < locationStrategies.length - 1) {
          // Try next strategy
          setCurrentStrategyIndex(currentStrategyIndex + 1);
        } else {
          // We've tried all strategies, check if we have a cached location
          try {
            const cachedLocationStr = sessionStorage.getItem('lastKnownLocation');
            if (cachedLocationStr) {
              const cachedLocation = JSON.parse(cachedLocationStr);
              const locationAge = Date.now() - cachedLocation.timestamp;
              
              // Use cached location if it's less than 10 minutes old
              if (locationAge < 10 * 60 * 1000) {
                setUserLocation({
                  lat: cachedLocation.lat,
                  lng: cachedLocation.lng
                });
                setLocationError('Using your last known location. For better accuracy, please check your location settings.');
                setIsGettingLocation(false);
                return;
              }
            }
          } catch (e) {
            // Ignore storage errors
          }
          
          // Show appropriate error message based on error code
          let errorMsg = 'Unable to get your location. ';
          switch(error.code) {
            case error.PERMISSION_DENIED:
              errorMsg += 'Please allow location access in your browser settings.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMsg += 'Location information is unavailable. Please try again in an open area.';
              break;
            case error.TIMEOUT:
              errorMsg += 'The request to get your location timed out. Please check your GPS and network connection.';
              break;
            default:
              errorMsg += 'An unknown error occurred.';
          }
          setLocationError(errorMsg);
          setIsGettingLocation(false);
        }
      },
      // Options
      strategy
    );
    
    return locationId;
  }, [currentStrategyIndex]);
  
  // Initial location acquisition
  useEffect(() => {
    const locationId = getCurrentLocation();
    
    // Clean up
    return () => {
      if (locationId && navigator.geolocation) {
        // This is a no-op for getCurrentPosition, but good practice
      }
    };
  }, [getCurrentLocation]);
  
  // When strategy changes, try again with new strategy
  useEffect(() => {
    if (currentStrategyIndex > 0) {
      getCurrentLocation();
    }
  }, [currentStrategyIndex, getCurrentLocation]);
  
  // Manually retry getting location
  const handleRetryLocation = () => {
    // Reset to first strategy and try again
    setCurrentStrategyIndex(0);
    getCurrentLocation();
  };
  
  // Handle image capture from camera
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
        // Clear any previous errors when a new image is selected
        setError('');
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
  
  // Handle notes change
  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
  };
  
  // Format current time for display
  const formatTime = () => {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    // Convert to 12-hour format
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    
    // Format as HH:MM AM/PM
    return `${hours}:${minutes < 10 ? '0' + minutes : minutes} ${ampm}`;
  };
  
  // Create a point string for PostgreSQL
  const createPointString = (lng: number, lat: number): string => {
    // Simple point format (x,y) for PostgreSQL
    return `(${lng},${lat})`;
  };
  
  // Handle form submission to record the visit
  const handleSubmit = async () => {
    if (!user || !shopId) {
      setError('Missing required information.');
      return;
    }
    
    if (!userLocation) {
      setError('Location is required. Please ensure location services are enabled and try again.');
      return;
    }
    
    if (!imageFile) {
      setError('Please capture a photo of the shop before confirming visit.');
      return;
    }
    
    try {
      setSaving(true);
      setError('');
      setUploadProgress(0);
      
      // Set the current time for display in the confirmation
      const currentTime = formatTime();
      setVisitTime(currentTime);
      
      // Create a standard PostgreSQL point string
      const pointString = createPointString(userLocation.lng, userLocation.lat);
      console.log('Using point string:', pointString);
      
      // Create initial visit record
      const visitRecord = {
        sales_officer_id: user.id,
        shop_id: shopId,
        gps_location: pointString,
        notes: notes || null,
        proof_status_confirmed: false
      };
      
      // Create the visit record
      const { data: visitData, error: visitError } = await supabase
        .from('visits')
        .insert([visitRecord])
        .select('visit_id')
        .single();
        
      if (visitError) {
        throw new Error(`Failed to create visit: ${visitError.message}`);
      }
      
      if (!visitData || !visitData.visit_id) {
        throw new Error('Failed to create visit: No visit ID returned');
      }
      
      // Store the visit ID for later use
      setVisitId(visitData.visit_id);
      
      // If we have an image, upload it
      if (imageFile && visitData.visit_id) {
        try {
          // Upload the image using our utility function
          const imageUrl = await uploadVisitProofImage(
            imageFile,
            visitData.visit_id,
            (progress) => setUploadProgress(progress)
          );
          
          if (imageUrl) {
            console.log('Image uploaded successfully:', imageUrl);
            setUploadedImageUrl(imageUrl);
            
            // Update the visit record with the image URL
            const { error: updateError } = await supabase
              .from('visits')
              .update({ 
                proof_image: imageUrl,
                proof_status_confirmed: true 
              })
              .eq('visit_id', visitData.visit_id);
              
            if (updateError) {
              console.error('Error updating visit with image:', updateError);
              // Continue anyway - at least the visit is recorded
            }
          } else {
            console.error('Failed to upload image');
            setError('Failed to upload image, but visit was recorded.');
            // Continue anyway - at least the visit is recorded
          }
        } catch (uploadErr) {
          console.error('Error uploading image:', uploadErr);
          setError('Failed to upload image, but visit was recorded.');
          // Continue anyway - at least the visit is recorded
        }
      }
      
      // Show confirmation popup instead of navigating away immediately
      setShowConfirmation(true);
      setSaving(false);
      
    } catch (err) {
      console.error('Error recording visit:', err);
      setError(err instanceof Error ? err.message : 'Failed to record visit');
      setSaving(false);
    }
  };
  
  // Handle return to shops list after confirmation
  const handleReturnToShops = () => {
    navigate('/shops', { state: { success: true, message: 'Visit recorded successfully' } });
  };
  
  // Handle "Place Order" button click in confirmation
  const handlePlaceOrder = () => {
    // Navigate to the order placement page with necessary information
    navigate(`/shops/${shopId}/order`, { 
      state: { 
        visitId: visitId,
        shopName: shop?.name
      } 
    });
  };
  
  // Handle back button
  const handleBack = () => {
    navigate('/shops');
  };
  
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="flex items-center py-4 px-4 bg-white shadow-sm">
        <button 
          onClick={handleBack}
          className="text-gray-800 focus:outline-none mr-3"
          aria-label="Back"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold">Record Visit</h1>
      </header>
      
      {/* Main Content */}
      <main className="flex-grow px-4 pb-20 pt-4">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4 flex items-start">
            <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        ) : shop ? (
          <>
            {/* Shop Details */}
            <div className="mb-6 bg-blue-50 p-4 rounded-lg">
              <h2 className="text-xl font-bold text-blue-900">{shop.name}</h2>
              <div className="flex items-start mt-2 text-blue-800">
                <MapPin className="h-5 w-5 mr-2 min-w-5 mt-0.5" />
                <span>{shop.address}</span>
              </div>
            </div>
            
            {/* Visit Form */}
            <div className="space-y-6">
              {/* Photo Proof Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-gray-700 font-medium">
                    Take a Photo as Proof
                  </label>
                </div>
                
                {imagePreview ? (
                  <div className="mb-3 relative">
                    <img 
                      src={imagePreview} 
                      alt="Visit proof" 
                      className="w-full h-48 object-contain rounded-lg border border-gray-300 cursor-pointer"
                      onClick={handleImageClick}
                    />
                    <button
                      onClick={handleRemoveImage}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 shadow-md"
                      aria-label="Remove image"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div 
                    className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center mb-3 bg-gray-50"
                  >
                    <Camera className="h-10 w-10 mx-auto mb-2 text-gray-400" />
                    <p className="text-gray-500">Take a photo of the shop or receipt</p>
                  </div>
                )}
                
                <div className="flex justify-center">
                  <label className="flex items-center justify-center bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium py-2 px-4 rounded-md cursor-pointer transition-colors">
                    <Camera className="h-5 w-5 mr-2" />
                    <span>Capture Photo</span>
                    <input 
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleImageCapture}
                      className="sr-only" // Hide the actual input element
                    />
                  </label>
                </div>
              </div>
              
              {/* Notes */}
              <div>
                <label className="block text-gray-700 font-medium mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add any notes about this visit..."
                  value={notes}
                  onChange={handleNotesChange}
                ></textarea>
              </div>
              
              {/* Location Status */}
              {userLocation ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-green-600 font-medium">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    <span>Location captured</span>
                  </div>
                  <button 
                    onClick={handleRetryLocation}
                    className="text-blue-600 flex items-center text-sm"
                  >
                    <RefreshCw size={14} className="mr-1" />
                    Refresh
                  </button>
                </div>
              ) : (
                <div className="flex flex-col">
                  <div className="flex items-center text-yellow-600 font-medium mb-1">
                    {isGettingLocation ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-yellow-600 mr-2"></div>
                    ) : (
                      <AlertCircle className="h-5 w-5 mr-2" />
                    )}
                    <span>
                      {isGettingLocation ? 
                        `Getting your location (Strategy ${currentStrategyIndex + 1}/${locationStrategies.length})...` : 
                        'Location not available'
                      }
                    </span>
                  </div>
                  
                  {locationError && !isGettingLocation && (
                    <div className="text-sm text-red-600 ml-7 mb-2">{locationError}</div>
                  )}
                  
                  {!isGettingLocation && (
                    <button 
                      onClick={handleRetryLocation}
                      className="bg-yellow-100 text-yellow-800 px-3 py-2 rounded text-sm flex items-center justify-center w-full"
                    >
                      <RefreshCw size={14} className="mr-1" />
                      Retry Getting Location
                    </button>
                  )}
                </div>
              )}
              
              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={!userLocation || saving || !imageFile}
                className={`w-full py-3 px-4 rounded-lg font-medium text-white ${
                  !userLocation || saving || !imageFile ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {saving ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    {uploadProgress > 0 ? `Uploading... ${uploadProgress}%` : 'Recording Visit...'}
                  </div>
                ) : (
                  'Confirm Visit'
                )}
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-6 text-gray-500">
            Shop not found
          </div>
        )}
      </main>
      
      {/* Enlarged Image Modal */}
      {enlargedImage && imagePreview && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
          <div className="relative w-full max-w-2xl">
            <button 
              onClick={closeEnlargedImage}
              className="absolute top-2 right-2 text-white hover:text-gray-300 bg-gray-800 bg-opacity-50 rounded-full p-1"
              aria-label="Close"
            >
              <X size={24} />
            </button>
            <img 
              src={imagePreview} 
              alt="Enlarged proof" 
              className="max-h-[80vh] max-w-full mx-auto object-contain"
            />
          </div>
        </div>
      )}
      
      {/* Visit Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md relative shadow-xl border border-green-200">
            {/* Close button */}
            <button 
              onClick={handleReturnToShops}
              className="absolute top-4 right-4 text-gray-800"
              aria-label="Close"
            >
              <X size={24} />
            </button>
            
            <div className="p-6">
              {/* Success Icon */}
              <div className="flex justify-center mb-4">
                <div className="bg-green-500 rounded-full p-4">
                  <CheckCircle className="h-8 w-8 text-white" />
                </div>
              </div>
              
              {/* Title */}
              <h2 className="text-4xl font-bold text-center mb-2">Visit Confirmed</h2>
              
              {/* Shop Name */}
              <h3 className="text-2xl font-medium text-center mb-6">{shop?.name}</h3>
              
              {/* Location and Time */}
              <div className="mb-4">
                <div className="flex items-center mb-2">
                  <MapPin className="h-6 w-6 mr-2 text-gray-800" />
                  <span className="text-lg text-gray-800">GPS location captured</span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-6 w-6 mr-2 text-gray-800" />
                  <span className="text-lg text-gray-800">{visitTime}</span>
                </div>
              </div>
              
              {/* Image - Updated to better fit the preview box */}
              {imagePreview && (
                <div className="mb-4 rounded-xl overflow-hidden border border-gray-200 flex justify-center items-center bg-gray-50">
                  <div className="w-full h-40 relative">
                    <img 
                      src={uploadedImageUrl || imagePreview} 
                      alt="Visit proof" 
                      className="absolute inset-0 w-full h-full object-contain"
                    />
                  </div>
                </div>
              )}
              
              {/* Proof Status */}
              <div className="flex items-center mb-6">
                <div className="bg-green-500 rounded-full p-1 mr-2">
                  <CheckCircle className="h-5 w-5 text-white" />
                </div>
                <span className="text-lg">Proof of visit logged</span>
              </div>
              
              {/* Action Button */}
              <div className="flex flex-row gap-2">
              <button
                onClick={handlePlaceOrder}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-2 rounded-lg text-base"
              >
                Place Order
              </button>
                <button
                  onClick={handleReturnToShops}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-2 rounded-lg text-base"
                >
                  Entry Denied
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopVisitPage;