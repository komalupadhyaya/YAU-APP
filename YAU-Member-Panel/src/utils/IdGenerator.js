import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import html2canvas from 'html2canvas';
import { jsPDF } from "jspdf";
import { db, storage } from "../firebase/config";
import logoUrl from "../assets/YAU_Logo.png";

// Image cache for better performance
const imageCache = new Map();

// Optimized image conversion with caching and compression
const imageToBase64 = async (url) => {
  if (!url) return null;
  
  // Check cache first
  if (imageCache.has(url)) {
    return imageCache.get(url);
  }
  
  try {
    const response = await fetch(url, { 
      mode: 'cors',
      cache: 'force-cache',
      headers: {
        'Accept': 'image/*'
      }
    });
    
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    
    const blob = await response.blob();
    
    // Optimize image size if too large (compress images over 500KB)
    if (blob.size > 500000) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      return new Promise((resolve, reject) => {
        img.onload = () => {
          const maxWidth = 400;
          const maxHeight = 400;
          let { width, height } = img;
          
          // Calculate new dimensions
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width *= ratio;
            height *= ratio;
          }
          
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
          
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
          imageCache.set(url, compressedBase64);
          resolve(compressedBase64);
        };
        img.onerror = reject;
        img.src = URL.createObjectURL(blob);
      });
    }
    
    // Regular conversion for smaller images
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        imageCache.set(url, result);
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    
  } catch (error) {
    console.error(`Error converting image to base64: ${url}`, error);
    return null;
  }
};

