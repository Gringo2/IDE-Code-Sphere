#!/usr/bin/env bash

# dev/icon_preview.sh
# description: Generates an HTML preview of all icons

echo "Generating icon preview..."

OUT_FILE="dev/icon_preview.html"

cat > "$OUT_FILE" <<EOF
<!DOCTYPE html>
<html>
<head>
    <title>CodeSphere Icon Preview</title>
    <style>
        body { font-family: sans-serif; background: #333; color: white; padding: 20px; }
        .icon-group { margin-bottom: 30px; background: #444; padding: 20px; border-radius: 8px; }
        .icon-grid { display: flex; flex-wrap: wrap; gap: 20px; }
        .icon-item { text-align: center; }
        .icon-item img { background: #222; padding: 10px; border-radius: 4px; }
        h2 { border-bottom: 1px solid #666; padding-bottom: 10px; }
    </style>
</head>
<body>
    <h1>CodeSphere Icon Preview</h1>
EOF

# Stable Icons
echo '<div class="icon-group"><h2>Stable Icons</h2><div class="icon-grid">' >> "$OUT_FILE"
for icon in icons/stable/*.png; do
    if [[ -f "$icon" ]]; then
        name=$(basename "$icon")
        echo "<div class=\"icon-item\"><img src=\"../$icon\"><br>$name</div>" >> "$OUT_FILE"
    fi
done
echo '</div></div>' >> "$OUT_FILE"

# Insider Icons
echo '<div class="icon-group"><h2>Insider Icons</h2><div class="icon-grid">' >> "$OUT_FILE"
for icon in icons/insider/*.png; do
    if [[ -f "$icon" ]]; then
        name=$(basename "$icon")
        echo "<div class=\"icon-item\"><img src=\"../$icon\"><br>$name</div>" >> "$OUT_FILE"
    fi
done
echo '</div></div>' >> "$OUT_FILE"

cat >> "$OUT_FILE" <<EOF
</body>
</html>
EOF

echo "Preview generated at $OUT_FILE"
if [[ "$OSTYPE" == "darwin"* ]]; then
    open "$OUT_FILE"
elif command -v xdg-open &> /dev/null; then
    xdg-open "$OUT_FILE"
fi
