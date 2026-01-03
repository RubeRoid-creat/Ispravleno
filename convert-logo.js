const fs = require('fs');
const sharp = require('sharp');

// Конвертация SVG в PNG
sharp('logo_ispravleno_full.svg')
  .resize(800, 200)
  .png()
  .toFile('logo_ispravleno_full.png')
  .then(() => {
    console.log('✅ Логотип успешно конвертирован в PNG: logo_ispravleno_full.png');
  })
  .catch(err => {
    console.error('❌ Ошибка конвертации:', err);
  });

