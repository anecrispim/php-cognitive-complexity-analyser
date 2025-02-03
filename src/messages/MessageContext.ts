import { IMessagesStrategy } from './IMessagesStrategy';
import { PortugueseMessages } from './PortugueseMessages';
import { EnglishMessages } from './EnglishMessages';
import * as vscode from 'vscode';

export class MessageContext {
    private strategy: IMessagesStrategy;

    constructor() {
        const userLanguage = vscode.workspace.getConfiguration("phpComplexityAnalyzer").get<string>("language") || "en";
        this.strategy = this.getStrategy(userLanguage);
    }

    private getStrategy(language: string): IMessagesStrategy {
        switch (language) {
            case "pt":
                return new PortugueseMessages();
            case "en":
            default:
                return new EnglishMessages();
        }
    }

    public getMessage(key: string): string {
        return this.strategy.getMessage(key).message;
    }
}
