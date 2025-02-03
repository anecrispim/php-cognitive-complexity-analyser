import * as vscode from 'vscode';
import { ComplexityAnalyser } from './analysis/ComplexityAnalyser';
import { ConfigValidator } from './analysis/ConfigValidator';
import { MessageContext } from './messages/MessageContext';
import * as fs from 'fs';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
    const messageContext = new MessageContext();
    
	// Registrar o comando de análise de complexidade
    let disposable = vscode.commands.registerCommand('extension.analyzeComplexity', () => {
        // Validação do arquivo de configuração json com as complexidades a serem analisadas
        const rootPath = vscode.workspace.workspaceFolders?.[0].uri.fsPath || vscode.workspace.rootPath;

        if (!rootPath) {
            vscode.window.showWarningMessage(messageContext.getMessage("emptyProjectFolder"));
            return;
        }

        const configFilePath = path.join(rootPath, 'complexity-config.json');
        const defaultConfigPath = path.join(context.extensionPath, 'src', 'config', 'complexity-config.json');

        // Verifica se o arquivo de configuração já existe na raiz do projeto
        if (!fs.existsSync(configFilePath)) {
            // Copia o arquivo de configuração para o diretório raiz do projeto do usuário
            fs.copyFileSync(defaultConfigPath, configFilePath);
            vscode.window.showInformationMessage(messageContext.getMessage("configFileAdded"));
        }

        // Validação da estrutura do arquivo
        const configValidator = new ConfigValidator(context);
        const configPath = path.join(vscode.workspace.rootPath || '', 'complexity-config.json');

        if (fs.existsSync(configPath)) {
            if (configValidator.validateUserConfig(configPath)) {
                vscode.window.showInformationMessage(messageContext.getMessage("validConfig"));
            } else {
                vscode.window.showErrorMessage(messageContext.getMessage("invalidConfig"));
                return;
            }
        } else {
            vscode.window.showErrorMessage(messageContext.getMessage("notFoundConfig"));
            return;
        }

        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage(messageContext.getMessage("inativeTextEditor"));
            return;
        }

        const fileName = editor.document.fileName;
        if (!fileName.endsWith(".php")) {
            vscode.window.showWarningMessage(messageContext.getMessage("invalidFile"));
            return;
        }

        const phpCode = editor.document.getText();

        const complexityAnalyzer = new ComplexityAnalyser(configPath);

        complexityAnalyzer.calculateComplexity(phpCode);

        vscode.workspace.onDidChangeTextDocument((event) => {
            const editor = vscode.window.activeTextEditor;
        
            if (editor && editor.document === event.document) {
                complexityAnalyzer.clearDecorations(editor);
                complexityAnalyzer.clearDiagnostics(editor);
            }
        });
    });

    // Adicionar o comando ao contexto
    context.subscriptions.push(disposable);
}

export function deactivate() {
    console.log('The PHP Cognitive Complexity Analyzer extension has been disabled.');
}

