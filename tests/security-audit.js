#!/usr/bin/env node

/**
 * Security Audit Tool for Pi Network Integration
 * Scans for potential security vulnerabilities and credential exposure
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔐 Starting Security Audit for Pi Network Integration...\n');

// Security patterns to detect
const SECURITY_PATTERNS = {
    CRITICAL: [
        /PI_APP_SECRET\s*=\s*["'][^"']+["']/gi,
        /PI_PLATFORM_API_KEY\s*=\s*["'][^"']+["']/gi,
        /pi[_-]?app[_-]?secret\s*:\s*["'][^"']+["']/gi,
        /platform[_-]?api[_-]?key\s*:\s*["'][^"']+["']/gi
    ],
    WARNING: [
        /PI_APP_ID\s*=\s*["'][^"']+["']/gi,
        /console\.log.*PI_APP_SECRET/gi,
        /console\.log.*PLATFORM_API_KEY/gi,
        /alert.*PI_APP_SECRET/gi
    ],
    INFO: [
        /\.env/gi,
        /process\.env\./gi,
        /PI_APP_ID/gi
    ]
};

const SCAN_DIRECTORIES = ['public', 'netlify', 'src'];
const EXCLUDE_PATTERNS = [
    'node_modules',
    '.git',
    'dist',
    'build',
    '.netlify'
];

/**
 * Scan file for security issues
 */
function scanFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const issues = [];

        // Check for critical patterns
        SECURITY_PATTERNS.CRITICAL.forEach(pattern => {
            const matches = content.match(pattern);
            if (matches) {
                matches.forEach(match => {
                    issues.push({
                        level: 'CRITICAL',
                        pattern: match,
                        description: 'Hardcoded secret detected in source code'
                    });
                });
            }
        });

        // Check for warning patterns
        SECURITY_PATTERNS.WARNING.forEach(pattern => {
            const matches = content.match(pattern);
            if (matches) {
                matches.forEach(match => {
                    issues.push({
                        level: 'WARNING',
                        pattern: match,
                        description: 'Potential secret exposure in logs or alerts'
                    });
                });
            }
        });

        // Check for info patterns
        SECURITY_PATTERNS.INFO.forEach(pattern => {
            const matches = content.match(pattern);
            if (matches && matches.length > 0) {
                issues.push({
                    level: 'INFO',
                    pattern: `${matches.length} references`,
                    description: 'Environment variable usage detected'
                });
            }
        });

        return issues;
    } catch (error) {
        return [{
            level: 'ERROR',
            pattern: error.message,
            description: 'Failed to scan file'
        }];
    }
}

/**
 * Recursively scan directory
 */
function scanDirectory(dir, results = {}) {
    const items = fs.readdirSync(dir);

    items.forEach(item => {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        // Skip excluded patterns
        if (EXCLUDE_PATTERNS.some(pattern => fullPath.includes(pattern))) {
            return;
        }

        if (stat.isDirectory()) {
            scanDirectory(fullPath, results);
        } else if (stat.isFile()) {
            // Only scan relevant file types
            const ext = path.extname(fullPath).toLowerCase();
            if (['.js', '.ts', '.json', '.html', '.env', '.md'].includes(ext)) {
                const issues = scanFile(fullPath);
                if (issues.length > 0) {
                    results[fullPath] = issues;
                }
            }
        }
    });

    return results;
}

/**
 * Check git history for exposed secrets
 */
function checkGitHistory() {
    console.log('🔍 Checking Git history for exposed secrets...');
    
    try {
        const gitLog = execSync('git log --all -p --grep="PI_APP_SECRET\\|PI_PLATFORM_API_KEY" || echo "No matches"', 
            { encoding: 'utf8', cwd: process.cwd() });
        
        if (gitLog.includes('PI_APP_SECRET') || gitLog.includes('PI_PLATFORM_API_KEY')) {
            return ['CRITICAL: Secrets found in git history - immediate rotation required'];
        }
        
        return [];
    } catch (error) {
        return [`WARNING: Could not check git history - ${error.message}`];
    }
}

/**
 * Check environment file security
 */
function checkEnvironmentFiles() {
    const issues = [];
    
    // Check if .env files exist and are properly ignored
    const envFiles = ['.env', '.env.local', '.env.production', '.env.development'];
    
    envFiles.forEach(envFile => {
        if (fs.existsSync(envFile)) {
            try {
                // Check if file is tracked by git
                execSync(`git ls-files --error-unmatch ${envFile}`, { stdio: 'ignore' });
                issues.push(`CRITICAL: ${envFile} is tracked by git - should be in .gitignore`);
            } catch (error) {
                // File is not tracked, which is good
                issues.push(`INFO: ${envFile} exists and is properly ignored by git`);
            }
        }
    });

    return issues;
}

/**
 * Validate runtime environment
 */
function validateEnvironment() {
    const issues = [];
    const requiredVars = ['PI_APP_ID', 'PI_APP_SECRET', 'PI_PLATFORM_API_KEY'];
    
    requiredVars.forEach(varName => {
        const value = process.env[varName];
        if (!value) {
            issues.push(`WARNING: ${varName} not set in environment`);
        } else if (value === `your_${varName.toLowerCase()}` || value.includes('example')) {
            issues.push(`CRITICAL: ${varName} contains example/placeholder value`);
        } else if (value.length < 8) {
            issues.push(`WARNING: ${varName} seems too short (${value.length} chars)`);
        } else {
            issues.push(`INFO: ${varName} is properly configured`);
        }
    });

    return issues;
}

