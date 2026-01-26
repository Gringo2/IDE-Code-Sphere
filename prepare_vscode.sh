#!/usr/bin/env bash
# shellcheck disable=SC1091,2154

set -e

if [[ "${VSCODE_QUALITY}" == "insider" ]]; then
  cp -rp src/insider/* vscode/
else
  cp -rp src/stable/* vscode/
fi

cp -f LICENSE vscode/LICENSE.txt

cd vscode || { echo "'vscode' dir not found"; exit 1; }

{ set +x; } 2>/dev/null

# {{{ product.json
cp product.json{,.bak}

setpath() {
  local jsonTmp
  { set +x; } 2>/dev/null
  jsonTmp=$( jq --arg 'value' "${3}" "setpath(path(.${2}); \$value)" "${1}.json" )
  echo "${jsonTmp}" > "${1}.json"
  set -x
}

setpath_json() {
  local jsonTmp
  { set +x; } 2>/dev/null
  jsonTmp=$( jq --argjson 'value' "${3}" "setpath(path(.${2}); \$value)" "${1}.json" )
  echo "${jsonTmp}" > "${1}.json"
  set -x
}

setpath "product" "checksumFailMoreInfoUrl" "https://codesphere.dev/checksums"
setpath "product" "documentationUrl" "https://codesphere.dev/docs"
setpath_json "product" "extensionsGallery" '{"serviceUrl": "https://open-vsx.org/vscode/gallery", "itemUrl": "https://open-vsx.org/vscode/item", "latestUrlTemplate": "https://open-vsx.org/vscode/gallery/{publisher}/{name}/latest", "controlUrl": "https://raw.githubusercontent.com/EclipseFdn/publish-extensions/refs/heads/master/extension-control/extensions.json"}'

setpath "product" "introductoryVideosUrl" "https://codesphere.dev/videos"
setpath "product" "keyboardShortcutsUrlLinux" "https://codesphere.dev/shortcuts-linux"
setpath "product" "keyboardShortcutsUrlMac" "https://codesphere.dev/shortcuts-mac"
setpath "product" "keyboardShortcutsUrlWin" "https://codesphere.dev/shortcuts-win"
setpath "product" "licenseUrl" "https://github.com/CodeSphere/codesphere-IDE/blob/master/LICENSE"
setpath_json "product" "linkProtectionTrustedDomains" '["https://open-vsx.org"]'
setpath "product" "releaseNotesUrl" "https://codesphere.dev/release-notes"
setpath "product" "reportIssueUrl" "https://github.com/CodeSphere/codesphere-IDE/issues/new"
setpath "product" "requestFeatureUrl" "https://github.com/CodeSphere/codesphere-IDE/issues/new"
setpath "product" "tipsAndTricksUrl" "https://codesphere.dev/tips-and-tricks"
setpath "product" "twitterUrl" "https://twitter.com/codesphere"

if [[ "${DISABLE_UPDATE}" != "yes" ]]; then
  setpath "product" "updateUrl" "https://raw.githubusercontent.com/CodeSphere/versions/refs/heads/master"

  if [[ "${VSCODE_QUALITY}" == "insider" ]]; then
    setpath "product" "downloadUrl" "https://github.com/CodeSphere/codesphere-IDE-insiders/releases"
  else
    setpath "product" "downloadUrl" "https://github.com/CodeSphere/codesphere-IDE/releases"
  fi
fi

if [[ "${VSCODE_QUALITY}" == "insider" ]]; then
  setpath "product" "nameShort" "CodeSphere - Insiders"
  setpath "product" "nameLong" "CodeSphere - Insiders"
  setpath "product" "applicationName" "codesphere-insiders"
  setpath "product" "dataFolderName" ".codesphere-insiders"
  setpath "product" "linuxIconName" "codesphere-insiders"
  setpath "product" "quality" "insider"
  setpath "product" "urlProtocol" "codesphere-insiders"
  setpath "product" "serverApplicationName" "codesphere-server-insiders"
  setpath "product" "serverDataFolderName" ".codesphere-server-insiders"
  setpath "product" "darwinBundleIdentifier" "com.codesphere.CodeSphereInsiders"
  setpath "product" "win32AppUserModelId" "CodeSphere.CodeSphereInsiders"
  setpath "product" "win32DirName" "CodeSphere Insiders"
  setpath "product" "win32MutexName" "codesphereinsiders"
  setpath "product" "win32NameVersion" "CodeSphere Insiders"
  setpath "product" "win32RegValueName" "CodeSphereInsiders"
  setpath "product" "win32ShellNameShort" "CodeSphere Insiders"
  setpath "product" "win32AppId" "{{5B4E5D81-F43B-4DE4-8BD1-53F2660BEDF2}"
  setpath "product" "win32x64AppId" "{{60C3604F-89AC-4B64-A9E9-5F3F4EDC6B7B}"
  setpath "product" "win32arm64AppId" "{{1548BD1C-7C9C-4521-AB08-51AC3FAB1AE5}"
  setpath "product" "win32UserAppId" "{{1260A31F-CC83-49F6-A1F6-3D3C6A2F22EB}"
  setpath "product" "win32x64UserAppId" "{{969A6E91-D6A4-4A63-9B8A-3E3B6A2F22EB}"
  setpath "product" "win32arm64UserAppId" "{{D3B3A6E1-C6A4-4A63-9B8A-3E3B6A2F22EB}"
  setpath "product" "tunnelApplicationName" "codesphere-insiders-tunnel"
  setpath "product" "win32TunnelServiceMutex" "codesphereinsiders-tunnelservice"
  setpath "product" "win32TunnelMutex" "codesphereinsiders-tunnel"
  setpath "product" "win32ContextMenu.x64.clsid" "90AAD229-85FD-43A3-B82D-8598A88829CF"
  setpath "product" "win32ContextMenu.arm64.clsid" "7544C31C-BDBF-4DDF-B15E-F73A46D6723D"
else
  setpath "product" "nameShort" "CodeSphere"
  setpath "product" "nameLong" "CodeSphere"
  setpath "product" "applicationName" "codesphere"
  setpath "product" "linuxIconName" "codesphere"
  setpath "product" "quality" "stable"
  setpath "product" "urlProtocol" "codesphere"
  setpath "product" "serverApplicationName" "codesphere-server"
  setpath "product" "serverDataFolderName" ".codesphere-server"
  setpath "product" "darwinBundleIdentifier" "com.codesphere"
  setpath "product" "win32AppUserModelId" "CodeSphere.CodeSphere"
  setpath "product" "win32DirName" "CodeSphere"
  setpath "product" "win32MutexName" "codesphere"
  setpath "product" "win32NameVersion" "CodeSphere"
  setpath "product" "win32RegValueName" "CodeSphere"
  setpath "product" "win32ShellNameShort" "CodeSphere"
  setpath "product" "win32AppId" "{{763CBF88-25C6-4B10-952F-326AE657F16B}"
  setpath "product" "win32x64AppId" "{{88DA3577-054F-4CA1-8122-7D820494CFFB}"
  setpath "product" "win32arm64AppId" "{{67DEE444-3D04-4258-B92A-BC1F0FF2CAE4}"
  setpath "product" "win32UserAppId" "{{0FD05EB4-651E-4E78-A062-515204B47A3A}"
  setpath "product" "win32x64UserAppId" "{{2E1F05D1-C245-4562-81EE-28188DB6FD17}"
  setpath "product" "win32arm64UserAppId" "{{57FD70A5-1B8D-4875-9F40-C5553F094828}"
  setpath "product" "tunnelApplicationName" "codesphere-tunnel"
  setpath "product" "win32TunnelServiceMutex" "codesphere-tunnelservice"
  setpath "product" "win32TunnelMutex" "codesphere-tunnel"
  setpath "product" "win32ContextMenu.x64.clsid" "D910D5E6-B277-4F4A-BDC5-759A34EEE25D"
  setpath "product" "win32ContextMenu.arm64.clsid" "4852FC55-4A84-4EA1-9C86-D53BE3DF83C0"
fi

setpath_json "product" "tunnelApplicationConfig" '{}'

jsonTmp=$( jq -s '.[0] * .[1]' product.json ../product.json )
echo "${jsonTmp}" > product.json && unset jsonTmp

cat product.json
# }}}

# include common functions
. ../utils.sh

# {{{ apply patches

echo "APP_NAME=\"${APP_NAME}\""
echo "APP_NAME_LC=\"${APP_NAME_LC}\""
echo "ASSETS_REPOSITORY=\"${ASSETS_REPOSITORY}\""
echo "BINARY_NAME=\"${BINARY_NAME}\""
echo "GH_REPO_PATH=\"${GH_REPO_PATH}\""
echo "GLOBAL_DIRNAME=\"${GLOBAL_DIRNAME}\""
echo "ORG_NAME=\"${ORG_NAME}\""
echo "TUNNEL_APP_NAME=\"${TUNNEL_APP_NAME}\""

if [[ "${DISABLE_UPDATE}" == "yes" ]]; then
  mv ../patches/disable-update.patch.yet ../patches/disable-update.patch
fi

for file in ../patches/*.patch; do
  if [[ -f "${file}" ]]; then
    apply_patch "${file}"
  fi
done

if [[ "${VSCODE_QUALITY}" == "insider" ]]; then
  for file in ../patches/insider/*.patch; do
    if [[ -f "${file}" ]]; then
      apply_patch "${file}"
    fi
  done
fi

if [[ -d "../patches/${OS_NAME}/" ]]; then
  for file in "../patches/${OS_NAME}/"*.patch; do
    if [[ -f "${file}" ]]; then
      apply_patch "${file}"
    fi
  done
fi

for file in ../patches/user/*.patch; do
  if [[ -f "${file}" ]]; then
    apply_patch "${file}"
  fi
done
# }}}

set -x

# {{{ install dependencies
export ELECTRON_SKIP_BINARY_DOWNLOAD=1
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

if [[ "${OS_NAME}" == "linux" ]]; then
  export VSCODE_SKIP_NODE_VERSION_CHECK=1

   if [[ "${npm_config_arch}" == "arm" ]]; then
    export npm_config_arm_version=7
  fi
elif [[ "${OS_NAME}" == "windows" ]]; then
  if [[ "${npm_config_arch}" == "arm" ]]; then
    export npm_config_arm_version=7
  fi
else
  if [[ "${CI_BUILD}" != "no" ]]; then
    clang++ --version
  fi
fi

node build/npm/preinstall.ts

mv .npmrc .npmrc.bak
cp ../npmrc .npmrc

for i in {1..5}; do # try 5 times
  if [[ "${CI_BUILD}" != "no" && "${OS_NAME}" == "osx" ]]; then
    CXX=clang++ npm ci && break
  else
    npm ci && break
  fi

  if [[ $i == 5 ]]; then
    echo "Npm install failed too many times" >&2
    exit 1
  fi
  echo "Npm install failed $i, trying again..."

  sleep $(( 15 * (i + 1)))
done

mv .npmrc.bak .npmrc
# }}}

# package.json
cp package.json{,.bak}

setpath "package" "version" "${RELEASE_VERSION%-insider}"

replace 's|Microsoft Corporation|CodeSphere|' package.json

cp resources/server/manifest.json{,.bak}

if [[ "${VSCODE_QUALITY}" == "insider" ]]; then
  setpath "resources/server/manifest" "name" "CodeSphere - Insiders"
  setpath "resources/server/manifest" "short_name" "CodeSphere - Insiders"
else
  setpath "resources/server/manifest" "name" "CodeSphere"
  setpath "resources/server/manifest" "short_name" "CodeSphere"
fi

# announcements
replace "s|\\[\\/\\* BUILTIN_ANNOUNCEMENTS \\*\\/\\]|$( tr -d '\n' < ../announcements-builtin.json )|" src/vs/workbench/contrib/welcomeGettingStarted/browser/gettingStarted.ts

../undo_telemetry.sh

replace 's|Microsoft Corporation|CodeSphere|' build/lib/electron.ts
replace 's|([0-9]) Microsoft|\1 CodeSphere|' build/lib/electron.ts

if [[ "${OS_NAME}" == "linux" ]]; then
  # microsoft adds their apt repo to sources
  # unless the app name is code-oss
  # as we are renaming the application to codesphere
  # we need to edit a line in the post install template
  if [[ "${VSCODE_QUALITY}" == "insider" ]]; then
    sed -i "s/code-oss/codesphere-insiders/" resources/linux/debian/postinst.template
  else
    sed -i "s/code-oss/codesphere/" resources/linux/debian/postinst.template
  fi

  # fix the packages metadata
  # code.appdata.xml
  sed -i 's|Visual Studio Code|CodeSphere|g' resources/linux/code.appdata.xml
  sed -i 's|https://code.visualstudio.com/docs/setup/linux|https://github.com/CodeSphere/codesphere-IDE#download-install|' resources/linux/code.appdata.xml
  sed -i 's|https://code.visualstudio.com/home/home-screenshot-linux-lg.png|https://codesphere.dev/img/codesphere.png|' resources/linux/code.appdata.xml
  sed -i 's|https://code.visualstudio.com|https://codesphere.dev|' resources/linux/code.appdata.xml

  # control.template
  sed -i 's|Microsoft Corporation <vscode-linux@microsoft.com>|CodeSphere Team https://github.com/CodeSphere/codesphere-IDE/graphs/contributors|'  resources/linux/debian/control.template
  sed -i 's|Visual Studio Code|CodeSphere|g' resources/linux/debian/control.template
  sed -i 's|https://code.visualstudio.com/docs/setup/linux|https://github.com/CodeSphere/codesphere-IDE#download-install|' resources/linux/debian/control.template
  sed -i 's|https://code.visualstudio.com|https://codesphere.dev|' resources/linux/debian/control.template

  # code.spec.template
  sed -i 's|Microsoft Corporation|CodeSphere Team|' resources/linux/rpm/code.spec.template
  sed -i 's|Visual Studio Code Team <vscode-linux@microsoft.com>|CodeSphere Team https://github.com/CodeSphere/codesphere-IDE/graphs/contributors|' resources/linux/rpm/code.spec.template
  sed -i 's|Visual Studio Code|CodeSphere|' resources/linux/rpm/code.spec.template
  sed -i 's|https://code.visualstudio.com/docs/setup/linux|https://github.com/CodeSphere/codesphere-IDE#download-install|' resources/linux/rpm/code.spec.template
  sed -i 's|https://code.visualstudio.com|https://codesphere.dev|' resources/linux/rpm/code.spec.template

  # snapcraft.yaml
  sed -i 's|Visual Studio Code|CodeSphere|'  resources/linux/rpm/code.spec.template
elif [[ "${OS_NAME}" == "windows" ]]; then
  if [[ "${VSCODE_QUALITY}" == "insider" ]]; then
    ISS_PATH="build/win32/code-insider.iss"
  else
    ISS_PATH="build/win32/code.iss"
  fi

  # code.iss
  sed -i 's|https://code.visualstudio.com|https://codesphere.dev|' "${ISS_PATH}"
  sed -i 's|Microsoft Corporation|CodeSphere|' "${ISS_PATH}"
fi

cd ..
