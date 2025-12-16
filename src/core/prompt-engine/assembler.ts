import { MASTER_PROMPT_TEMPLATE, SOURCE_MODULES, TARGET_MODULES } from './templates';

export interface PromptContext {
    clientName: string;
    sourceTech: 'jsp' | 'php' | 'jquery'; // In a real app, this would be more dynamic
    targetTech: 'react' | 'angular';
    filename: string;
    sourceCode: string;
    fileExt: string;
}

export class PromptAssembler {
    static assemble(context: PromptContext): string {
        let prompt = MASTER_PROMPT_TEMPLATE;

        const sourceRules = SOURCE_MODULES[context.sourceTech] || '<!-- No specific source rules found -->';
        const targetRules = TARGET_MODULES[context.targetTech] || '<!-- No specific target rules found -->';

        // Replace variables
        prompt = prompt.replace('{{CLIENT_COMPANY_NAME}}', context.clientName);
        prompt = prompt.replace('{{SOURCE_TECH}}', context.sourceTech.toUpperCase());
        prompt = prompt.replace('{{TARGET_TECH}}', context.targetTech.toUpperCase());
        prompt = prompt.replace('{{SOURCE_SPECIFIC_RULES}}', sourceRules);
        prompt = prompt.replace('{{TARGET_SPECIFIC_RULES}}', targetRules);
        prompt = prompt.replace('{{FILENAME}}', context.filename);
        prompt = prompt.replace('{{SOURCE_FILE_EXT}}', context.fileExt);
        prompt = prompt.replace('{{SOURCE_CODE}}', context.sourceCode);

        return prompt;
    }
}
