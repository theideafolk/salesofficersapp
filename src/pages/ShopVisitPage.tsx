// Shop visit page component for recording shop visits
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Camera, MapPin, CheckCircle, Loader2 } from 'lucide-react';

interface Shop {
  shop_id: string;
  name: string;
  address: string;
  gps_location: string;
  geom_location?: string;
}

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
  const [uploadProgress, setUploadProgress] = useState(0);
  
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
  
  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          setError('Unable to get your location. Please ensure location services are enabled.');
        }
      );
    } else {
      setError('Geolocation is not supported by this browser');
    }
  }, []);
  
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
  
  // Handle notes change
  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
  };
  
  // Handle form submission to record the visit
  const handleSubmit = async () => {
    if (!user || !shopId || !userLocation) {
      setError('Missing required information');
      return;
    }
    
    try {
      setSaving(true);
      setError('');
      setUploadProgress(0);
      
      // Create a proper PostGIS point using ST_MakePoint and ST_SetSRID
      // This is done through a raw SQL query since we need to use PostGIS functions
      const { data: pointData, error: pointError } = await supabase.rpc('create_postgis_point', {
        longitude: userLocation.lng,
        latitude: userLocation.lat
      });
      
      // If creating the point through RPC fails, fall back to the standard point syntax
      const pointString = pointError 
        ? `(${userLocation.lng},${userLocation.lat})` 
        : pointData;
      
      // Create the visit record
      const { data: visitData, error: visitError } = await supabase
        .from('visits')
        .insert([
          {
            sales_officer_id: user.id,
            shop_id: shopId,
            gps_location: pointString,
            notes: notes || null,
          }
        ])
        .select('visit_id')
        .single();
        
      if (visitError) {
        throw new Error(`Failed to create visit: ${visitError.message}`);
      }
      
      // If we have an image, upload it and update the visit
      if (imageFile && visitData?.visit_id) {
        // Upload the image to storage
        const fileName = `visit-proofs/${visitData.visit_id}-${Date.now()}.jpg`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('visit-proofs')
          .upload(fileName, imageFile, {
            cacheControl: '3600',
            upsert: false,
            onUploadProgress: (progress) => {
              const percent = Math.round((progress.loaded / progress.total) * 100);
              setUploadProgress(percent);
            }
          });
          
        if (uploadError) {
          throw new Error(`Failed to upload image: ${uploadError.message}`);
        }
        
        // Get the public URL for the uploaded image
        const { data: publicURLData } = await supabase.storage
          .from('visit-proofs')
          .getPublicUrl(fileName);
          
        const imageUrl = publicURLData?.publicUrl;
        
        // Update the visit record with the image URL
        if (imageUrl) {
          const { error: updateError } = await supabase
            .from('visits')
            .update({ proof_image: imageUrl })
            .eq('visit_id', visitData.visit_id);
            
          if (updateError) {
            console.error('Error updating visit with image:', updateError);
          }
        }
      }
      
      // Navigate back to shop list with success message
      navigate('/shops', { state: { success: true, message: 'Visit recorded successfully' } });
      
    } catch (err) {
      console.error('Error recording visit:', err);
      setError(err instanceof Error ? err.message : 'Failed to record visit');
    } finally {
      setSaving(false);
    }
  };
  
  // Handle cancel button
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
        <h1 className="text-xl font-bold">Record Visit</h1>
      </header>
      
      {/* Main Content */}
      <main className="flex-grow px-4 pb-20 pt-4">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
            {error}
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
              {/* Photo Proof */}
              <div>
                <label className="block text-gray-700 font-medium mb-2">
                  Take a Photo as Proof
                </label>
                
                {imagePreview ? (
                  <div className="mb-3">
                    <img 
                      src={imagePreview} 
                      alt="Visit proof" 
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  </div>
                ) : (
                  <div 
                    className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center mb-3 bg-gray-50"
                  >
                    <Camera className="h-10 w-10 mx-auto mb-2 text-gray-400" />
                    <p className="text-gray-500">Take a photo of the shop or receipt</p>
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
                <div className="flex items-center text-green-600 font-medium">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  <span>Your location has been captured</span>
                </div>
              ) : (
                <div className="flex items-center text-yellow-600 font-medium">
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-yellow-600 mr-2"></div>
                  <span>Getting your location...</span>
                </div>
              )}
              
              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={!userLocation || saving}
                className={`w-full py-3 px-4 rounded-lg font-medium text-white ${
                  !userLocation || saving ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
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
              
              {/* Cancel Button */}
              <button
                onClick={handleCancel}
                disabled={saving}
                className="w-full py-3 px-4 rounded-lg font-medium bg-gray-200 hover:bg-gray-300 text-gray-800"
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-6 text-gray-500">
            Shop not found
          </div>
        )}
      </main>
    </div>
  );
};

export default ShopVisitPage;