const express = require("express");
const router = express.Router();
const UploadController = require("../controllers/uploadController");

// IMPROVED multipart parser with better error handling
const parseMultipartData = (req, res, next) => {
  if (req.method !== 'POST') {
    return next();
  }

  const contentType = req.get('content-type');
  if (!contentType || !contentType.includes('multipart/form-data')) {
    return next();
  }

  console.log('📨 Parsing multipart data...');
  console.log('Content-Type:', contentType);

  try {
    // Get boundary from content-type header
    const boundary = contentType.split('boundary=')[1];
    if (!boundary) {
      throw new Error('No boundary found in content-type header');
    }

    console.log('📝 Boundary:', boundary);

    // Get raw body
    const rawBody = req.body;
    
    if (!rawBody) {
      throw new Error('No body data received');
    }

    // Ensure we have a buffer
    let bodyBuffer;
    if (Buffer.isBuffer(rawBody)) {
      bodyBuffer = rawBody;
    } else if (typeof rawBody === 'string') {
      bodyBuffer = Buffer.from(rawBody, 'binary');
    } else {
      throw new Error('Invalid body format - expected Buffer or string');
    }

    console.log('📊 Body buffer size:', bodyBuffer.length, 'bytes');

    if (bodyBuffer.length === 0) {
      throw new Error('Empty body received');
    }

    // Parse the multipart data
    const parts = parseMultipartBuffer(bodyBuffer, boundary);
    
    if (!parts) {
      throw new Error('Failed to parse multipart data');
    }

    console.log('✅ Parsed multipart data:', {
      fieldCount: Object.keys(parts.fields).length,
      fileCount: parts.files.length,
      fields: Object.keys(parts.fields),
      files: parts.files.map(f => ({ name: f.originalname, size: f.size, type: f.mimetype }))
    });

    // Set parsed data on request
    req.body = parts.fields || {};
    req.file = parts.files[0] || null;
    req.files = parts.files || [];

    next();
  } catch (error) {
    console.error('❌ Multipart parse error:', error);
    res.status(400).json({
      success: false,
      error: `Failed to parse multipart data: ${error.message}`,
      details: 'Make sure you are sending data as multipart/form-data with proper boundary'
    });
  }
};

// IMPROVED multipart buffer parser
function parseMultipartBuffer(buffer, boundary) {
  try {
    const fields = {};
    const files = [];
    
    const boundaryBuffer = Buffer.from(`--${boundary}`);
    // const endBoundaryBuffer = Buffer.from(`--${boundary}--`);
    
    console.log('🔍 Searching for parts with boundary:', boundary);
    
    let position = 0;
    const parts = [];
    
    // Find all parts
    while (position < buffer.length) {
      const boundaryIndex = buffer.indexOf(boundaryBuffer, position);
      
      if (boundaryIndex === -1) {
        console.log('📍 No more boundaries found');
        break;
      }
      
      // Skip the first boundary (start of first part)
      if (position === 0) {
        position = boundaryIndex + boundaryBuffer.length;
        // Skip CRLF after boundary
        if (buffer.slice(position, position + 2).toString() === '\r\n') {
          position += 2;
        }
        continue;
      }
      
      // Extract part data (from previous position to current boundary)
      const partData = buffer.slice(position, boundaryIndex);
      if (partData.length > 0) {
        parts.push(partData);
      }
      
      // Move position after current boundary
      position = boundaryIndex + boundaryBuffer.length;
      
      // Check if this is the end boundary
      if (buffer.slice(position, position + 2).toString() === '--') {
        console.log('📍 Found end boundary');
        break;
      }
      
      // Skip CRLF after boundary
      if (buffer.slice(position, position + 2).toString() === '\r\n') {
        position += 2;
      }
    }
    
    console.log('📦 Found', parts.length, 'parts');
    
    // Process each part
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      
      if (part.length === 0) {
        console.log(`⚠️ Part ${i} is empty, skipping`);
        continue;
      }
      
      // Find the end of headers (double CRLF)
      const headerEndIndex = part.indexOf('\r\n\r\n');
      
      if (headerEndIndex === -1) {
        console.log(`⚠️ Part ${i} has no header separator, skipping`);
        continue;
      }
      
      const headerSection = part.slice(0, headerEndIndex).toString();
      const bodySection = part.slice(headerEndIndex + 4);
      
      // Remove trailing CRLF from body
      const actualBody = bodySection.slice(0, -2);
      
      console.log(`📋 Part ${i} headers:`, headerSection);
      console.log(`📦 Part ${i} body size:`, actualBody.length);
      
      // Parse headers
      const headers = {};
      const headerLines = headerSection.split('\r\n');
      
      for (const line of headerLines) {
        const colonIndex = line.indexOf(':');
        if (colonIndex > -1) {
          const key = line.slice(0, colonIndex).trim().toLowerCase();
          const value = line.slice(colonIndex + 1).trim();
          headers[key] = value;
        }
      }
      
      const contentDisposition = headers['content-disposition'];
      if (!contentDisposition) {
        console.log(`⚠️ Part ${i} has no content-disposition header, skipping`);
        continue;
      }
      
      // Parse content-disposition
      const nameMatch = contentDisposition.match(/name="([^"]+)"/);
      const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
      
      if (!nameMatch) {
        console.log(`⚠️ Part ${i} has no name in content-disposition, skipping`);
        continue;
      }
      
      const fieldName = nameMatch[1];
      
      if (filenameMatch) {
        // This is a file field
        const filename = filenameMatch[1];
        const contentType = headers['content-type'] || 'application/octet-stream';
        
        const fileObject = {
          fieldname: fieldName,
          originalname: filename,
          encoding: '7bit',
          mimetype: contentType,
          buffer: actualBody,
          size: actualBody.length
        };
        
        files.push(fileObject);
        console.log(`📁 Added file: ${filename} (${actualBody.length} bytes, ${contentType})`);
        
      } else {
        // This is a regular field
        const fieldValue = actualBody.toString('utf8');
        fields[fieldName] = fieldValue;
        console.log(`📝 Added field: ${fieldName} = ${fieldValue}`);
      }
    }
    
    return { fields, files };
    
  } catch (error) {
    console.error('❌ Error in parseMultipartBuffer:', error);
    throw error;
  }
}

// Apply validation and parsing to upload routes
router.post('/community-media', 
  parseMultipartData, 
  UploadController.uploadCommunityMedia
);

router.post('/image', 
  parseMultipartData, 
  UploadController.uploadImage
);

// Non-file routes (use JSON middleware)
router.get('/files', UploadController.getFiles);
router.delete('/files/:fileId', UploadController.deleteFile);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Upload service is healthy',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;