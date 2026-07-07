#!/bin/zsh
# 一次性生成 iOS PWA 图标与启动屏（依赖 macOS 自带 qlmanage / sips）。
# 用法：./scripts/generate-icons.sh   产物输出到仓库根目录 icons/
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/icons"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$OUT"

LIGHT_BG="#f7f9f8"
DARK_BG="#141816"

# 三圆 logo（与 index.html favicon 同源），viewBox 64 坐标系
circles() {
  # $1 = 缩放中心偏移用的 scale（1 = 原始占满），围绕 (32,32) 缩放
  local s=$1
  cat <<EOF
<g transform="translate(32 32) scale($s) translate(-32 -32)">
  <circle cx="24" cy="26" r="13" fill="#a9ceb5"/>
  <circle cx="40" cy="25" r="13" fill="#b9c9e6"/>
  <circle cx="32" cy="40" r="13" fill="#efc2bf"/>
</g>
EOF
}

render() {
  # $1 = svg 文件, $2 = 目标最大边像素, $3 = 输出 png 路径
  local svg=$1 size=$2 out=$3
  qlmanage -t -s "$size" -o "$TMP" "$svg" >/dev/null 2>&1
  mv "$TMP/$(basename "$svg").png" "$out"
}

# ---------- 图标 ----------
# apple-touch-icon：满血方形不带圆角（iOS 自己加遮罩），不透明底
cat > "$TMP/apple.svg" <<EOF
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="$LIGHT_BG"/>
  $(circles 1)
</svg>
EOF
render "$TMP/apple.svg" 180 "$OUT/apple-touch-icon.png"

# 常规 PWA 图标：带圆角，与 favicon 观感一致
for size in 192 512; do
  cat > "$TMP/icon-$size.svg" <<EOF
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="$LIGHT_BG"/>
  $(circles 1)
</svg>
EOF
  render "$TMP/icon-$size.svg" "$size" "$OUT/icon-$size.png"
done

# maskable：满血底 + logo 缩到中心约 62% 安全区
cat > "$TMP/maskable.svg" <<EOF
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="$LIGHT_BG"/>
  $(circles 0.62)
</svg>
EOF
render "$TMP/maskable.svg" 512 "$OUT/icon-512-maskable.png"

# ---------- 启动屏 ----------
# 逻辑尺寸(pt) 与像素倍率：覆盖 SE 到 16 Pro Max（竖屏）
# 格式：宽pt 高pt 倍率
SPLASH_SPECS=(
  "375 667 2"   # SE2/SE3/8
  "414 896 2"   # XR/11
  "375 812 3"   # X/XS/11Pro/12mini/13mini
  "390 844 3"   # 12/13/14/12Pro/13Pro
  "393 852 3"   # 14Pro/15/15Pro/16
  "402 874 3"   # 16 Pro
  "414 896 3"   # XS Max/11 Pro Max
  "428 926 3"   # 12/13 Pro Max/14 Plus
  "430 932 3"   # 14 Pro Max/15 Plus/15 Pro Max/16 Plus
  "440 956 3"   # 16 Pro Max
)

# qlmanage 对非方形 SVG 输出不可控：先按方形（边长 = 高度）满铺背景渲染，
# 再用 sips 居中裁掉左右，得到精确的 pw×ph。
for spec in "${SPLASH_SPECS[@]}"; do
  read -r w h r <<< "$spec"
  pw=$((w * r)); ph=$((h * r))
  for theme in light dark; do
    [[ $theme == light ]] && bg=$LIGHT_BG || bg=$DARK_BG
    # logo 占屏宽约 34%，水平居中、垂直略偏上
    logo=$((pw * 34 / 100))
    off=$(( (ph - logo) / 2 ))
    top=$(( (ph - logo) / 2 - ph / 20 ))
    cat > "$TMP/splash.svg" <<EOF
<svg xmlns="http://www.w3.org/2000/svg" width="$ph" height="$ph" viewBox="0 0 $ph $ph">
  <rect width="$ph" height="$ph" fill="$bg"/>
  <svg x="$off" y="$top" width="$logo" height="$logo" viewBox="0 0 64 64">
    $(circles 1)
  </svg>
</svg>
EOF
    out="$OUT/splash-${pw}x${ph}-${theme}.png"
    render "$TMP/splash.svg" "$ph" "$out"
    sips -c "$ph" "$pw" "$out" >/dev/null
  done
done

echo "生成完成："
ls "$OUT" | sort
