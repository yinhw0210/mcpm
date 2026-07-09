#!/usr/bin/env python3
"""Generate padded desktop app icons for Tauri bundles."""

from PIL import Image
import os

# Source icon
src_path = "public/agents/mcpm.png"
output_dir = "src-tauri/icons"

# PNG icon sizes. macOS-style icons need some visual padding.
sizes = {
    "32x32.png": (32, 32, 0.88),      # 32px, 内容占 88%
    "128x128.png": (128, 128, 0.86),  # 128px, 内容占 86%
    "128x128@2x.png": (256, 256, 0.86), # 256px, 内容占 86%
    "icon.png": (512, 512, 0.84),     # 512px, 内容占 84%
}

def main():
    img = Image.open(src_path).convert("RGBA")
    ico_images = []

    for filename, (width, height, content_ratio) in sizes.items():
        new_img = Image.new("RGBA", (width, height), (0, 0, 0, 0))

        content_size = int(min(width, height) * content_ratio)
        resized = img.resize((content_size, content_size), Image.Resampling.LANCZOS)

        x = (width - content_size) // 2
        y = (height - content_size) // 2

        new_img.paste(resized, (x, y), resized)
        ico_images.append(new_img)

        output_path = os.path.join(output_dir, filename)
        new_img.save(output_path, "PNG")
        print(f"Created {filename} ({width}x{height}, content ratio: {content_ratio})")

    icon_path = os.path.join(output_dir, "icon.ico")
    ico_images[-1].save(
        icon_path,
        format="ICO",
        sizes=[(32, 32), (128, 128), (256, 256)],
    )
    print("Created icon.ico (Windows)")
    print("All icons generated!")

if __name__ == "__main__":
    main()
