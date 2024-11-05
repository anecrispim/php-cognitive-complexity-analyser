import * as vscode from 'vscode';
import { ComplexityAnalyser } from './ComplexityAnalyser';

export function activate(context: vscode.ExtensionContext) {
    console.log('PHP Cognitive Complexity Analyzer extension is active.');

	// Registrar o comando de análise de complexidade
    let disposable = vscode.commands.registerCommand('extension.analyzeComplexity', () => {
        vscode.window.showInformationMessage('ativada');
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active text editor!');
            return;
        }

        const phpCode = editor.document.getText();

        const complexityAnalyzer = new ComplexityAnalyser();
        const ast = complexityAnalyzer.getAST(phpCode);

        // Exibe a AST no console para debug
        console.log(JSON.stringify(ast, null, 2));
    });

    // Adicionar o comando ao contexto
    context.subscriptions.push(disposable);
}

export function deactivate() {
    console.log('The PHP Cognitive Complexity Analyzer extension has been disabled.');
}

