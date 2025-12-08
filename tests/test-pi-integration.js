#!/usr/bin/env node

/**
 * Pi Network Integration Test Script
 * Kiểm tra tích hợp Pi Network cho XemGiaDat
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

console.log('🚀 Starting Pi Network Integration Test...\n');

// Configuration
const CONFIG = {
    PORT: 5000,
    PUBLIC_DIR: path.join(__dirname, 'public'),
    TEST_TIMEOUT: 30000
};

/**
 * Start local server
 */
function startServer() {
    return new Promise((resolve, reject) => {
        const server = http.createServer((req, res) => {
            let filePath = path.join(CONFIG.PUBLIC_DIR, req.url === '/' ? 'index.html' : req.url);
            
            // Security check
            if (!filePath.startsWith(CONFIG.PUBLIC_DIR)) {
                res.writeHead(403);
                res.end('Forbidden');
                return;
            }

            const extname = path.extname(filePath);
            const contentType = {
                '.html': 'text/html',
                '.js': 'text/javascript',
                '.css': 'text/css',
                '.json': 'application/json',
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.svg': 'image/svg+xml'
            }[extname] || 'text/plain';

            fs.readFile(filePath, (err, content) => {
                if (err) {
                    if (err.code === 'ENOENT') {
                        res.writeHead(404);
                        res.end('File not found');
                    } else {
                        res.writeHead(500);
                        res.end('Server error');
                    }
                } else {
                    res.writeHead(200, { 'Content-Type': contentType });
                    res.end(content);
                }
            });
        });

        server.listen(CONFIG.PORT, (err) => {
            if (err) {
                reject(err);
            } else {
                console.log(`✅ Local server started at http://localhost:${CONFIG.PORT}`);
                resolve(server);
            }
        });
    });
}

/**
 * Test Pi Network integration
 */
function runPiTests() {
    console.log('\n🧪 Running Pi Network Integration Tests...\n');

    const tests = [
        {
            name: 'Pi Browser Detection',
            description: 'Test browser environment detection',
            code: `
                const isPi = PiIntegration.isPiBrowser();
                console.log('Pi Browser detected:', isPi);
                return isPi !== undefined;
            `
        },
        {
            name: 'Pi Integration API',
            description: 'Test Pi integration API availability',
            code: `
                const api = window.PiIntegration;
                const hasRequiredMethods = api && 
                    typeof api.login === 'function' &&
                    typeof api.logout === 'function' &&
                    typeof api.donate === 'function';
                console.log('Pi Integration API available:', hasRequiredMethods);
                return hasRequiredMethods;
            `
        },
        {
            name: 'Configuration',
            description: 'Test configuration loading',
            code: `
                const config = PiIntegration.getConfig();
                const hasConfig = config && config.APP_NAME === 'XemGiaDat';
                console.log('Configuration loaded:', hasConfig, config);
                return hasConfig;
            `
        },
        {
            name: 'UI Bindings',
            description: 'Test UI element bindings',
            code: `
                const loginBtn = document.getElementById('login-btn');
                const logoutBtn = document.getElementById('logout-btn-menu');
                const hasBindings = loginBtn && logoutBtn;
                console.log('UI bindings active:', hasBindings);
                return hasBindings;
            `
        },
        {
            name: 'State Management',
            description: 'Test state management',
            code: `
                const state = PiIntegration.getState();
                const hasState = state && typeof state.isAuthenticated === 'boolean';
                console.log('State management working:', hasState, state);
                return hasState;
            `
        },
        {
            name: 'Notification System',
            description: 'Test notification display',
            code: `
                try {
                    PiIntegration.showNotification('Test notification', 'info');
                    setTimeout(() => {
                        const notifications = document.querySelectorAll('[class*="fixed"][class*="top-4"]');
                        console.log('Notification system working:', notifications.length > 0);
                    }, 100);
                    return true;
                } catch (error) {
                    console.error('Notification test failed:', error);
                    return false;
                }
            `
        }
    ];

    const testHTML = `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pi Network Integration Test</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .test-container { max-width: 800px; margin: 0 auto; }
        .test-item { background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #007bff; }
        .test-passed { border-left-color: #28a745; }
        .test-failed { border-left-color: #dc3545; }
        .test-pending { border-left-color: #ffc107; }
        .console-output { background: #000; color: #0f0; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 12px; margin-top: 10px; }
        .stats { background: #007bff; color: white; padding: 15px; border-radius: 8px; text-align: center; margin-bottom: 20px; }
    </style>
</head>
<body>
    <div class="test-container">
        <h1>🚀 Pi Network Integration Test</h1>
        
        <div class="stats">
            <h3>Test Results</h3>
            <div id="test-stats">Running tests...</div>
        </div>

        <div id="test-results">
            ${tests.map((test, index) => `
                <div id="test-${index}" class="test-item test-pending">
                    <h4>${test.name}</h4>
                    <p>${test.description}</p>
                    <div id="result-${index}">⏳ Running...</div>
                    <div id="console-${index}" class="console-output" style="display:none;"></div>
                </div>
            `).join('')}
        </div>
    </div>

    <!-- Load dependencies -->
    <script src="pinetwork.js"></script>
    
    <script>
        // Override console.log to capture output
        const originalConsoleLog = console.log;
        let testOutputs = {};
        
        function captureConsole(testId) {
            testOutputs[testId] = [];
            console.log = (...args) => {
                testOutputs[testId].push(args.map(arg => 
                    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
                ).join(' '));
                originalConsoleLog.apply(console, args);
            };
        }
        
        function restoreConsole() {
            console.log = originalConsoleLog;
        }

        // Test runner
        async function runTests() {
            const tests = ${JSON.stringify(tests)};
            let passed = 0;
            let failed = 0;
            
            for (let i = 0; i < tests.length; i++) {
                const test = tests[i];
                const testElement = document.getElementById(\`test-\${i}\`);
                const resultElement = document.getElementById(\`result-\${i}\`);
                const consoleElement = document.getElementById(\`console-\${i}\`);
                
                try {
                    captureConsole(i);
                    const result = await eval(\`(async () => { \${test.code} })()\`);
                    restoreConsole();
                    
                    if (result) {
                        passed++;
                        testElement.className = 'test-item test-passed';
                        resultElement.innerHTML = '✅ PASSED';
                        resultElement.style.color = '#28a745';
                    } else {
                        failed++;
                        testElement.className = 'test-item test-failed';
                        resultElement.innerHTML = '❌ FAILED';
                        resultElement.style.color = '#dc3545';
                    }
                } catch (error) {
                    restoreConsole();
                    failed++;
                    testElement.className = 'test-item test-failed';
                    resultElement.innerHTML = \`❌ ERROR: \${error.message}\`;
                    resultElement.style.color = '#dc3545';
                    testOutputs[i] = testOutputs[i] || [];
                    testOutputs[i].push('ERROR: ' + error.message);
                }
                
                // Show console output if available
                if (testOutputs[i] && testOutputs[i].length > 0) {
                    consoleElement.style.display = 'block';
                    consoleElement.textContent = testOutputs[i].join('\\n');
                }
                
                // Update stats
                document.getElementById('test-stats').innerHTML = \`
                    <div>Total: \${passed + failed} | ✅ Passed: \${passed} | ❌ Failed: \${failed}</div>
                \`;
                
                // Small delay between tests
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            // Final summary
            const percentage = Math.round((passed / (passed + failed)) * 100);
            document.getElementById('test-stats').innerHTML = \`
                <div>🎯 Tests Complete!</div>
                <div>Total: \${passed + failed} | ✅ Passed: \${passed} | ❌ Failed: \${failed}</div>
                <div>Success Rate: \${percentage}%</div>
            \`;
            
            console.log(\`\\n📊 Test Summary:\\n- Total: \${passed + failed}\\n- Passed: \${passed}\\n- Failed: \${failed}\\n- Success Rate: \${percentage}%\`);
        }
        
        // Auto-start tests when Pi integration is ready
        setTimeout(runTests, 1000);
    </script>
</body>
</html>
    `;

    // Write test file
    fs.writeFileSync(path.join(CONFIG.PUBLIC_DIR, 'pi-test.html'), testHTML);
    console.log('✅ Test file created at /pi-test.html');
    
    return `http://localhost:${CONFIG.PORT}/pi-test.html`;
}

