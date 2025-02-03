import { IMessagesStrategy } from './IMessagesStrategy';

export class EnglishMessages implements IMessagesStrategy {
    private messages: { [key: string]: { code: number; message: string } } = {
        "emptyProjectFolder": { code: 1001, message: "Please open a project folder to use this extension." },
        "configFileAdded": { code: 1002, message: "complexity-config.json file added to project root." },
        "validConfig": { code: 1003, message: "Configuration validated successfully." },
        "invalidConfig": { code: 1004, message: "The configuration file is invalid." },
        "notFoundConfig": { code: 1005, message: "The configuration file complexity-config.json was not found." },
        "inativeTextEditor": { code: 1006, message: "No active text editor." },
        "invalidFile": { code: 1007, message: "The extension can only be run on PHP files." },
        "invalidKey": { code: 1008, message: "The key {0} is missing from your configuration file." },
        "complexityExceeded": { code: 2001, message: "Complexity exceeded" },
        "complexityAccepted": { code: 2002, message: "Complexity accepted" },
        "complexity": { code: 2003, message: "Complexity" },
        "exceeded": { code: 2004, message: "Exceeded" },
        "accepted": { code: 2005, message: "Accepted" },
        "totalComplexityExceeded": { code: 2006, message: "Total complexity exceeded" },
        "errorGeneratingAST": { code: 3001, message: "Error generating AST." }
    };

    getMessage(key: string): { code: number; message: string } {
        return this.messages[key] || { code: 9999, message: `Error: ${key}` };
    }
}
