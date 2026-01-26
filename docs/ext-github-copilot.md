<!-- order: 16 -->

# Extension: GitHub Copilot

Unlike Visual Studio Code, in CodeSphere, Copilot features are disabled and not configured.

## Update your settings

In your settings, sets:
```
"chat.disableAIFeatures": false,
```

## Configure product.json

You need to create a custom `product.json` at the following location (replace `CodeSphere` by `CodeSphere - Insiders` if you use that):
- Windows: `%APPDATA%\CodeSphere` or `%USERPROFILE%\AppData\Roaming\CodeSphere`
- macOS: `~/Library/Application Support/CodeSphere`
- Linux: `$XDG_CONFIG_HOME/CodeSphere` or `~/.config/CodeSphere`

Then you will need to follow the guide [Running with Code OSS](https://github.com/microsoft/vscode-copilot-chat/blob/main/CONTRIBUTING.md#running-with-code-oss) with the `product.json` file created previously.
You will need to add the properties: `trustedExtensionAuthAccess` and `defaultChatAgent`.
