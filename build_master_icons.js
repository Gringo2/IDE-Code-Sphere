const fs = require('fs');
const png2icons = require('png2icons');
const path = require('path');

const root = 'c:/Users/jobsb/Desktop/codesphere-IDE';
const jobs = [
    { src: 'icons/stable/codesphere_512.png', base: 'icons/stable/code' },
    { src: 'icons/insider/codesphere_512.png', base: 'icons/insider/code' }
];

jobs.forEach(job => {
    const srcPath = path.join(root, job.src);
    console.log(`Processing ${srcPath}...`);

    if (!fs.existsSync(srcPath)) {
        console.error(`Source not found: ${srcPath}`);
        return;
    }

    const inputBuffer = fs.readFileSync(srcPath);

    // Try generating ICO with the direct buffer
    console.log(`  Attempting ICO generation...`);
    try {
        const ico = png2icons.createICO(inputBuffer, png2icons.HERMITE, 0, false);
        if (ico) {
            fs.writeFileSync(path.join(root, job.base + '.ico'), ico);
            console.log(`  [OK] Created ${job.base}.ico - Size: ${ico.length} bytes`);
        } else {
            console.error(`  [FAIL] ICO generation returned null for ${job.base}`);
        }
    } catch (e) {
        console.error(`  [ERROR] ICO: ${e.message}`);
    }

    // Try generating ICNS
    console.log(`  Attempting ICNS generation...`);
    try {
        const icns = png2icons.createICNS(inputBuffer, png2icons.HERMITE, 0);
        if (icns) {
            fs.writeFileSync(path.join(root, job.base + '.icns'), icns);
            console.log(`  [OK] Created ${job.base}.icns - Size: ${icns.length} bytes`);
        } else {
            console.error(`  [FAIL] ICNS generation returned null for ${job.base}`);
        }
    } catch (e) {
        console.error(`  [ERROR] ICNS: ${e.message}`);
    }
});
