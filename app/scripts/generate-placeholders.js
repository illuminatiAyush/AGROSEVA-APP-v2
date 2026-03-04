// Script to generate placeholder assets
// Run with: npm run generate-assets

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, '..', 'assets');

// Ensure assets directory exists
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Create a simple green square (AgroSeva theme color: #4CAF50)
const createImage = async (filename, size) => {
  try {
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 76, g: 175, b: 80, alpha: 1 } // #4CAF50 green
      }
    })
    .png()
    .toFile(path.join(assetsDir, filename));
    
    console.log(`✅ Created ${filename} (${size}x${size})`);
  } catch (error) {
    console.error(`❌ Error creating ${filename}:`, error.message);
  }
};

const generateAll = async () => {
  console.log('🎨 Generating placeholder assets...\n');
  
  await createImage('icon.png', 1024);
  await createImage('splash.png', 1242);
  await createImage('adaptive-icon.png', 1024);
  await createImage('favicon.png', 48);
  
  console.log('\n✅ All placeholder assets created!');
  console.log('📝 These are simple green squares - replace with actual assets before production.');
};

generateAll().catch(error => {
  console.error('❌ Error generating assets:', error);
  process.exit(1);
});
