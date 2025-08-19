#!/usr/bin/env node

/**
 * Convert SVG icons to PNG using Sharp
 * Run: npm install sharp && node scripts/convert-with-sharp.js
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const iconSizes = [
  {
    "name": "apple-touch-icon.png",
    "size": 180,
    "description": "Default Apple touch icon"
  },
  {
    "name": "apple-touch-icon-152x152.png",
    "size": 152,
    "description": "iPad touch icon"
  },
  {
    "name": "apple-touch-icon-167x167.png",
    "size": 167,
    "description": "iPad Pro touch icon"
  },
  {
    "name": "apple-touch-icon-180x180.png",
    "size": 180,
    "description": "iPhone touch icon"
  },
  {
    "name": "favicon-16x16.png",
    "size": 16,
    "description": "Small favicon"
  },
  {
    "name": "favicon-32x32.png",
    "size": 32,
    "description": "Standard favicon"
  },
  {
    "name": "icon-192x192.png",
    "size": 192,
    "description": "PWA manifest icon"
  },
  {
    "name": "icon-512x512.png",
    "size": 512,
    "description": "PWA manifest icon large"
  }
];

async function convertIcons() {
  console.log('🔄 Converting SVG icons to PNG using Sharp...');
  
  for (const icon of iconSizes) {
    const svgPath = `public/temp-${icon.name.replace('.png', '.svg')}`;
    const pngPath = `public/${icon.name}`;
    
    if (fs.existsSync(svgPath)) {
      try {
        await sharp(svgPath)
          .resize(icon.size, icon.size)
          .png()
          .toFile(pngPath);
        
        console.log(`✅ Generated: ${pngPath}`);
      } catch (error) {
        console.error(`❌ Error converting ${svgPath}:`, error.message);
      }
    } else {
      console.warn(`⚠️  SVG file not found: ${svgPath}`);
    }
  }
  
  console.log('\n🎉 Icon conversion complete!');
  console.log('🧹 You can now delete the temp SVG files.');
}

convertIcons().catch(console.error);
