export interface ValidationResult {
    isValid: boolean;
    errors: string[];
}

export class CodeSafeGuard {

    /**
     * Validates generated code against critical safety rules before showing it to the user.
     */
    static validate(code: string, targetTech: 'react' | 'angular'): ValidationResult {
        const errors: string[] = [];

        // 1. Syntax Check: Hallucinated Imports
        if (code.includes("import") && code.includes("from '...'")) {
            errors.push("CRITICAL: The AI generated a placeholder import ('...'). Requires explicit path resolution.");
        }

        // 2. Security Check: Dangerous usage
        if (code.includes("dangerouslySetInnerHTML") || code.includes("[innerHTML]")) {
            // Allow only if explicitly commented as clean
            if (!code.includes("// TRUSTED_CONTENT")) {
                errors.push("SECURITY: Unsafe HTML injection detected without '// TRUSTED_CONTENT' verified comment.");
            }
        }

        // 3. Logic Check: Empty functions
        const emptyFunctionPattern = /(const|function)\s+\w+\s*=?\s*(\([^)]*\)|)\s*=>?\s*{\s*}/;
        if (emptyFunctionPattern.test(code)) {
            errors.push("LOGIC: Detected empty function implementation. Business logic may be missing.");
        }

        // 4. Tech Specific Checks
        if (targetTech === 'react') {
            if (code.includes("class ") && code.includes("extends React.Component")) {
                errors.push("ARCH: strict-mode violation. Class components are forbidden. Use Functional components.");
            }
            if (!code.includes("interface") && !code.includes("type ")) {
                errors.push("TS: Missing TypeScript interfaces/types for props or state.");
            }
        }

        if (targetTech === 'angular') {
            if (!code.includes("@Component")) {
                errors.push("ANGULAR: Missing @Component decorator.");
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Generates a "Repair Prompt" to send back to the LLM if validation fails.
     */
    static generateRepairPrompt(originalCode: string, errors: string[]): string {
        return `
# SYSTEM ALERT: COMPILATION/SAFETY FAILED
The code you generated failed our strict Enterprise safety checks.
You MUST fix these errors and regenerate the ENTIRE file.

**Errors Found:**
${errors.map(e => `- ${e}`).join('\n')}

**Original Faulty Code:**
\`\`\`typescript
${originalCode}
\`\`\`

**Instructions:**
1. Fix the specific errors listed above.
2. Do not explain the fix, just output the corrected code.
`;
    }
}
