# Privacy Policy for AI Flow for Meta.ai

**Last updated: June 2026**

## Data Collection & Storage

AI Flow for Meta.ai stores the following data **locally** in your browser using Chrome's built-in storage (`chrome.storage.local`):

| Data | Purpose |
|------|---------|
| Prompt text you enter | To process the queue and generate AI media |
| Download history (filenames, timestamps) | To show you download history and enable retry |
| Settings & preferences | To remember your configuration (delays, folder name, theme) |
| Character & style profiles you create | To apply consistent character/style descriptions to prompts |
| Download counter | For sequential file naming (1.png, 2.png, ...) |

## Data Sharing

- **No data is sent to any external server.** All processing happens entirely within your browser.
- **No data is shared with third parties.**
- **No analytics, tracking, or telemetry** is implemented.
- **No personal information** (email, name, location) is collected or stored.

## Data Access

- The extension only accesses `meta.ai` web pages (and their CDN domains `fbcdn.net`, `scontent`, `cdninstagram.com`) to automate prompts and scrape generated media.
- The extension does **not** read or access any other websites you visit.

## Data Removal

- All locally stored data can be cleared at any time via the extension's **Settings > Reset All Settings** button or by uninstalling the extension.
- Uninstalling the extension permanently removes all stored data from Chrome's local storage.

## Permissions

| Permission | Why It's Needed |
|------------|------------------|
| `downloads` | Save generated images/videos to your Downloads folder |
| `storage` | Save settings, queue, history locally |
| `sidePanel` | Display the extension UI in Chrome's side panel |
| `activeTab` | Interact with the active Meta AI tab for scanning/downloading |
| `scripting` | Inject the automation script into Meta AI pages |
| `tabs` | Find Meta AI tabs for queue automation |
| `host_permissions` (meta.ai) | Run the automation only on Meta AI's website |

## Contact

For questions or concerns, open an issue at:  
https://github.com/mk016/meta-autodownloader/issues
