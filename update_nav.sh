#!/bin/bash

# List of pages to update (excluding already updated ones)
pages=(
    "video-compress.html"
    "audio-converter.html"
    "mp4-to-mp3.html"
    "gif-maker.html"
    "video-trim.html"
    "video-merger.html"
    "pdf-split.html"
    "pdf-compress.html"
    "pdf-rotate.html"
    "pdf-watermark.html"
    "pdf-to-word.html"
)

for page in "${pages[@]}"; do
    echo "Processing client/$page..."
    
    # Add navigation script to each page
    if grep -q "<!-- Navigation Script -->" "client/$page"; then
        echo "$page already has navigation script"
    else
        sed -i 's|    <link rel="stylesheet" href="/styles.css">|    <link rel="stylesheet" href="/styles.css">\
    \
    <!-- Navigation Script -->\
    <script src="/js/navigation.js" defer></script>|' "client/$page"
    fi
    
    # Check if page has old navbar
    if grep -q "<!-- Navigation Bar -->" "client/$page"; then
        echo "Found old navbar in $page, needs manual update"
    fi
done

echo "Navigation update script complete"