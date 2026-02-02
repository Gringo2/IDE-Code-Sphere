#!/usr/bin/env bash

APP_NAME="${APP_NAME:-CodeSphere}"
APP_NAME_LC="$( echo "${APP_NAME}" | awk '{print tolower($0)}' )"
ASSETS_REPOSITORY="${ASSETS_REPOSITORY:-CodeSphere/codesphere-IDE}"
BINARY_NAME="${BINARY_NAME:-codesphere}"
GH_REPO_PATH="${GH_REPO_PATH:-CodeSphere/codesphere-IDE}"
ORG_NAME="${ORG_NAME:-CodeSphere}"
TUNNEL_APP_NAME="${TUNNEL_APP_NAME:-"${BINARY_NAME}-tunnel"}"

if [[ "${VSCODE_QUALITY}" == "insider" ]]; then
  GLOBAL_DIRNAME="${GLOBAL_DIRNAME:-"${APP_NAME_LC}"}-insiders"
else
  GLOBAL_DIRNAME="${GLOBAL_DIRNAME:-"${APP_NAME_LC}"}"
fi

# All common functions can be added to this file

apply_patch() {
  if [[ -z "$2" ]]; then
    echo applying patch: "$1";
  fi
  # grep '^+++' "$1"  | sed -e 's#+++ [ab]/#./vscode/#' | while read line; do shasum -a 256 "${line}"; done

  cp $1{,.bak}

  replace "s|!!APP_NAME!!|${APP_NAME}|g" "$1"
  replace "s|!!APP_NAME_LC!!|${APP_NAME_LC}|g" "$1"
  replace "s|!!ASSETS_REPOSITORY!!|${ASSETS_REPOSITORY}|g" "$1"
  replace "s|!!BINARY_NAME!!|${BINARY_NAME}|g" "$1"
  replace "s|!!GH_REPO_PATH!!|${GH_REPO_PATH}|g" "$1"
  replace "s|!!GLOBAL_DIRNAME!!|${GLOBAL_DIRNAME}|g" "$1"
  replace "s|!!ORG_NAME!!|${ORG_NAME}|g" "$1"
  replace "s|!!RELEASE_VERSION!!|${RELEASE_VERSION}|g" "$1"
  replace "s|!!TUNNEL_APP_NAME!!|${TUNNEL_APP_NAME}|g" "$1"

  if ! git apply --ignore-whitespace "$1"; then
    echo failed to apply patch "$1" >&2
    exit 1
  fi

  mv -f $1{.bak,}
}

exists() { type -t "$1" &> /dev/null; }

is_gnu_sed() {
  sed --version &> /dev/null
}

replace() {
  if is_gnu_sed; then
    sed -i -E "${1}" "${2}"
  else
    sed -i '' -E "${1}" "${2}"
  fi
}


if ! exists gsed; then
  if is_gnu_sed; then
    function gsed() {
      sed -i -E "$@"
    }
  else
    function gsed() {
      sed -i '' -E "$@"
    }
  fi
fi

check_command() {
  if ! command -v "$1" &> /dev/null; then
    echo "Error: Command '$1' not found. Please install it." >&2
    return 1
  fi
}

check_all_deps() {
  echo "Checking dependencies..."
  local deps=("git" "node" "npm" "python" "jq")
  
  if [[ "$OSTYPE" == "darwin"* ]]; then
    deps+=("iconutil")
  elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    deps+=("rpmbuild" "dpkg-deb")
  fi

  for dep in "${deps[@]}"; do
    check_command "$dep" || return 1
  done
  echo "All dependencies found."
}

download_file() {
  local url="$1"
  local dest="$2"
  
  echo "Downloading $url to $dest..."
  if command -v curl &> /dev/null; then
    curl -L -o "$dest" "$url"
  elif command -v wget &> /dev/null; then
    wget -O "$dest" "$url"
  else
    echo "Error: Neither curl nor wget found." >&2
    return 1
  fi
}

extract_archive() {
  local file="$1"
  local dir="${2:-.}"
  
  echo "Extracting $file to $dir..."
  mkdir -p "$dir"
  
  case "$file" in
    *.tar.gz|*.tgz) tar -xzf "$file" -C "$dir" ;;
    *.tar.bz2)      tar -xjf "$file" -C "$dir" ;;
    *.zip)          unzip -q "$file" -d "$dir" ;;
    *)              echo "Unknown archive format: $file" >&2; return 1 ;;
  esac
}
