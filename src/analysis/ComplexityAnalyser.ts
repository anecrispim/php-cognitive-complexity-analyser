import * as parser from 'php-parser';
import * as path from 'path';
import * as vscode from 'vscode';
import * as fs from 'fs';
import { MessageContext } from '../messages/MessageContext';

const decorationsMap: Map<string, vscode.TextEditorDecorationType[]> = new Map();
const diagnosticsMap: Map<string, vscode.Diagnostic[]> = new Map();
const diagnosticCollection: vscode.DiagnosticCollection = vscode.languages.createDiagnosticCollection('complexity');
const messageContext = new MessageContext();

export class ComplexityAnalyser {
    private userConfig: any;

    constructor(configUserPath: string) {
        this.loadUserConfig(configUserPath);
    }

    /** Método para carregar o arquivo JSON do usuário 
     * @param configPath
    **/
    private loadUserConfig(configPath: string): void {
        const configData = fs.readFileSync(configPath, 'utf8');
        this.userConfig = JSON.parse(configData);
    }

    /**
     * Método que gera a AST do código PHP
     * @param phpCode
     */
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

        const editor = vscode.window.activeTextEditor;
        let fileName = 'userInput.php';

        if (editor) {
            const filePath = editor.document.fileName;
            fileName = path.basename(filePath);
        }

