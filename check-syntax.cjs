const fs = require('fs');
const acorn = require('acorn');

try {
    const code = fs.readFileSync('d:/DUAN1/Firebase/xemgiadat/public/script.js', 'utf8');
    console.log(`File loaded: ${code.length} characters, ${code.split('\n').length} lines`);
    
    let braces = 0, parens = 0, brackets = 0;
    let lastBraceLoc = null;
    
    for (const token of acorn.tokenizer(code, {ecmaVersion: 2022, locations: true})) {
        if (token.type.label === '{') {
            braces++;
            lastBraceLoc = token.loc.start;
        } else if (token.type.label === '}') {
            braces--;
        } else if (token.type.label === '(') {
            parens++;
        } else if (token.type.label === ')') {
            parens--;
        } else if (token.type.label === '[') {
            brackets++;
        } else if (token.type.label === ']') {
            brackets--;
        }
    }
    
    console.log(`Final balance:`);
    console.log(`  Braces: ${braces}`);
    console.log(`  Parens: ${parens}`);
    console.log(`  Brackets: ${brackets}`);
    
    if (braces > 0) {
        console.log(`\n❌ Missing ${braces} closing brace(s)`);
        console.log(`Last opening brace was at line ${lastBraceLoc.line}`);
    }
    
    console.log('\n✅ Tokenization complete');
} catch(e) {
    console.error('❌ Parse error:', e.message);
    if (e.loc) {
        console.error(`   At line ${e.loc.line}, column ${e.loc.column}`);
    }
    process.exit(1);
}