// Show loading toast
const showLoadingToast = (message) => {
  const toast = document.createElement('div');
  toast.id = 'loading-toast';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #1e40af;
    color: white;
    padding: 12px 20px;
    border-radius: 6px;
    z-index: 10000;
    font-family: Arial, sans-serif;
    font-size: 14px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    animation: slideIn 0.3s ease-out;
  `;
  
  // Add animation styles
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
  
  document.body.appendChild(toast);
  return toast;
};

// Hide loading toast
const hideLoadingToast = () => {
  const toast = document.getElementById('loading-toast');
  if (toast) {
    toast.style.animation = 'slideIn 0.3s ease-out reverse';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }
};

export const generateAndSaveIDCard = async (childData, parentId, format = 'both') => {
  const { id, name, dob, location, headshotUrl, expirationDate } = childData;
  
  const toast = showLoadingToast('Generating ID card...');

  try {
    console.log('Processing images...', { logoUrl, headshotUrl });
    
    // Convert images to base64 with optimization
    const [logoBase64, headshotBase64] = await Promise.all([
      imageToBase64(logoUrl).catch(() => logoUrl),
      headshotUrl ? imageToBase64(headshotUrl).catch(() => null) : Promise.resolve(null)
    ]);

    console.log('Images processed:', { 
      logo: logoBase64 ? 'Success' : 'Failed',
      headshot: headshotBase64 ? 'Success' : 'Failed'
    });

    // Create the ID card element with optimized styles
    const idCardElement = document.createElement('div');
    idCardElement.style.cssText = `
      width: 300px;
      margin: 0 auto;
      font-family: Arial, sans-serif;
      position: absolute;
      left: -9999px;
      top: 0;
      visibility: hidden;
      background: white;
    `;
    
    idCardElement.innerHTML = `
      <div style="background: white; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden; width: 300px;">
        <!-- Header with Logo -->
        <div style="background: white; padding: 4px; text-align: center;">
          <img src="${logoBase64 || logoUrl}" alt="Logo" style="width: 175px; height: auto; display: block; margin: 0 auto;" crossorigin="anonymous" />
        </div>
        
        <!-- Main content area -->
        <div style="background: #f3f4f6;">
          <div style="background: #1e40af; color: white; text-align: center; padding: 4px; font-style: italic; font-size: 14px;">
            Youth Athlete University
          </div>
          
          <!-- Red stripe -->
          <div style="background: #dc2626; height: 4px; margin-bottom: 12px;"></div>
          
          <!-- Photo and Info Section -->
          <div style="display: flex; align-items: flex-start; gap: 12px; padding: 8px;">
            <div style="width: 160px; height: 200px; overflow: hidden; flex-shrink: 0;">
              ${
                headshotBase64
                  ? `<img src="${headshotBase64}" alt="Photo" style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px; display: block;" crossorigin="anonymous" />`
                  : `<div style="width: 100%; height: 100%; background: #e5e7eb; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #6b7280; font-size: 14px; text-align: center;">No Photo</div>`
              }
            </div>
            
            <div style="flex: 1; min-width: 0;">
              <h3 style="color: #1e40af; font-weight: bold; font-size: 18px; margin: 0 0 8px 0; line-height: 1.2; word-wrap: break-word;">
                ${name || 'N/A'}
              </h3>
              <div style="font-size: 14px; color: #4b5563; line-height: 1.4;">
                <p style="margin: 4px 0;"><strong>DOB:</strong> ${dob || 'N/A'}</p>
                <p style="margin: 4px 0;"><strong>Location:</strong> ${location || 'N/A'}</p>
              </div>
            </div>
          </div>
          
          <!-- Expiration Date -->
          <div style="padding: 8px; text-align: center; color: #1e40af; font-weight: bold; font-size: 14px; margin-top: 12px;">
            Exp: ${expirationDate || 'N/A'}
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(idCardElement);

    // Wait for images to load (reduced from 1000ms)
    await new Promise(resolve => setTimeout(resolve, 300));

    let pngUrl = null;
    let pdfUrl = null;

    try {
      console.log('Generating canvas...');
      
      // Generate optimized canvas
      const canvas = await html2canvas(idCardElement, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        logging: false,
        backgroundColor: '#ffffff',
        width: 300,
        height: 450,
        removeContainer: false,
        imageTimeout: 0,
        onclone: (clonedDoc) => {
          // Ensure all images are loaded in the cloned document
          const images = clonedDoc.getElementsByTagName('img');
          Array.from(images).forEach(img => {
            img.style.display = 'block';
          });
        }
      });
      
      console.log('Canvas generated, size:', canvas.width, 'x', canvas.height);
      
      // Update toast message
      toast.textContent = 'Uploading files...';
      
      // Generate PNG with optimized compression
      const pngDataUrl = canvas.toDataURL('image/png', 0.9);
      const pngBlob = await (await fetch(pngDataUrl)).blob();
      const pngStorageRef = ref(storage, `id-cards/${parentId}/${id}/id_card.png`);
      await uploadBytes(pngStorageRef, pngBlob);
      pngUrl = await getDownloadURL(pngStorageRef);
      
      console.log('PNG uploaded successfully');

      // Generate PDF if requested
      if (format === 'both' || format === 'pdf') {
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: [80, 120],
          compress: true
        });
        
        // Use JPEG format for smaller file size
        const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        pdf.addImage(jpegDataUrl, 'JPEG', 0, 0, 80, 120, undefined, 'FAST');
        
        const pdfBlob = pdf.output('blob');
        const pdfStorageRef = ref(storage, `id-cards/${parentId}/${id}/id_card.pdf`);
        await uploadBytes(pdfStorageRef, pdfBlob);
        pdfUrl = await getDownloadURL(pdfStorageRef);
        console.log('PDF uploaded successfully');
      }

      // Update Firebase document
      toast.textContent = 'Updating database...';
      const parentRef = doc(db, "members", parentId);
      const parentSnap = await getDoc(parentRef);
      if (parentSnap.exists()) {
        const parentData = parentSnap.data();
        const updatedStudents = parentData.students.map(student =>
          student.uid === id
            ? { ...student, generatedIdUrl: pngUrl, generatedPdfUrl: pdfUrl }
            : student
        );
        await updateDoc(parentRef, { students: updatedStudents });
      }

      hideLoadingToast();
      return { png: pngUrl, pdf: pdfUrl };
      
    } catch (error) {
      console.error('Error generating ID card:', error);
      throw error;
    } finally {
      if (document.body.contains(idCardElement)) {
        document.body.removeChild(idCardElement);
      }
    }
    
  } catch (error) {
    hideLoadingToast();
    console.error('Error in generateAndSaveIDCard:', error);
    throw error;
  }
};

