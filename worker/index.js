/**
 * Image Background Remover Worker
 * Cloudflare Worker that processes images via Remove.bg API
 */

const REMOVE_BG_API_URL = 'https://api.remove.bg/v1.0/removebg';

export default {
  async fetch(request, env, ctx) {
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

    // Only accept POST requests
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
        return jsonResponse({ error: 'API key not configured', code: 'CONFIG_ERROR' }, 500);
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