/**
 * Generate security report
 */
function generateReport(scanResults, gitIssues, envIssues, runtimeIssues) {
    const report = {
        timestamp: new Date().toISOString(),
        summary: {
            critical: 0,
            warning: 0,
            info: 0,
            total: 0
        },
        files: scanResults,
        git: gitIssues,
        environment: envIssues,
        runtime: runtimeIssues
    };

    // Count issues
    Object.values(scanResults).forEach(fileIssues => {
        fileIssues.forEach(issue => {
            report.summary[issue.level.toLowerCase()]++;
            report.summary.total++;
        });
    });

    // Count other issues
    [...gitIssues, ...envIssues, ...runtimeIssues].forEach(issue => {
        if (issue.startsWith('CRITICAL')) {
            report.summary.critical++;
        } else if (issue.startsWith('WARNING')) {
            report.summary.warning++;
        } else {
            report.summary.info++;
        }
        report.summary.total++;
    });

    return report;
}

/**
 * Main audit function
 */
function runSecurityAudit() {
    console.log('📂 Scanning source code...');
    let scanResults = {};
    
    // Scan each directory
    SCAN_DIRECTORIES.forEach(dir => {
        if (fs.existsSync(dir)) {
            const dirResults = scanDirectory(dir);
            scanResults = { ...scanResults, ...dirResults };
        }
    });

    console.log('📜 Checking git history...');
    const gitIssues = checkGitHistory();

    console.log('🗂️ Checking environment files...');
    const envIssues = checkEnvironmentFiles();

    console.log('⚙️ Validating runtime environment...');
    const runtimeIssues = validateEnvironment();

    // Generate report
    const report = generateReport(scanResults, gitIssues, envIssues, runtimeIssues);

    // Display results
    console.log('\n' + '='.repeat(60));
    console.log('📊 SECURITY AUDIT REPORT');
    console.log('='.repeat(60));
    
    console.log(`\n📈 Summary:`);
    console.log(`  🔴 Critical: ${report.summary.critical}`);
    console.log(`  🟡 Warning:  ${report.summary.warning}`);
    console.log(`  ℹ️  Info:     ${report.summary.info}`);
    console.log(`  📋 Total:    ${report.summary.total}`);

    if (report.summary.critical > 0) {
        console.log('\n🚨 CRITICAL ISSUES FOUND:');
        
        // Show file issues
        Object.entries(report.files).forEach(([file, issues]) => {
            const criticalIssues = issues.filter(i => i.level === 'CRITICAL');
            if (criticalIssues.length > 0) {
                console.log(`\n📄 ${file}:`);
                criticalIssues.forEach(issue => {
                    console.log(`  🔴 ${issue.description}`);
                    console.log(`     Pattern: ${issue.pattern}`);
                });
            }
        });

        // Show other critical issues
        [...report.git, ...report.environment, ...report.runtime]
            .filter(issue => issue.startsWith('CRITICAL'))
            .forEach(issue => {
                console.log(`\n🔴 ${issue}`);
            });

        console.log('\n🚑 IMMEDIATE ACTIONS REQUIRED:');
        console.log('1. Remove hardcoded secrets from source code');
        console.log('2. Move secrets to environment variables');
        console.log('3. Add files with secrets to .gitignore');
        console.log('4. Rotate all exposed credentials immediately');
        console.log('5. Review git history and consider BFG Repo-Cleaner');
    }

    if (report.summary.warning > 0) {
        console.log('\n⚠️ WARNINGS (should be addressed):');
        
        Object.entries(report.files).forEach(([file, issues]) => {
            const warningIssues = issues.filter(i => i.level === 'WARNING');
            if (warningIssues.length > 0) {
                console.log(`\n📄 ${file}:`);
                warningIssues.forEach(issue => {
                    console.log(`  🟡 ${issue.description}`);
                });
            }
        });

        [...report.git, ...report.environment, ...report.runtime]
            .filter(issue => issue.startsWith('WARNING'))
            .forEach(issue => {
                console.log(`\n🟡 ${issue}`);
            });
    }

    console.log('\n✅ SECURITY RECOMMENDATIONS:');
    console.log('1. Use .env files for local development');
    console.log('2. Set environment variables in Netlify dashboard');
    console.log('3. Regularly rotate Pi Network credentials');
    console.log('4. Monitor API access patterns');
    console.log('5. Use different credentials for staging/production');
    console.log('6. Enable 2FA on Pi Developer account');

    // Save report
    const reportPath = 'security-audit-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n💾 Detailed report saved to: ${reportPath}`);

    // Security score
    const score = Math.max(0, 100 - (report.summary.critical * 25) - (report.summary.warning * 10));
    console.log(`\n🎯 Security Score: ${score}/100`);
    
    if (score >= 90) {
        console.log('🏆 Excellent security posture!');
    } else if (score >= 70) {
        console.log('✅ Good security, minor improvements needed');
    } else if (score >= 50) {
        console.log('⚠️ Security concerns, action required');
    } else {
        console.log('🚨 Critical security issues, immediate action required');
    }

    console.log('\n' + '='.repeat(60));

    return report.summary.critical === 0;
}

// Run audit if called directly
if (require.main === module) {
    const success = runSecurityAudit();
    process.exit(success ? 0 : 1);
}

module.exports = { runSecurityAudit };