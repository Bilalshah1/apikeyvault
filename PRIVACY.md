# Privacy Policy — APIKeyVault

**Last updated:** 29 July 2026

APIKeyVault is an offline-first browser extension for storing API keys. This
policy describes exactly what the extension does with your data.

## Summary

APIKeyVault has no backend, no account system, and no analytics. Your API keys
are encrypted in your browser and stored only in your browser. The developer
cannot read them and never receives them.

## What is collected

**Nothing is collected by the developer.** No data is transmitted to the
developer, to any analytics service, or to any third-party server operated on
the developer's behalf.

## What is stored, and where

All of the following is stored locally on your own device and never leaves it,
except as described under *Network requests* below.

| Data | Where it is stored | Form |
| --- | --- | --- |
| API keys | Browser IndexedDB (`apiKeyVault`) | Encrypted with AES-GCM |
| Provider names you enter | Browser IndexedDB | Plaintext |
| Creation timestamps | Browser IndexedDB | Plaintext |
| Theme preference | `chrome.storage.local` | Plaintext |
| Last health-check result per key (valid/failing, HTTP status, timestamp) | `chrome.storage.local` | Plaintext — contains no key material |

Your master password is **never stored**, in any form. It is used to derive an
encryption key that exists only in memory while the vault is unlocked, and is
discarded when the vault locks. If you forget it, your stored keys cannot be
recovered by you, by the developer, or by anyone else.

## Network requests

APIKeyVault makes network requests in exactly one situation: when you click
**Health check** or **Test every key**.

In that case, the selected API key is sent to the API provider it belongs to, so
that the provider can confirm whether the key is valid. The request goes
directly from your browser to the provider. It is not proxied through any server
operated by the developer.

The provider endpoints contacted are:

- OpenAI — `https://api.openai.com`
- Google Gemini — `https://generativelanguage.googleapis.com`
- Grok (x.AI) — `https://api.x.ai`
- Anthropic — `https://api.anthropic.com`
- HuggingFace — `https://api-inference.huggingface.co`

Each provider's own privacy policy and terms govern what it does with a request
you send it. APIKeyVault contacts no other hosts.

If you never run a health check, APIKeyVault makes no network requests at all.

## Permissions and why they are needed

- **`storage`** — saves your theme preference and the last health-check result
  for each key. No key material is written to this store.
- **Host permissions** for the five provider domains listed above — required so
  the health check can contact those providers. Each host is listed
  individually; the extension requests no broad or wildcard host access, and
  cannot read or modify any web page you visit.

## Data sharing and sale

No data is shared, sold, rented, or transferred to anyone. There is no
third-party recipient of any kind.

## Deleting your data

Deleting a key in the extension removes it from IndexedDB immediately.
Uninstalling the extension removes all of its stored data — the encrypted vault,
the theme preference, and the cached health results — from your browser.

## Changes to this policy

Any change to this policy will be published in this file in the extension's
public repository, with an updated date at the top.

## Contact

Questions about this policy can be raised as an issue in the project's
repository.
