# Image Background Remover

A simple, fast image background removal tool powered by Cloudflare Workers and Remove.bg API.

## Features

- 🚀 Fast processing via Cloudflare Workers
- 🎨 Clean, modern UI with drag-and-drop support
- 📱 Responsive design (mobile & desktop)
- 🔒 No image storage (processed in memory)
- ⬇️ Direct download of results

## Tech Stack

- **Frontend**: HTML/CSS/JavaScript (Cloudflare Pages)
- **Backend**: Cloudflare Worker
- **API**: Remove.bg API

## Setup

### 1. Install Wrangler CLI

```bash
npm install -g wrangler
```

### 2. Configure API Key

Set your Remove.bg API key as a Cloudflare secret:

```bash
wrangler secret put REMOVE_BG_API_KEY
# Enter your Remove.bg API key when prompted
```

Get your API key from [Remove.bg](https://www.remove.bg/api).

### 3. Development

```bash
wrangler dev
```

Visit `http://localhost:8787` to test locally.

### 4. Deploy

```bash
wrangler deploy
```

## API

### POST /

Remove background from an image.

**Request:**
- Content-Type: `multipart/form-data`
- Body: `image` (image file)

**Response:**
- Success: PNG image with transparent background
- Error: JSON with error message

**Example with cURL:**

```bash
curl -X POST -F "image=@photo.jpg" https://your-worker.workers.dev -o result.png
```

## Pricing

- **Cloudflare Workers**: Free (100,000 requests/day)
- **Cloudflare Pages**: Free
- **Remove.bg API**: 
  - Free tier: 50 images/month
  - Paid plans: Starting at $49/month for 500 images

## Project Structure

```
├── frontend/
│   └── index.html      # Frontend UI
├── worker/
│   └── index.js       # Cloudflare Worker
├── wrangler.toml      # Worker configuration
└── README.md
```

## License

MIT
