#!/usr/bin/env bash
set -euo pipefail

# Find your Privacy Policy file
TARGET="$(grep -RIl "FileFlow — Privacy Policy" --include="*.md" --include="*.html" --include="*.tsx" --include="*.jsx" . | head -n 1 || true)"

if [[ -z "${TARGET}" ]]; then
  echo "Could not find the Privacy Policy file. Open your policy page and ensure it contains 'FileFlow — Privacy Policy'."
  exit 1
fi

TS="$(date +%Y%m%d%H%M%S)"
cp "$TARGET" "${TARGET}.bak.${TS}"

echo "Patching: $TARGET (backup: ${TARGET}.bak.${TS})"

# Sentence to insert (Markdown/HTML-friendly)
MD_SENTENCE=$'Some partners may rely on **legitimate interest** as a legal basis for processing your data. You can manage these choices, including objecting to legitimate interest, in the consent preferences available on our site.'
HTML_SENTENCE=$'Some partners may rely on <strong>legitimate interest</strong> as a legal basis for processing your data. You can manage these choices, including objecting to legitimate interest, in the consent preferences available on our site.'

case "$TARGET" in
  *.md)
    awk -v S="$MD_SENTENCE" '
      {
        print
        if ($0 ~ /^##[[:space:]]*4\)[[:space:]]*Advertising \(Google AdSense\)/) insec=1
        else if (insec==1 && $0 ~ /^[[:space:]]*$/ && !done) { print S RS; done=1; insec=0 }
      }' "${TARGET}.bak.${TS}" > "$TARGET"
    ;;
  *.html)
    # Insert after the first paragraph that mentions AdSense in the Advertising section
    perl -0777 -pe "s|(</h2>\\s*<p>[^<]*AdSense[^<]*</p>)|\\1\n<p>${HTML_SENTENCE}</p>|s" -i "$TARGET"
    ;;
  *.tsx|*.jsx)
    # Insert an extra <p> in the Advertising section after a paragraph mentioning AdSense
    perl -0777 -pe "s|(Advertising \\(Google AdSense\\)[\\s\\S]*?<p>[\\s\\S]*?AdSense[\\s\\S]*?</p>)|\\1\n<p>${HTML_SENTENCE}</p>|s" -i "$TARGET"
    ;;
  *)
    echo "Unsupported file type. Edit manually: add the sentence in the Advertising (Google AdSense) section."
    exit 1
    ;;
esac

echo "Done. Review the change, then commit/deploy."
