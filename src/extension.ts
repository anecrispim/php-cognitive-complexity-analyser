import * as vscode from 'vscode';
import { ComplexityAnalyser } from './ComplexityAnalyser';
import { ConfigValidator } from './ConfigValidator';
import * as fs from 'fs';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
    console.log('PHP Cognitive Complexity Analyzer extension is active.');

	// Registrar o comando de análise de complexidade
    let disposable = vscode.commands.registerCommand('extension.analyzeComplexity', () => {
        // Validação do arquivo de configuração json com as complexidades a serem analisadas
        const rootPath = vscode.workspace.workspaceFolders?.[0].uri.fsPath || vscode.workspace.rootPath;

        if (!rootPath) {
            vscode.window.showWarningMessage('Please open a project folder to use this extension.');
            return;
        }

        const configFilePath = path.join(rootPath, 'complexity-config.json');
        const defaultConfigPath = path.join(context.extensionPath, 'src', 'config', 'complexity-config.json');

        // Verifica se o arquivo de configuração já existe na raiz do projeto
        if (!fs.existsSync(configFilePath)) {
            // Copia o arquivo de configuração para o diretório raiz do projeto do usuário
            fs.copyFileSync(defaultConfigPath, configFilePath);
            vscode.window.showInformationMessage('complexity-config.json file added to project root.');
        }

        // Validação da estrutura do arquivo
        const configValidator = new ConfigValidator(context);
        const configPath = path.join(vscode.workspace.rootPath || '', 'complexity-config.json');

        if (fs.existsSync(configPath)) {
            if (configValidator.validateUserConfig(configPath)) {
                vscode.window.showInformationMessage("Configuration validated successfully!");
            } else {
                vscode.window.showErrorMessage("The configuration file is invalid.");
            }
        } else {
            vscode.window.showErrorMessage("The configuration file complexity-config.json was not found.");
        }

        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active text editor!');
            return;
        }

        const fileName = editor.document.fileName;
        if (!fileName.endsWith(".php")) {
            vscode.window.showWarningMessage("A extensão só pode ser executada em arquivos PHP.");
            return;
        }

        const phpCode = editor.document.getText();

        const complexityAnalyzer = new ComplexityAnalyser(configPath);
        const ast = complexityAnalyzer.getAST(phpCode);

        complexityAnalyzer.calculateComplexity(phpCode);

        vscode.workspace.onDidChangeTextDocument((event) => {
            const editor = vscode.window.activeTextEditor;
        
            if (editor && editor.document === event.document) {
                complexityAnalyzer.clearDecorations(editor);
                complexityAnalyzer.clearDiagnostics(editor);
            }
        });

        // Exibe a AST no console para debug
        console.log(JSON.stringify(ast, null, 2));
    });

    // Adicionar o comando ao contexto
    context.subscriptions.push(disposable);
}

export function deactivate() {
    console.log('The PHP Cognitive Complexity Analyzer extension has been disabled.');
}

