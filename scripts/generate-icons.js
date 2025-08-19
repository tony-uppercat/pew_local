#!/usr/bin/env node

/**
 * PWA Icon Generator
 * Generates all required PWA icons from the base SVG
 * 
 * Usage: node scripts/generate-icons.js
 */

const fs = require('fs');
const path = require('path');

// Required icon sizes for PWA
const iconSizes = [
  { name: 'apple-touch-icon.png', size: 180, description: 'Default Apple touch icon' },
  { name: 'apple-touch-icon-152x152.png', size: 152, description: 'iPad touch icon' },
  { name: 'apple-touch-icon-167x167.png', size: 167, description: 'iPad Pro touch icon' },
  { name: 'apple-touch-icon-180x180.png', size: 180, description: 'iPhone touch icon' },
  { name: 'favicon-16x16.png', size: 16, description: 'Small favicon' },
  { name: 'favicon-32x32.png', size: 32, description: 'Standard favicon' },
  { name: 'icon-192x192.png', size: 192, description: 'PWA manifest icon' },
  { name: 'icon-512x512.png', size: 512, description: 'PWA manifest icon large' },
];

// Create a simplified SVG for different sizes
function createSVGForSize(size) {
  const showText = size >= 128; // Only show "PEW" text for larger icons
  const walletScale = Math.max(0.3, Math.min(1.0, size / 200)); // Scale wallet icon
  
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#F0F0F0;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#FFFFFF;stop-opacity:1" />
    </linearGradient>
    
    <radialGradient id="accentGradient" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:#E8FF8A;stop-opacity:1" />
      <stop offset="70%" style="stop-color:#D4FF5A;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#B8E643;stop-opacity:1" />
    </radialGradient>
  </defs>
  
  <!-- Background with rounded corners -->
  <rect width="${size}" height="${size}" rx="${size * 0.18}" ry="${size * 0.18}" fill="url(#bgGradient)" />
  
  <!-- Main accent circle -->
  <circle cx="${size/2}" cy="${size/2}" r="${size * 0.3}" fill="url(#accentGradient)" />
  
  <!-- Inner circle for depth -->
  <circle cx="${size/2}" cy="${size/2}" r="${size * 0.24}" fill="#B8E643" opacity="0.8" />
  
  <!-- Wallet icon -->
  <g transform="translate(${size/2}, ${size/2}) scale(${walletScale})">
    <!-- Wallet body -->
    <rect x="-30" y="-18" width="60" height="36" rx="4" ry="4" fill="#1A1A1A" />
    <!-- Wallet fold -->
    <rect x="-30" y="-18" width="60" height="12" rx="4" ry="4" fill="#2A2A2A" />
    <!-- Card slots -->
    <rect x="-22" y="-8" width="44" height="2" rx="1" ry="1" fill="#D4FF5A" />
    <rect x="-22" y="-4" width="44" height="2" rx="1" ry="1" fill="#D4FF5A" />
    <!-- Money symbol -->
    <text x="0" y="12" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="bold" fill="#D4FF5A">$</text>
  </g>
  
  ${showText ? `<text x="${size/2}" y="${size * 0.85}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="${size * 0.08}" font-weight="600" fill="#2A2A2A">PEW</text>` : ''}
</svg>`;
}

// Generate instructions for manual conversion
function generateInstructions() {
  console.log('🎨 PWA Icon Generator');
  console.log('=====================\n');
  
  console.log('To generate PWA icons, you have several options:\n');
  
  console.log('📋 OPTION 1: Online SVG to PNG Converter');
  console.log('------------------------------------------');
  console.log('1. Use an online converter like:');
  console.log('   - https://convertio.co/svg-png/');
  console.log('   - https://cloudconvert.com/svg-to-png');
  console.log('   - https://svgtopng.com/\n');
  
  console.log('2. Upload the generated SVG files and convert to PNG\n');
  
  console.log('📋 OPTION 2: Using Sharp (Node.js)');
  console.log('-----------------------------------');
  console.log('1. Install Sharp: npm install sharp');
  console.log('2. Run: node scripts/convert-with-sharp.js\n');
  
  console.log('📋 OPTION 3: Using ImageMagick');
  console.log('-------------------------------');
  console.log('1. Install ImageMagick');
  console.log('2. Run the conversion commands below:\n');
  
  // Generate SVG files and commands
  iconSizes.forEach(icon => {
    const svgContent = createSVGForSize(icon.size);
    const svgPath = `public/temp-${icon.name.replace('.png', '.svg')}`;
    
    // Write SVG file
    fs.writeFileSync(svgPath, svgContent);
    console.log(`✅ Generated: ${svgPath}`);
    
    // Show ImageMagick command
    console.log(`   Convert: magick "${svgPath}" "public/${icon.name}"`);
  });
  
  console.log('\n🎯 Required Files:');
  console.log('==================');
  iconSizes.forEach(icon => {
    console.log(`- public/${icon.name} (${icon.size}x${icon.size}) - ${icon.description}`);
  });
  
  console.log('\n✨ After generating PNG files, you can delete the temp SVG files.');
  console.log('\n🚀 Your PWA icons will be ready!');
}

// Create a Sharp-based converter script
function createSharpScript() {
  const sharpScript = `#!/usr/bin/env node

/**
 * Convert SVG icons to PNG using Sharp
 * Run: npm install sharp && node scripts/convert-with-sharp.js
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const iconSizes = ${JSON.stringify(iconSizes, null, 2)};

async function convertIcons() {
  console.log('🔄 Converting SVG icons to PNG using Sharp...');
  
  for (const icon of iconSizes) {
    const svgPath = \`public/temp-\${icon.name.replace('.png', '.svg')}\`;
    const pngPath = \`public/\${icon.name}\`;
    
    if (fs.existsSync(svgPath)) {
      try {
        await sharp(svgPath)
          .resize(icon.size, icon.size)
          .png()
          .toFile(pngPath);
        
        console.log(\`✅ Generated: \${pngPath}\`);
      } catch (error) {
        console.error(\`❌ Error converting \${svgPath}:\`, error.message);
      }
    } else {
      console.warn(\`⚠️  SVG file not found: \${svgPath}\`);
    }
  }
  
  console.log('\\n🎉 Icon conversion complete!');
  console.log('🧹 You can now delete the temp SVG files.');
}

convertIcons().catch(console.error);
`;

  fs.writeFileSync('scripts/convert-with-sharp.js', sharpScript);
  console.log('📝 Created: scripts/convert-with-sharp.js');
}

// Main execution
function main() {
  // Ensure directories exist
  if (!fs.existsSync('scripts')) {
    fs.mkdirSync('scripts');
  }
  
  if (!fs.existsSync('public')) {
    fs.mkdirSync('public');
  }
  
  // Generate instructions and SVG files
  generateInstructions();
  
  // Create Sharp conversion script
  createSharpScript();
}

main();
