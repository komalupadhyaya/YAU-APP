import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import html2canvas from 'html2canvas';
import { jsPDF } from "jspdf";
import { db, storage } from "../firebase/config";
import logoUrl from "../components/assets/YAU_Logo.png";

export const generateAndSaveIDCard = async (childData, parentId, format = 'both') => {
  const { id, name, dob, location, headshotUrl, expirationDate } = childData;

  // Use a CORS proxy for the headshot
  const getProxiedUrl = (url) => {
    if (!url) return null;
    return `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
  };

  // Convert image to base64 with proxy
  const imageToBase64 = async (url) => {
    if (!url) return null;
    
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error converting image to base64:', error);
      return null;
    }
  };

  try {
    console.log('Processing images...');
    
    // Get proxied headshot URL
    const proxiedHeadshotUrl = getProxiedUrl(headshotUrl);
    
    // Convert images to base64
    const [logoBase64, headshotBase64] = await Promise.all([
      // Convert local logo
      imageToBase64(logoUrl).catch(() => logoUrl),
      // Convert proxied headshot
      proxiedHeadshotUrl ? imageToBase64(proxiedHeadshotUrl).catch(() => null) : Promise.resolve(null)
    ]);

    console.log('Images processed:', { 
      logo: logoBase64 ? 'Success' : 'Failed',
      headshot: headshotBase64 ? 'Success' : 'Failed'
    });

    // Create the ID card element
    const idCardElement = document.createElement('div');
    idCardElement.style.width = '300px';
    idCardElement.style.margin = '0 auto';
    idCardElement.style.fontFamily = 'Arial, sans-serif';
    idCardElement.style.position = 'absolute';
    idCardElement.style.left = '-9999px'; // Hide it off-screen
    
    idCardElement.innerHTML = `
      <div style="background: white; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden; width: 300px;">
        <!-- Header with Logo -->
        <div style="background: white; padding: 4px; text-align: center;">
          <img src="${logoBase64 || logoUrl}" alt="Logo" style="width: 175px; height: auto; display: block; margin: 0 auto;" />
        </div>
        
        <!-- Main content area -->
        <div style="background: #f3f4f6;">
          <div style="background: #1e40af; color: white; text-align: center; padding: 4px; font-style: italic; font-size: 14px; padding-bottom:5px">
            Youth Athlete University
          </div>
          
          <!-- Red stripe -->
          <div style="background: #dc2626; height: 4px; margin-bottom: 12px;"></div>
          
          <!-- Photo and Info Section -->
          <div style="display: flex; align-items: flex-start; gap: 12px; padding: 8px;">
            <div style="width: 160px; height: 200px; overflow: hidden; flex-shrink: 0;">
              ${
                headshotBase64
                  ? `<img src="${headshotBase64}" alt="Photo" style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px; display: block;" />`
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

    // Wait for images to load
    await new Promise(resolve => setTimeout(resolve, 1000));

    let pngUrl = null;
    let pdfUrl = null;

    try {
      console.log('Generating canvas...');
      
      // Generate PNG
      const canvas = await html2canvas(idCardElement, {
        scale: 2,
        useCORS: false,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: 300,
        height: 450,
        removeContainer: false,
      });
      
      console.log('Canvas generated, size:', canvas.width, 'x', canvas.height);
      
      const pngDataUrl = canvas.toDataURL('image/png', 1.0);
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
        });
        
        pdf.addImage(pngDataUrl, 'PNG', 0, 0, 80, 120);
        const pdfBlob = pdf.output('blob');
        const pdfStorageRef = ref(storage, `id-cards/${parentId}/${id}/id_card.pdf`);
        await uploadBytes(pdfStorageRef, pdfBlob);
        pdfUrl = await getDownloadURL(pdfStorageRef);
        
        console.log('PDF uploaded successfully');
      }

      // Update Firebase document
      const parentRef = doc(db, "members", parentId);
      const parentSnap = await getDoc(parentRef);
      if (parentSnap.exists()) {
        const parentData = parentSnap.data();
        const updatedStudents = parentData.students.map(student =>
          student.uid === id
            ? { ...student, generatedIdUrl: pngUrl }
            : student
        );
        await updateDoc(parentRef, { students: updatedStudents });
      }

      return { png: pngUrl, pdf: pdfUrl };
      
    } catch (error) {
      console.error('Error generating ID card:', error);
      throw error;
    } finally {
      document.body.removeChild(idCardElement);
    }
    
  } catch (error) {
    console.error('Error in generateAndSaveIDCard:', error);
    throw error;
  }
};

export const downloadGeneratedID = (url, filename) => {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};