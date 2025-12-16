/**
 * Ejemplo de uso del TechDebtAnalyzer
 * Demuestra cómo analizar código legacy y calcular deuda técnica
 */

import { TechDebtAnalyzer } from '../src/core/analysis/TechDebtAnalyzer.js';

// ============================================================================
// EJEMPLO 1: Código Legacy TÓXICO (Score esperado: ~80)
// ============================================================================

const toxicLegacyCode = `
// Legacy Banking System - 2005
// TODO: Refactor this mess
// FIXME: Security issues
// HACK: Temporary workaround

function processTransaction(data) {
    if (data) {
        if (data.amount) {
            if (data.amount > 0) {
                if (data.type === 'deposit') {
                    if (data.account) {
                        if (data.account.status === 'active') {
                            if (data.account.balance !== undefined) {
                                // Spaghetti Indentation Level 7!
                                if (data.account.balance + data.amount < 1000000) {
                                    data.account.balance += data.amount;
                                    console.log('Deposit successful');
                                }
                            }
                        }
                    }
                } else if (data.type === 'withdrawal') {
                    if (data.account) {
                        if (data.account.status === 'active') {
                            if (data.account.balance !== undefined) {
                                if (data.account.balance >= data.amount) {
                                    data.account.balance -= data.amount;
                                    console.log('Withdrawal successful');
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

// TODO: Add error handling
// FIXME: This breaks with negative numbers
// HACK: Magic number alert
function calculateFee(amount) {
    if (amount > 5000) return amount * 0.03;
    if (amount > 1000) return amount * 0.05;
    if (amount > 500) return amount * 0.08;
    return 25; // Magic number!
}

// God Method - 80 lines of logic
function validateUser(user) {
    var isValid = false;
    if (user.name) {
        if (user.name.length > 3) {
            if (user.email) {
                if (user.email.indexOf('@') > 0) {
                    if (user.age) {
                        if (user.age > 18) {
                            if (user.age < 120) {
                                if (user.address) {
                                    if (user.address.city) {
                                        if (user.address.zip) {
                                            if (user.phone) {
                                                isValid = true;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    return isValid;
}

// eval() - CRITICAL SECURITY RISK
function dynamicCalculation(formula) {
    return eval(formula);
}

// jQuery Spaghetti
$('#user-list').find('.user-row').filter('.active').each(function() {
    $(this).find('.status').addClass('online').removeClass('offline').css('color', 'green');
});

// Commented code everywhere
// function oldFunction() {
//     console.log('This is old');
// }
// var oldVar = 123;
// if (oldCondition) {
//     doSomething();
// }

// TODO: Remove this before production
// FIXME: Memory leak here
// HACK: This is a quick fix
// XXX: Dangerous code
`;

// ============================================================================
// EJEMPLO 2: Código LIMPIO (Score esperado: ~15)
// ============================================================================

const cleanModernCode = `
/**
 * Modern Banking System - 2024
 * Type-safe, well-structured, tested
 */

interface Transaction {
  amount: number;
  type: 'deposit' | 'withdrawal';
  account: Account;
}

interface Account {
  id: string;
  balance: number;
  status: 'active' | 'inactive';
}

class TransactionService {
  processTransaction(transaction: Transaction): Result {
    if (!this.isValid(transaction)) {
      return { success: false, error: 'Invalid transaction' };
    }

    return transaction.type === 'deposit'
      ? this.processDeposit(transaction)
      : this.processWithdrawal(transaction);
  }

  private isValid(transaction: Transaction): boolean {
    return transaction.amount > 0 && transaction.account.status === 'active';
  }

  private processDeposit(transaction: Transaction): Result {
    transaction.account.balance += transaction.amount;
    return { success: true };
  }

  private processWithdrawal(transaction: Transaction): Result {
    if (transaction.account.balance < transaction.amount) {
      return { success: false, error: 'Insufficient funds' };
    }
    
    transaction.account.balance -= transaction.amount;
    return { success: true };
  }
}
`;

// ============================================================================
// EJECUTAR ANÁLISIS
// ============================================================================

console.log('🧬 OSMOSIS - Tech Debt Analyzer\n');
console.log('='.repeat(70));

const analyzer = new TechDebtAnalyzer();

// Analizar código tóxico
console.log('\n📊 ANÁLISIS 1: Código Legacy Banking (2005)\n');
console.log('-'.repeat(70));
const toxicMetrics = analyzer.analyzeFile(toxicLegacyCode, 'legacy-banking.js');