        try {
            const ast = phpParser.parseCode(phpCode, fileName);
            return ast;
        } catch (error) {
            if (error instanceof Error) {
                vscode.window.showErrorMessage(messageContext.getMessage('errorGeneratingAST'));
            }
            return null;
        }
    }

    /**
     * Método para percorrer a AST
     * @param node 
     * @param callback 
     */
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
        } else if (node.body) {
            this.walkAST(node.body, callback);
        }
    } 

    /**
     * Metodo responsável por aicionar notações no código referentes a complexidade calculada
     * @param editor 
     * @param totalComplexity 
     * @param maxComplexity 
     */
    private addComplexityDecoration(editor: vscode.TextEditor, totalComplexity: number, maxComplexity: number): void {
        const documentUri = editor.document.uri.toString();

        const decorationType = vscode.window.createTextEditorDecorationType({
            after: {
                margin: '10px',
                color: totalComplexity > maxComplexity ? 'orange' : '#00c0ff',
                contentText: totalComplexity > maxComplexity
                    ? `⚠️ ${messageContext.getMessage('complexity')}: ${totalComplexity}/${maxComplexity} (${messageContext.getMessage('exceeded')})`
                    : `✔️ ${messageContext.getMessage('complexity')}: ${totalComplexity}/${maxComplexity} (${messageContext.getMessage('accepted')})`
            },
            isWholeLine: true
        });

        const position = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 0));
        editor.setDecorations(decorationType, [position]);

        this.addOnMapDecorations(documentUri, decorationType);
    }

    /**
     * Método responsável por armazenar as decorações criadas no arquivo em um map global, para que em próximas
     * execuções possa ser salvo
     * @param documentUri 
     * @param decorationType 
     */
    private addOnMapDecorations(documentUri: string, decorationType: vscode.TextEditorDecorationType) {
        let previousDecorationType = decorationsMap.get(documentUri) ? decorationsMap.get(documentUri) : [];

        previousDecorationType?.push(decorationType);

        if (previousDecorationType) {
            decorationsMap.set(documentUri, previousDecorationType);
        }
    }

    /**
     * Método responsável por limpar as decoraçoes adicionadas no arquivo do usuário em execuções anteriores
     * @param editor 
     */
    public clearDecorations(editor: vscode.TextEditor) {
        const documentUri = editor.document.uri.toString();

        if (decorationsMap.has(documentUri)) {
            const previousDecorationType = decorationsMap.get(documentUri);
            if (previousDecorationType) {
                for (var typeDecoration of previousDecorationType) {
                    typeDecoration.dispose();
                }
            }
            decorationsMap.delete(documentUri);
        }
    }

    /**
     * Método responsável por limpar os diagnosticos adicionados no arquivo do usuário em execuções anteriores
     * @param editor 
     */
    public clearDiagnostics(editor: vscode.TextEditor) {
        const documentUri = editor.document.uri.toString();

        if (diagnosticsMap.has(documentUri)) {
            diagnosticsMap.delete(documentUri);
        }
    }


    /**
     * Método responsável por atualizar a cor do arquivo do usuário 
     * caso tenha excedido ou esteja ok o limite de complexidade calculado para o arquivo que executou a extensão
     * @param editor 
     * @param totalComplexity 
     * @param maxComplexity 
     */
    private updateFileTabColor(editor: vscode.TextEditor, totalComplexity: number, maxComplexity: number): void {
        const documentUri = editor.document.uri.toString();

        const severity = totalComplexity > maxComplexity ? vscode.DiagnosticSeverity.Warning : vscode.DiagnosticSeverity.Information;
        const diagnostics: vscode.Diagnostic[] = [];

        const message = totalComplexity > maxComplexity
            ? `${messageContext.getMessage('complexityExceeded')}: ${totalComplexity}/${maxComplexity}`
            : `${messageContext.getMessage('complexityAccepted')}: ${totalComplexity}/${maxComplexity}`;

        const range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 1));
        diagnostics.push(new vscode.Diagnostic(range, message, severity));

        diagnosticsMap.set(documentUri, diagnostics);

        diagnosticCollection.set(editor.document.uri, diagnostics);
    }

    /**
     * Método principal para calcular a complexidade
     * @param phpCode 
     * @returns 
     */
    public calculateComplexity(phpCode: string): void {
        const ast = this.getAST(phpCode);

        if (!ast) {
            return;
        }

        const editor = vscode.window.activeTextEditor;

        if (editor) {
            this.calculateAndApplyComplexity(ast, editor);
        }
    }

    /**
     * Método para calcular e aplicar complexidade no código percorrendo a AST
     * @param ast 
     * @param editor 
     */
    private calculateAndApplyComplexity(ast: any, editor: vscode.TextEditor): void {
        const diagnostics: vscode.Diagnostic[] = [];
        const decorations: { range: vscode.Range; contentText: string; color: string }[] = [];
        let totalComplexity = 0;
    
        this.clearDiagnostics(editor);
        this.clearDecorations(editor);
    
        const indices = this.userConfig.totalFileComplexity.indices;
        let insideFunction = false;
        let insideMethod = false;

        this.walkAST(ast, (node) => {
            for (const indexKey in indices) {
                const indexConfig = indices[indexKey];
                const weights = indexConfig.weights;

                if (node.kind === 'function') {
                    insideFunction = true;
                    insideMethod = false;
                } else if (node.kind === 'method') {
                    insideMethod = true;
                    insideFunction = false;
                }
    
                if (node.kind === 'return') {
                    if (insideFunction && indexKey == 'methodComplexity') {
                        continue;
                    } else if (insideMethod && indexKey == 'functionComplexity') {
                        continue;
                    }
                }

                if (node.kind === 'expressionstatement' && indexKey === 'expressionComplexity') {
                    let localWeight = 0;

                    // Função recursiva para percorrer a árvore de operadores binários
                    function traverseExpression(exprNode: any) {
                        if (!exprNode) return;

                        if (['&&', '||', 'or', 'and', 'xor', '!'].includes(exprNode.type)) {
                            localWeight += indices['expressionComplexity']['weights']['logicalOperators'] || 0;
                        }
                        if (['+', '-', '*', '/', '%', '**'].includes(exprNode.type)) {
                            localWeight += indices['expressionComplexity']['weights']['arithmeticOperators'] || 0;
                        }

                        if (exprNode.kind === "retif") {
                            localWeight += indices['expressionComplexity']['weights']['ternary'] || 0;
                        }

                        if (exprNode.left) traverseExpression(exprNode.left);
                        if (exprNode.right) traverseExpression(exprNode.right);
                        if (exprNode.test) traverseExpression(exprNode.test);
                        if (exprNode.trueExpr) traverseExpression(exprNode.trueExpr);
                        if (exprNode.falseExpr) traverseExpression(exprNode.falseExpr);        
                    }

                    if (node.expression.right) {
                        traverseExpression(node.expression.right);
                    }

                    totalComplexity += localWeight;
                
                    if (localWeight > 0) {
                        const elementLine = Math.max(0, node.loc.start.line - 1);
                        const lineEndCharacter = editor.document.lineAt(elementLine).text.length;
                        const range = new vscode.Range(
                            new vscode.Position(elementLine, lineEndCharacter),
                            new vscode.Position(elementLine, lineEndCharacter) 
                        );
                
                        const complexityMessage = `${indexKey}: ${messageContext.getMessage('complexity')} ${localWeight}`;
                        const color =  '#00c0ff';
                
                        const diagnostic = new vscode.Diagnostic(
                            range,
                            complexityMessage,
                            vscode.DiagnosticSeverity.Information
                        );
                        diagnostics.push(diagnostic);
                
                        decorations.push({ range, contentText: complexityMessage, color });
                    }
                }
                
    
                if (weights[node.kind]) {
                    let weight = weights[node.kind];

                    if (node.kind === 'try') {
                        let tryBlock = node.body;
                        let catchBlocks = node.catches;
                    
                        if (Array.isArray(tryBlock)) {
                            tryBlock.forEach(statement => {
                                if (statement.kind === 'return') {
                                    if (insideFunction) {
                                        weight += indices['functionComplexity']['weights']['return'];
                                    } else {
                                        weight += indices['methodComplexity']['weights']['return'];
                                    }
                                }
                            });
                        }
                    
                        if (Array.isArray(catchBlocks)) {
                            catchBlocks.forEach(catchBlock => {
                                if (catchBlock.body && Array.isArray(catchBlock.body.children)) {
                                    catchBlock.body.children.forEach((statement: { kind: any; }) => {
                                        if (statement.kind === 'return') {
                                            if (insideFunction) {
                                                weight += indices['functionComplexity']['weights']['return'];
                                            } else {
                                                 weight += indices['methodComplexity']['weights']['return'];
                                            }
                                        }
                                    });
                                }
                            });
                        }
                    }

                    if ((node.kind === "function" || node.kind === "method") && node.arguments) {
                        const paramWeight = weights["parameters"] || 0;
                        const paramComplexity = node.arguments.length * paramWeight;
                        weight += paramComplexity;
                    }

                    if (node.kind === 'if') {
                        // Verifica se existe um else if embutido no "alternate"
                        let alternateNode = node.alternate;
                        while (alternateNode && alternateNode.kind === "if") {
                            weight += indices['controlStructureComplexity']['weights']['elseif'] || 0;
                            alternateNode = alternateNode.alternate; // Continua percorrendo caso existam mais elseif
                        }
                    }

                    totalComplexity += weight;
    
                    const elementLine = Math.max(0, node.loc.start.line - 1);
                    const lineEndCharacter = editor.document.lineAt(elementLine).text.length;
                    const range = new vscode.Range(
                        new vscode.Position(elementLine, lineEndCharacter),
                        new vscode.Position(elementLine, lineEndCharacter) 
                    );
    
                    const complexityMessage = `${indexKey}: ${messageContext.getMessage('complexity')} ${weight}`;
                    const color = '#00c0ff';
    
                    const diagnostic = new vscode.Diagnostic(
                        range,
                        complexityMessage,
                        vscode.DiagnosticSeverity.Information
                    );
                    diagnostics.push(diagnostic);
    
                    decorations.push({ range, contentText: complexityMessage, color });
                }
            }
        });
    
        diagnosticCollection.set(editor.document.uri, diagnostics);
    
        const elementDecorationType = vscode.window.createTextEditorDecorationType({
            after: {
                margin: '0 0 0 1em',
                fontStyle: 'italic',
            },
            isWholeLine: false,
        });
    
        editor.setDecorations(
            elementDecorationType,
            decorations.map((decoration) => ({
                range: decoration.range,
                renderOptions: {
                    after: {
                        contentText: decoration.contentText,
                        color: decoration.color,
                    },
                },
            }))
        );
        const documentUri = editor.document.uri.toString();
        this.addOnMapDecorations(documentUri, elementDecorationType);
    
        const maxComplexity = this.userConfig.totalFileComplexity.maxComplexity;
        this.addComplexityDecoration(editor, totalComplexity, maxComplexity);
    
        this.updateFileTabColor(editor, totalComplexity, maxComplexity);
    
        if (totalComplexity > maxComplexity) {
            vscode.window.showWarningMessage(
                `${messageContext.getMessage('totalComplexityExceeded')}: ${totalComplexity}/${maxComplexity}`
            );
        }
    }

}
