/**
 * Image Background Remover Worker
 * Cloudflare Worker that processes images via Remove.bg API
 * Serves frontend and handles API requests
 */

const REMOVE_BG_API_URL = 'https://api.remove.bg/v1.0/removebg';

// Simple HTML for the frontend
const FRONTEND_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Image Background Remover</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    .container { max-width: 900px; margin: 0 auto; }
    header { text-align: center; color: white; margin-bottom: 30px; }
    header h1 { font-size: 2.5rem; margin-bottom: 10px; text-shadow: 2px 2px 4px rgba(0,0,0,0.2); }
    header p { opacity: 0.9; }
    .upload-zone {
      background: white;
      border-radius: 20px;
      padding: 60px 40px;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      margin-bottom: 30px;
      transition: all 0.3s ease;
      cursor: pointer;
    }
    .upload-zone:hover { transform: translateY(-5px); }
    .upload-zone.dragover { border: 3px dashed #667eea; background: #f8f9ff; }
    .upload-zone.has-image { padding: 30px; }
    .upload-icon { font-size: 80px; margin-bottom: 20px; }
    .upload-zone h2 { color: #333; margin-bottom: 10px; }
    .upload-zone p { color: #666; }
    .upload-zone input[type="file"] { display: none; }
    .preview-container { display: none; gap: 20px; margin-bottom: 20px; }
    .preview-container.show { display: grid; grid-template-columns: 1fr 1fr; }
    .preview-box { background: white; border-radius: 15px; padding: 20px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
    .preview-box h3 { color: #333; margin-bottom: 15px; font-size: 1rem; }
    .preview-box img { max-width: 100%; max-height: 300px; border-radius: 10px; background: repeating-conic-gradient(#ccc 0% 25%, white 0% 50%) 50% / 20px 20px; }
    .actions { display: none; gap: 15px; justify-content: center; flex-wrap: wrap; }
    .actions.show { display: flex; }
    button { padding: 15px 30px; border: none; border-radius: 10px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: all 0.3s ease; }
    .btn-primary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4); }
    .btn-secondary { background: #f0f0f0; color: #333; }
    .btn-secondary:hover { background: #e0e0e0; }
    .loading { display: none; text-align: center; padding: 40px; }
    .loading.show { display: block; }
    .spinner { width: 60px; height: 60px; border: 4px solid #f3f3f3; border-top: 4px solid #667eea; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    .error-message { display: none; background: #ff6b6b; color: white; padding: 15px 20px; border-radius: 10px; margin-top: 20px; text-align: center; }
    .error-message.show { display: block; }
    footer { text-align: center; color: white; opacity: 0.8; margin-top: 30px; }
    @media (max-width: 600px) { .preview-container.show { grid-template-columns: 1fr; } header h1 { font-size: 1.8rem; } }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🖼️ Image Background Remover</h1>
      <p>Remove image backgrounds with one click</p>
    </header>
    <div class="upload-zone" id="uploadZone">
      <div class="upload-content">
        <div class="upload-icon">📤</div>
        <h2>Drop your image here</h2>
        <p>or click to select a file</p>
        <p style="margin-top: 10px; font-size: 0.9rem; color: #999;">Supports JPG, PNG, WebP (max 10MB)</p>
      </div>
      <input type="file" id="fileInput" accept="image/jpeg,image/png,image/webp">
      <div class="preview-container" id="previewContainer">
        <div class="preview-box"><h3>Original</h3><img id="originalPreview" alt="Original"></div>
        <div class="preview-box"><h3>Result</h3><img id="resultPreview" alt="Result"></div>
      </div>
      <div class="actions" id="actions">
        <button class="btn-primary" id="downloadBtn">⬇️ Download Result</button>
        <button class="btn-secondary" id="resetBtn">🔄 Try Another</button>
      </div>
    </div>
    <div class="loading" id="loading"><div class="spinner"></div><p>Removing background...</p></div>
    <div class="error-message" id="errorMessage"></div>
    <footer><p>Powered by Remove.bg API</p></footer>
  </div>
  <script>
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');
    const previewContainer = document.getElementById('previewContainer');
    const originalPreview = document.getElementById('originalPreview');
    const resultPreview = document.getElementById('resultPreview');
    const actions = document.getElementById('actions');
    const loading = document.getElementById('loading');
    const errorMessage = document.getElementById('errorMessage');
    const downloadBtn = document.getElementById('downloadBtn');
    const resetBtn = document.getElementById('resetBtn');
    let resultBlob = null;
    uploadZone.addEventListener('click', () => fileInput.click());
    uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('dragover'); });
    uploadZone.addEventListener('dragleave', () => { uploadZone.classList.remove('dragover'); });
    uploadZone.addEventListener('drop', (e) => { e.preventDefault(); uploadZone.classList.remove('dragover'); if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]); });
    fileInput.addEventListener('change', (e) => { if (e.target.files.length > 0) handleFile(e.target.files[0]); });
    async function handleFile(file) {
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) { showError('Please upload a JPG, PNG, or WebP image'); return; }
      if (file.size > 10 * 1024 * 1024) { showError('File too large. Maximum size is 10MB'); return; }
      hideError();
      uploadZone.classList.add('has-image');
      const originalUrl = URL.createObjectURL(file);
      originalPreview.src = originalUrl;
      previewContainer.classList.add('show');
      document.querySelector('.upload-content').style.display = 'none';
      loading.classList.add('show');
      try {
        const formData = new FormData();
        formData.append('image', file);
        const response = await fetch('/', { method: 'POST', body: formData });
        loading.classList.remove('show');
        if (!response.ok) { const error = await response.json(); throw new Error(error.error || 'Failed to remove background'); }
        resultBlob = await response.blob();
        const resultUrl = URL.createObjectURL(resultBlob);
        resultPreview.src = resultUrl;
        actions.classList.add('show');
      } catch (error) { loading.classList.remove('show'); showError(error.message); reset(); }
    }
    downloadBtn.addEventListener('click', () => { if (resultBlob) { const url = URL.createObjectURL(resultBlob); const a = document.createElement('a'); a.href = url; a.download = 'background-removed.png'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); } });
    resetBtn.addEventListener('click', reset);
    function reset() { uploadZone.classList.remove('has-image'); previewContainer.classList.remove('show'); actions.classList.remove('show'); loading.classList.remove('show'); document.querySelector('.upload-content').style.display = 'block'; fileInput.value = ''; resultBlob = null; hideError(); }
    function showError(message) { errorMessage.textContent = message; errorMessage.classList.add('show'); }
    function hideError() { errorMessage.classList.remove('show'); }
  </script>
</body>
</html>`;

export default {
  async fetch(request, env, ctx) {
    // Handle GET request - serve frontend
    if (request.method === 'GET') {
      return new Response(FRONTEND_HTML, {
        headers: {
          'Content-Type': 'text/html;charset=utf-8',
          'Cache-Control': 'no-cache',
        },
      });
    }

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // Only accept POST requests for API
    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }, 405);
    }

    try {
      const formData = await request.formData();
      const imageFile = formData.get('image');

      if (!imageFile) {
        return jsonResponse({ error: 'No image provided', code: 'NO_IMAGE' }, 400);
      }

      // Validate file size (10MB max)
      if (imageFile.size > 10 * 1024 * 1024) {
        return jsonResponse({ error: 'File too large. Max size is 10MB', code: 'FILE_TOO_LARGE' }, 400);
      }

      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validTypes.includes(imageFile.type)) {
        return jsonResponse({ error: 'Invalid file type. Use JPG, PNG, or WebP', code: 'INVALID_FORMAT' }, 400);
      }

      // Prepare Remove.bg API request
      const rbFormData = new FormData();
      rbFormData.append('image_file', imageFile);
      rbFormData.append('size', 'regular');
      rbFormData.append('format', 'png');

      // Call Remove.bg API
      const apiKey = env.REMOVE_BG_API_KEY;
      if (!apiKey) {
        return jsonResponse({ error: 'API key not configured. Please contact the administrator.', code: 'CONFIG_ERROR' }, 500);
      }

      const response = await fetch(REMOVE_BG_API_URL, {
        method: 'POST',
        headers: {
          'X-Api-Key': apiKey,
        },
        body: rbFormData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Remove.bg API error:', errorText);
        
        if (response.status === 402) {
          return jsonResponse({ error: 'API credits exhausted', code: 'RATE_LIMIT' }, 402);
        }
        return jsonResponse({ error: 'Background removal failed', code: 'API_ERROR' }, 500);
      }

      // Return the processed image
      const resultBuffer = await response.arrayBuffer();
      
      return new Response(resultBuffer, {
        headers: {
          'Content-Type': 'image/png',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache',
        },
      });

    } catch (error) {
      console.error('Worker error:', error);
      return jsonResponse({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
    }
  },
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
