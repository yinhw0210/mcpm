# macOS Install Troubleshooting

MCPM is not signed and notarized yet. On some Macs, macOS may report that the app is damaged after it is downloaded from GitHub Releases.

This is usually caused by the `com.apple.quarantine` download attribute. It does not necessarily mean the DMG is corrupted.

## Recommended Fix

Install MCPM first:

1. Open the downloaded DMG.
2. Drag `MCPM.app` into Applications.
3. Run this command in Terminal:

```bash
sudo xattr -dr com.apple.quarantine /Applications/MCPM.app && open /Applications/MCPM.app
```

This command only removes the download quarantine attribute from `/Applications/MCPM.app`. It does not disable Gatekeeper and does not change system-wide security settings.

## 中文说明

MCPM 目前还没有做 Apple Developer ID 签名和公证。部分 macOS 版本可能会在从 GitHub Releases 下载后提示应用“已损坏，无法打开”。

这通常是下载隔离属性 `com.apple.quarantine` 导致的，不一定代表 DMG 文件真的损坏。

推荐处理方式：

1. 打开下载的 DMG。
2. 将 `MCPM.app` 拖入“应用程序”。
3. 在终端执行：

```bash
sudo xattr -dr com.apple.quarantine /Applications/MCPM.app && open /Applications/MCPM.app
```

这条命令只会移除 `/Applications/MCPM.app` 的下载隔离属性，不会关闭 Gatekeeper，也不会修改系统级安全设置。

## Why There Is No Repair Script

Earlier builds experimented with a `Repair MCPM.command` file inside the DMG. That approach is unreliable: the repair script itself can be quarantined by macOS and blocked before it runs.

The long-term fix is Developer ID signing and Apple notarization. Once MCPM is signed and notarized, users should no longer need the Terminal command above.
