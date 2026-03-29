# MySocks 3D Product Configurator

A comprehensive 3D product customization tool running locally. This application relies completely on realistic mock data rather than WooCommerce and Firebase live APIs, enabling a fully offline experience without CORS issues or third-party dependencies.

## Features

- **Offline Support**: Runs entirely offline using mock local data.
- **Three.js Integrations**: Handles loading models (`.glb`, `.gltf`) and environments using `@react-three/drei`.
- **Localization**: Localized resources that do not trigger HTTP fetch errors.
- **Dynamic Assets**: Assets like models and HDRs are locally served from the `/public` folder.

## Setup Instructions

### 1. Installation

Ensure you have Node.js and NPM installed. Open a terminal and run:

```bash
# Install required dependencies
npm install
```

### 2. Environment Configuration

Copy the example `.env.example` file to create your own `.env` file for running the local project. 

```bash
# Standard copy command (Windows cmd)
copy .env.example .env

# PowerShell/Bash
cp .env.example .env
```

You **do not** need to provide real WooCommerce credentials (`VITE_WC_CONSUMER_KEY`, etc.). The application will detect missing environment variables and default correctly to local `mockData`.

### 3. Running Locally

Start the Vite development server:

```bash
npm run dev
```

The application should start up dynamically at `http://localhost:5173` with simulated products and categories!

## Environment Variables

- `VITE_WOOCOMMERCE_URL`: (Optional) Setting this will activate real API calls. If left empty, the app runs offline.
- `VITE_BASE_URL`: Defines the path prefix for asset fetching (defaults to `/`).
- `VITE_GEMINI_API_KEY`: (Optional) Provides enhanced text generation capabilities using Google Gemini API.

## Project Structure

- `/src/data/mockData.js`: Centralized placeholder definitions for API responses.
- `/src/services/woocommerceApi.js`: Core service file modified to return local HTTP Mock logic via an Axios Interceptor if standard keys are missing.
- `/public/models/` and `/public/hdri/`: Assets served statically on localhost runtime to resolve CORS model loads.