// Optimized download function with retry mechanism
export const downloadGeneratedID = async (url, filename, maxRetries = 2) => {
  const downloadWithMethod = async (method, retryCount = 0) => {
    const toast = showLoadingToast(`Preparing download...${retryCount > 0 ? ` (Attempt ${retryCount + 1})` : ''}`);
    
    try {
      if (method === 'direct') {
        // Method 1: Direct link download (fastest)
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        hideLoadingToast();
        return true;
        
      } else if (method === 'fetch') {
        // Method 2: Fetch and create blob URL
        toast.textContent = 'Downloading file...';
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const response = await fetch(url, {
          method: 'GET',
          mode: 'cors',
          cache: 'default',
          signal: controller.signal,
          headers: {
            'Accept': 'application/pdf,image/*,*/*',
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Get file size for progress tracking
        const contentLength = response.headers.get('content-length');
        const total = parseInt(contentLength, 10);
        let loaded = 0;

        const reader = response.body?.getReader();
        const chunks = [];

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            chunks.push(value);
            loaded += value.length;
            
            if (total) {
              const percent = Math.round((loaded / total) * 100);
              toast.textContent = `Downloading... ${percent}%`;
            }
          }
        }

        const blob = new Blob(chunks, { 
          type: response.headers.get('content-type') || 'application/octet-stream' 
        });
        
        toast.textContent = 'Starting download...';
        
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up after a delay
        setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
        
        hideLoadingToast();
        return true;
        
      } else if (method === 'window') {
        // Method 3: Open in new window/tab
        const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
        if (!newWindow) {
          throw new Error('Popup blocked. Please allow popups and try again.');
        }
        
        hideLoadingToast();
        return true;
      }
      
    } catch (error) {
      hideLoadingToast();
      
      if (error.name === 'AbortError') {
        throw new Error('Download timed out. Please try again.');
      }
      
      console.error(`Download method ${method} failed:`, error);
      throw error;
    }
  };

  // Try different download methods in order
  const methods = ['direct', 'fetch', 'window'];
  let lastError;

  for (let retryCount = 0; retryCount <= maxRetries; retryCount++) {
    for (const method of methods) {
      try {
        const success = await downloadWithMethod(method, retryCount);
        if (success) return;
      } catch (error) {
        lastError = error;
        console.warn(`Method ${method} failed (attempt ${retryCount + 1}):`, error.message);
        
        // Wait before retry
        if (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        }
      }
    }
  }

  // All methods failed
  const errorMessage = lastError?.message?.includes('timed out') 
    ? 'Download timed out. Please check your internet connection and try again.'
    : lastError?.message?.includes('Popup blocked')
    ? 'Download blocked. Please allow popups for this site and try again.'
    : 'Download failed. Please try again or contact support if the problem persists.';
  
  alert(errorMessage);
  throw lastError || new Error('All download methods failed');
};

// Utility function to download with progress feedback
export const downloadWithProgress = async (url, filename) => {
  try {
    await downloadGeneratedID(url, filename);
  } catch (error) {
    console.error('Download failed:', error);
    // Could implement additional user feedback here
  }
};

// Clean up function to clear image cache if needed
export const clearImageCache = () => {
  imageCache.clear();
};

// Get cache size for debugging
export const getCacheInfo = () => {
  return {
    size: imageCache.size,
    keys: Array.from(imageCache.keys())
  };
};