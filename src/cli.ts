import fs from 'fs';
import path from 'path';
import { PromptAssembler, PromptContext } from './core/prompt-engine/assembler';

// Simple types for CLI args
interface CliArgs {
  sourceFile: string;
  sourceTech: string;
  targetTech: string;
  client: string;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const parsed: Partial<CliArgs> = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--source-file') parsed.sourceFile = args[++i];
    if (args[i] === '--source-tech') parsed.sourceTech = args[++i];
    if (args[i] === '--target-tech') parsed.targetTech = args[++i];
    if (args[i] === '--client') parsed.client = args[++i];
  }

  if (!parsed.sourceFile || !parsed.sourceTech || !parsed.targetTech) {
    console.error('Usage: ts-node src/cli.ts --source-file <path> --source-tech <jsp|php|jquery> --target-tech <react|angular> --client <ClientName>');
    process.exit(1);
  }

  return parsed as CliArgs;
}

async function main() {
  const args = parseArgs();

  try {
    const fullPath = path.resolve(args.sourceFile);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found: ${fullPath}`);
    }

    const sourceCode = fs.readFileSync(fullPath, 'utf-8');
    const ext = path.extname(fullPath).slice(1);

    const context: PromptContext = {
      clientName: args.client,
      sourceTech: args.sourceTech as any,
      targetTech: args.targetTech as any,
      filename: path.basename(fullPath),
      sourceCode,
      fileExt: ext
    };

    console.log('🔄 Osmosis - Assembling Universal Prompt...');
    console.log('---------------------------------------------------');

    const finalPrompt = PromptAssembler.assemble(context);

    console.log(finalPrompt);
    console.log('---------------------------------------------------');
    console.log('✅ Prompt ready for LLM');

    // --- SIMULATION OF LLM RESPONSE & SAFEGUARD ---
    console.log('\n🤖 Simulating LLM Generation...');

    // Simulating a "Bad" response first to demonstrate SafeGuard
    const simulatedBadCode = `
import React from 'react';
import { User } from '...'; // Hallucinated path

export class LegacyComponent extends React.Component { // Violation: Class Component
  render() {
    return <div dangerouslySetInnerHTML={{__html: this.props.content}} />; // Violation: Security
  }
}
    `;

    console.log('📥 Received Code from LLM.');

    console.log('\n🛡️ Running Osmosis SafeGuard...');
    const validation = CodeSafeGuard.validate(simulatedBadCode, args.targetTech as any);

    if (!validation.isValid) {
      console.error('❌ SafeGuard REJECTED the code:');
      validation.errors.forEach(e => console.error(`   - ${e}`));

      console.log('\n🔄 Self-Healing triggered. Sending Repair Prompt to LLM...');
      const repairPrompt = CodeSafeGuard.generateRepairPrompt(simulatedBadCode, validation.errors);
      console.log('--- REPAIR PROMPT ---');
      console.log(repairPrompt);
    } else {
      console.log('✅ SafeGuard PASSED. Writing to disk...');
    }

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

import { CodeSafeGuard } from './core/safeguard/validator';


main();

