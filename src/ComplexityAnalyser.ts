import * as parser from 'php-parser';
import * as path from 'path';
import * as vscode from 'vscode';
import * as fs from 'fs';
const decorationsMap: Map<string, vscode.TextEditorDecorationType> = new Map();
const diagnosticsMap: Map<string, vscode.Diagnostic[]> = new Map();
const diagnosticCollection: vscode.DiagnosticCollection = vscode.languages.createDiagnosticCollection('complexity');
export class ComplexityAnalyser {
    private userConfig: any;

    constructor(configUserPath: string) {
        this.loadUserConfig(configUserPath);
    }

    // Método para carregar o arquivo JSON do usuário
    private loadUserConfig(configPath: string): void {
        const configData = fs.readFileSync(configPath, 'utf8');
        this.userConfig = JSON.parse(configData);
    }

    // Método que gera a AST do código PHP
    public getAST(phpCode: string) {
        const phpParser = new parser.Engine({
            parser: {
                extractDoc: true,
                php7: true
            },
            ast: {
                withPositions: true
            }
        });

        // Obter o nome do arquivo atualmente aberto
        const editor = vscode.window.activeTextEditor;
        let fileName = 'userInput.php';

        if (editor) {
            const filePath = editor.document.fileName;
            fileName = path.basename(filePath); // Extrai apenas o nome do arquivo
        }

        try {
            // Passa o código PHP e o nome do arquivo do usuário
            const ast = phpParser.parseCode(phpCode, fileName);
            return ast;
        } catch (error) {
            if (error instanceof Error) {
                vscode.window.showErrorMessage(`Error generating AST: ${error.message}`);
            }
            return null;
        }
    }

    // Método para percorrer a AST
    private walkAST(node: any, callback: (node: any) => void): void {
        callback(node);

        if (node.children) {
            for (const child of node.children) {
                this.walkAST(child, callback);
            }
        } else if (node.body && Array.isArray(node.body)) {
            for (const child of node.body) {
                this.walkAST(child, callback);
            }
        }
    }

    // Método para calcular a complexidade de cada nó
    private calculateNodeComplexity(node: any): number {
        let complexity = 0;

        for (const indexKey in this.userConfig.totalFileComplexity.indices) {
            const index = this.userConfig.totalFileComplexity.indices[indexKey];
            const weights = index.weights;

            if (weights[node.kind]) {
                // Adiciona o peso correspondente ao tipo de nó
                complexity += weights[node.kind];
            }

            // Se o nó for um método, considere a visibilidade
            if (node.kind === 'method' && node.visibility && weights.visibility) {
                complexity += weights.visibility[node.visibility] || 0;
            }
        }

        return complexity;
    }

    // Metodo responsável por aicionar notações no código referentes a complexidade calculada
    private addComplexityDecoration(editor: vscode.TextEditor, totalComplexity: number, maxComplexity: number): void {
        const documentUri = editor.document.uri.toString();

        this.clearDecorations(editor);

        const decorationType = vscode.window.createTextEditorDecorationType({
            after: {
                margin: '10px',
                color: totalComplexity > maxComplexity ? 'orange' : 'blue',
                contentText: totalComplexity > maxComplexity
                    ? `⚠️ Complexidade: ${totalComplexity}/${maxComplexity} (Excedida)`
                    : `✔️ Complexidade: ${totalComplexity}/${maxComplexity} (Aceitável)`
            },
            isWholeLine: true
        });

        const position = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 0));
        editor.setDecorations(decorationType, [position]);

        decorationsMap.set(documentUri, decorationType);
    }

    // Método responsável por limpar as decoraçoes adicionadas no arquivo do usuário em execuções anteriores
    private clearDecorations(editor: vscode.TextEditor) {
        const documentUri = editor.document.uri.toString();

        if (decorationsMap.has(documentUri)) {
            const previousDecorationType = decorationsMap.get(documentUri);
            if (previousDecorationType) {
                previousDecorationType.dispose();
            }
        }
    }

    // Método responsável por limpar os diagnosticos adicionados no arquivo do usuário em execuções anteriores
    private clearDiagnostics(editor: vscode.TextEditor) {
        const documentUri = editor.document.uri.toString();

        if (diagnosticsMap.has(documentUri)) {
            diagnosticsMap.delete(documentUri);
        }
    }


    // Método responsável por atualizar a cor do arquivo do usuário 
    // caso tenha excedido ou esteja ok o limite de complexidade calculado para o arquivo que executou a extensão
    private updateFileTabColor(editor: vscode.TextEditor, totalComplexity: number, maxComplexity: number): void {
        const documentUri = editor.document.uri.toString();

        this.clearDecorations(editor);

        const severity = totalComplexity > maxComplexity ? vscode.DiagnosticSeverity.Warning : vscode.DiagnosticSeverity.Information;
        const diagnostics: vscode.Diagnostic[] = [];

        const message = totalComplexity > maxComplexity
            ? `Complexidade excedida: ${totalComplexity}/${maxComplexity}`
            : `Complexidade aceitável: ${totalComplexity}/${maxComplexity}`;

        const range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 1));
        diagnostics.push(new vscode.Diagnostic(range, message, severity));

        diagnosticsMap.set(documentUri, diagnostics);

        diagnosticCollection.set(editor.document.uri, diagnostics);
    }

    // Método principal para calcular a complexidade
    public calculateComplexity(phpCode: string): void {
        const ast = this.getAST(phpCode);

        if (!ast) {
            return;
        }

        let totalComplexity = 0;

        this.walkAST(ast, (node) => {
            totalComplexity += this.calculateNodeComplexity(node);
        });

        const maxComplexity = this.userConfig?.totalFileComplexity?.maxComplexity;

        const editor = vscode.window.activeTextEditor;

        if (editor) {
            this.updateFileTabColor(editor, totalComplexity, maxComplexity);
            this.addComplexityDecoration(editor, totalComplexity, maxComplexity);

        }
        
        if (totalComplexity > maxComplexity) {
            vscode.window.showErrorMessage(
                `Complexidade do arquivo excedida! Complexidade atual: ${totalComplexity}/${maxComplexity}`
            );
        }
    }


}
