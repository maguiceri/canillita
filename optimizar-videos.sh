#!/bin/zsh
# Convierte los videos de videos-originales/ a versiones livianas para la web en videos/
#   - MP4 (H.264), máximo 1280px del lado más largo (horizontal o vertical), sin audio, listo para streaming
#   - una imagen póster .jpg por video (primer segundo)
# Uso:
#   ./optimizar-videos.sh                                  → todos los videos, velocidad normal
#   VELOCIDAD=1.5 ./optimizar-videos.sh videos-originales/clip-cafe.mov   → un video acelerado

setopt null_glob nocaseglob
cd "$(dirname "$0")"
mkdir -p videos-originales videos

vel="${VELOCIDAD:-1}"
files=("$@")
(( ${#files} )) || files=(videos-originales/*.{mov,mp4,m4v})

for src in $files; do
  name="${${src:t:r}// /-}"
  name="${name:l}"
  out="videos/$name.mp4"
  poster="videos/$name.jpg"
  [[ -n "$VELOCIDAD" && "$1" != "" ]] && rm -f "$out" "$poster"   # si se pasa un archivo, se regenera

  if [[ -f "$out" ]]; then
    echo "— ya existe, salteo: $out"
    continue
  fi

  echo "→ $src"
  ffmpeg -hide_banner -loglevel error -y -i "$src" \
    -vf "setpts=PTS/$vel,scale='if(gte(iw,ih),min(1280,iw),-2)':'if(gte(iw,ih),-2,min(1280,ih))',fps=30" \
    -c:v libx264 -preset slow -crf 27 -pix_fmt yuv420p \
    -an -movflags +faststart \
    "$out"

  ffmpeg -hide_banner -loglevel error -y -ss 1 -i "$out" -frames:v 1 -q:v 4 "$poster"

  before=$(du -h "$src" | cut -f1)
  after=$(du -h "$out" | cut -f1)
  echo "  $before → $after"
done

echo "Listo. Originales en videos-originales/, optimizados en videos/"