console.log(`\n🎯 DEBT SCORE: ${toxicMetrics.score}/100 ${getScoreEmoji(toxicMetrics.score)}`);
console.log(`⏱️  REFACTOR TIME: ${toxicMetrics.estimatedRefactorHours} hours`);
console.log(`💰 ESTIMATED COST: $${(toxicMetrics.estimatedRefactorHours * 150).toLocaleString()}`);

console.log('\n📋 ISSUES DETECTED:');
toxicMetrics.issues.forEach(issue => console.log(`   ${issue}`));

console.log('\n📈 DETAILS:');
console.log(`   Max Indentation: ${toxicMetrics.details.maxIndentation} levels`);
console.log(`   Line Count: ${toxicMetrics.details.lineCount}`);
console.log(`   TODOs/FIXMEs: ${toxicMetrics.details.todoCount}`);
console.log(`   Magic Numbers: ${toxicMetrics.details.magicNumberCount}`);
console.log(`   Long Methods: ${toxicMetrics.details.longMethodCount}`);

// Analizar código limpio
console.log('\n' + '='.repeat(70));
console.log('\n📊 ANÁLISIS 2: Código Moderno (2024)\n');
console.log('-'.repeat(70));
const cleanMetrics = analyzer.analyzeFile(cleanModernCode, 'modern-banking.ts');

console.log(`\n🎯 DEBT SCORE: ${cleanMetrics.score}/100 ${getScoreEmoji(cleanMetrics.score)}`);
console.log(`⏱️  REFACTOR TIME: ${cleanMetrics.estimatedRefactorHours} hours`);
console.log(`💰 ESTIMATED COST: $${(cleanMetrics.estimatedRefactorHours * 150).toLocaleString()}`);

if (cleanMetrics.issues.length > 0) {
  console.log('\n📋 ISSUES DETECTED:');
  cleanMetrics.issues.forEach(issue => console.log(`   ${issue}`));
} else {
  console.log('\n✅ NO ISSUES - Clean Code!');
}

console.log('\n📈 DETAILS:');
console.log(`   Max Indentation: ${cleanMetrics.details.maxIndentation} levels`);
console.log(`   Line Count: ${cleanMetrics.details.lineCount}`);
console.log(`   TODOs/FIXMEs: ${cleanMetrics.details.todoCount}`);
console.log(`   Magic Numbers: ${cleanMetrics.details.magicNumberCount}`);

// Análisis de proyecto completo
console.log('\n' + '='.repeat(70));
console.log('\n📊 ANÁLISIS DE PROYECTO COMPLETO\n');
console.log('-'.repeat(70));

const projectFiles = new Map<string, string>([
  ['legacy-banking.js', toxicLegacyCode],
  ['modern-banking.ts', cleanModernCode],
  ['utils.js', 'function add(a, b) { return a + b; }'],
]);

const projectReport = analyzer.analyzeProject(projectFiles);

console.log(`\n🎯 PROJECT DEBT SCORE: ${projectReport.totalScore}/100 ${getScoreEmoji(projectReport.totalScore)}`);
console.log(`📁 Total Files: ${projectReport.totalFiles}`);
console.log(`🔴 Toxic Files: ${projectReport.toxicFiles.length}`);
console.log(`⏱️  Total Refactor Time: ${projectReport.totalRefactorHours} hours`);
console.log(`💰 TOTAL COST: $${projectReport.totalCost.toLocaleString()}`);

console.log('\n💡 RECOMMENDATIONS:');
projectReport.recommendations.forEach(rec => console.log(`   ${rec}`));

if (projectReport.toxicFiles.length > 0) {
  console.log('\n🔴 TOXIC FILES (Priority Queue):');
  projectReport.toxicFiles.forEach((file, index) => {
    console.log(`   ${index + 1}. Score ${file.score}/100 - ${file.estimatedRefactorHours}h refactor`);
  });
}

console.log('\n' + '='.repeat(70));
console.log('\n✅ Analysis Complete! Use Osmosis to automate the migration.\n');

// ============================================================================
// HELPER
// ============================================================================

function getScoreEmoji(score: number): string {
  if (score >= 80) return '🔴 CRITICAL';
  if (score >= 60) return '🟠 HIGH';
  if (score >= 40) return '🟡 MODERATE';
  if (score >= 20) return '🔵 LOW';
  return '✅ CLEAN';
}

