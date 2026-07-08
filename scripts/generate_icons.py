#!/usr/bin/env python3
"""生成带内边距的 macOS 标准图标"""

from PIL import Image
import os

# 源图标
src_path = "public/agents/mcp-manager.png"
output_dir = "src-tauri/icons"

# 图标尺寸配置（macOS 标准需要内容占约 82-88%，留出适当边距）
sizes = {
    "32x32.png": (32, 32, 0.88),      # 32px, 内容占 88%
    "128x128.png": (128, 128, 0.86),  # 128px, 内容占 86%
    "128x128@2x.png": (256, 256, 0.86), # 256px, 内容占 86%
    "icon.png": (512, 512, 0.84),     # 512px, 内容占 84%
}

def main():
    # 打开源图像
    img = Image.open(src_path).convert("RGBA")

    for filename, (width, height, content_ratio) in sizes.items():
        # 创建透明背景
        new_img = Image.new("RGBA", (width, height), (0, 0, 0, 0))

        # 计算内容尺寸（带内边距）
        content_size = int(min(width, height) * content_ratio)

        # 缩放原图到内容尺寸
        resized = img.resize((content_size, content_size), Image.Resampling.LANCZOS)

        # 计算居中位置
        x = (width - content_size) // 2
        y = (height - content_size) // 2

        # 粘贴到中心
        new_img.paste(resized, (x, y), resized)

        # 保存
        output_path = os.path.join(output_dir, filename)
        new_img.save(output_path, "PNG")
        print(f"Created {filename} ({width}x{height}, content ratio: {content_ratio})")

    print("All icons generated with macOS-standard padding!")

if __name__ == "__main__":
    main()
