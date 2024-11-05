// Importa o php-parser (biblioteca para acessar a AST do código PHP)
import * as parser from 'php-parser';
import * as path from 'path';
import * as vscode from 'vscode';

export class ComplexityAnalyser {
    // Método que gera a AST do código PHP
    getAST(phpCode: string) {
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
        let fileName = 'userInput.php'; // Nome padrão se não houver arquivo ativo

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

    // Método que calcula a complexidade ciclomática a partir da AST
    analyzeComplexityFromAST(ast: any) {
        if (!ast) {
            vscode.window.showErrorMessage('AST não fornecida.');
            return;
        }

        let complexity = 1; // Começa com 1 para o caminho básico

        this.traverseAST(ast, (node) => {
            if (this.isControlStructure(node)) {
                complexity += 1;
            }
        });

        vscode.window.showInformationMessage(`Complexidade ciclomática: ${complexity}`);
    }

    // Função auxiliar para percorrer a AST
    traverseAST(node: any, callback: (node: any) => void) {
        callback(node);
        if (node.children && Array.isArray(node.children)) {
            for (const child of node.children) {
                this.traverseAST(child, callback);
            }
        } else if (node.body && Array.isArray(node.body)) {
            // Algumas estruturas, como blocos "if", têm um nó "body" em vez de "children"
            for (const child of node.body) {
                this.traverseAST(child, callback);
            }
        }
    }

    // Função para verificar se um nó é uma estrutura de controle
    isControlStructure(node: any): boolean {
        return ['if', 'for', 'while', 'switch', 'catch', 'foreach'].includes(node.kind);
    }
}