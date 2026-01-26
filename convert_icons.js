const fs = require('fs');
const png2icons = require('png2icons');

function convert(infile, outfile, format) {
    console.log(`Converting ${infile} to ${outfile} (${format})...`);
    const inputBuffer = fs.readFileSync(infile);
    let outputBuffer;

    if (format === 'ico') {
        outputBuffer = png2icons.createICO(inputBuffer, png2icons.HERMITE, 0, false);
    } else if (format === 'icns') {
        outputBuffer = png2icons.createICNS(inputBuffer, png2icons.HERMITE, 0);
    }

    if (outputBuffer) {
        fs.writeFileSync(outfile, outputBuffer);
        console.log(`Successfully created ${outfile}`);
    } else {
        console.error(`Failed to create ${outfile}`);
    }
}

const args = process.argv.slice(2);
if (args.length < 3) {
    console.log("Usage: node convert_icons.js <infile> <outfile> <format>");
    process.exit(1);
}

convert(args[0], args[1], args[2]);
