# Native Folder Picker Options for a Node-Based Foundry Daemon

## Question

Can a browser-based Foundry WebUI ask a local Node daemon to open a native file or directory picker without Electron?

## Findings

### Browser APIs do not return a usable absolute path

The browser File System Access API exposes a `FileSystemDirectoryHandle`, not a local absolute path. The traditional directory upload input exposes selected files and relative paths, but does not grant a server the user's filesystem path. These APIs are suitable for uploading or editing browser-granted handles, not for configuring a daemon that must create filesystem links at an absolute Target path.

Sources:

- [MDN: File System API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API)
- [MDN: `showDirectoryPicker()`](https://developer.mozilla.org/en-US/docs/Web/API/Window/showDirectoryPicker)

### Existing Node packages exist, but none is a strong default for Foundry

`node-file-dialog` documents a server-side GUI dialog with directory, open-file, save-file, and multi-file modes. Its npm metadata reports version `1.0.3`, last published in 2020, 64-bit-only compatibility in its README, and an unpacked package size of roughly 35 MB. It is not a good long-term cross-platform foundation without verifying every target OS and Node ABI.

Source:

- [node-file-dialog README and repository](https://github.com/XploreX/node-file-dialog)

`native-file-dialog` is a small native Node addon based on Rust's `wfd` crate. Its README states support for Windows and macOS, but not Linux. Its npm metadata reports version `0.2.0`, last published in 2021, and the package contains a prebuilt `index.node` binary. This makes platform and Node ABI coverage a release risk.

Source:

- [native-file-dialog package](https://www.npmjs.com/package/native-file-dialog)

`file-dialog` is a browser-side helper that returns a `FileList`; it does not provide a native absolute directory path and is not appropriate for Target configuration.

Source:

- [file-dialog package](https://www.npmjs.com/package/file-dialog)

### Desktop-shell plugins are stronger, but change the runtime shape

`@tauri-apps/plugin-dialog` is an actively maintained official Tauri plugin for native dialogs. It is a good option when Foundry has a Tauri desktop shell, but it is not a drop-in library for a standalone Node daemon and browser WebUI.

Source:

- [Tauri dialog plugin documentation](https://v2.tauri.app/plugin/dialog/)

## Recommended seam

Define a narrow Core port and keep platform behavior in adapters:

```text
DirectoryPicker port
  - macOS adapter
  - Windows adapter
  - Linux adapter
```

The daemon exposes a typed local capability such as `selectDirectory`. The adapter may initially call a platform-native command or a small bundled helper. The API must never expose arbitrary command execution or arbitrary filesystem access.

Node's `child_process` APIs are sufficient to invoke a fixed, validated platform command, but command availability and platform UX must be tested separately.

Source:

- [Node.js `child_process` documentation](https://nodejs.org/api/child_process.html)

## Recommendation for Foundry

Do not add `node-file-dialog` or `native-file-dialog` to the Core without a dedicated platform and ABI validation task. Keep the `DirectoryPicker` interface in the daemon contract, start with one explicitly supported platform adapter, and add a small native helper when cross-platform packaging becomes a product requirement.

