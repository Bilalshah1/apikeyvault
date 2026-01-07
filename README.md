# APIKeyVault

A secure, offline-first browser extension for managing API keys. All data is encrypted and stored locally in your browser—no cloud, no backend, no external dependencies.

## Features

- **Offline-first**: Everything runs locally in your browser
- **Encrypted storage**: API keys are encrypted with AES-GCM before storage
- **Master password protection**: Single master password unlocks your vault
- **Auto-lock**: Vault automatically locks after 5 hours of inactivity
- **Health testing**: Test API keys for OpenAI, Gemini, Grok, Anthropic, and HuggingFace
- **Bulk testing**: Test all API keys at once

## Installation

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select the project folder
5. The extension icon will appear in your toolbar

## Usage

### First Time Setup

1. Click the extension icon
2. Enter a master password (minimum 8 characters)
3. Click **Create vault**

**Important**: Your master password is never stored. If you forget it, you cannot recover your API keys.

### Unlocking the Vault

- **Auto-unlock**: If you've used the extension within the last 5 hours, it unlocks automatically
- **Manual unlock**: After 5 hours of inactivity, enter your master password to unlock

### Managing API Keys

- **Add**: Click **Add**, enter provider name (e.g., "OpenAI", "Gemini") and API key, then **Save**
- **View**: Click any key in the list to view details
- **Edit**: Select a key, modify it, then **Save**
- **Delete**: Select a key and click **Delete**
- **Test**: Click **Health Check** to verify an API key works
- **Test All**: Click **Test All** to verify all API keys

## Supported Providers

- OpenAI
- Google Gemini
- Grok (x.ai)
- Anthropic (Claude)
- HuggingFace

## Security

- Master password is used to derive an encryption key (PBKDF2 with 150,000 iterations)
- Encryption key never leaves memory and is never stored
- API keys are encrypted with AES-GCM before being saved to IndexedDB
- Vault auto-locks after 5 hours of inactivity
- All encryption uses Web Crypto API (no external libraries)

## Privacy

- No data is sent to external servers
- No analytics or tracking
- All data stays in your browser's IndexedDB
- Extension only makes network requests when testing API keys

## Requirements

- Chrome/Edge/Brave (Manifest V3 compatible)
- No additional dependencies



