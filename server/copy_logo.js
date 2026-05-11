const fs = require('fs');
const path = require('path');

const src = "C:\\Users\\Zidhan\\.gemini\\antigravity\\brain\\71d81693-cc4f-4f89-875a-dd293581b63a\\dayhr_logo_v1_1778483009291.png";
const dest = "c:\\hris-project PERN\\client\\public\\logo.png";

try {
    fs.copyFileSync(src, dest);
    console.log('✅ Logo successfully copied to client/public/logo.png');
} catch (err) {
    console.error('❌ Error copying logo:', err.message);
}