/**
 * Main execution
 */
async function main() {
    try {
        // Check if public directory exists
        if (!fs.existsSync(CONFIG.PUBLIC_DIR)) {
            throw new Error(`Public directory not found: ${CONFIG.PUBLIC_DIR}`);
        }

        // Check if pinetwork.js exists
        const pinetworkPath = path.join(CONFIG.PUBLIC_DIR, 'pinetwork.js');
        if (!fs.existsSync(pinetworkPath)) {
            throw new Error(`Pi Network integration file not found: ${pinetworkPath}`);
        }

        // Start server
        const server = await startServer();

        // Create test page
        const testUrl = runPiTests();

        console.log('\n🎯 Testing Instructions:');
        console.log('1. Open the test URL in your browser:');
        console.log(`   ${testUrl}`);
        console.log('2. For Pi Browser testing, use Pi Browser app on mobile');
        console.log('3. Watch the automated test results');
        console.log('4. Check console for detailed logs');
        console.log('\\n📱 Pi Browser Testing:');
        console.log('- Download Pi Browser app on mobile');
        console.log('- Navigate to the test URL');
        console.log('- Tests will detect Pi Browser environment');
        
        console.log('\\n⚡ Quick Commands:');
        console.log('- Press Ctrl+C to stop the server');
        console.log('- Check logs in browser developer tools');
        console.log('- Edit pinetwork.js and refresh to test changes');

        // Handle graceful shutdown
        process.on('SIGINT', () => {
            console.log('\\n🛑 Shutting down test server...');
            server.close();
            process.exit(0);
        });

        // Keep running
        console.log('\\n🔄 Server is running... Press Ctrl+C to stop');

    } catch (error) {
        console.error('❌ Test setup failed:', error.message);
        console.log('\\n🔧 Troubleshooting:');
        console.log('- Ensure you are in the project root directory');
        console.log('- Check that public/pinetwork.js exists');
        console.log('- Verify Node.js is installed');
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}