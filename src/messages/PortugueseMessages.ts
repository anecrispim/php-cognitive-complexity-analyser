import { IMessagesStrategy } from './IMessagesStrategy';

export class PortugueseMessages implements IMessagesStrategy {
    private messages: { [key: string]: { code: number; message: string } } = {
        "emptyProjectFolder": { code: 1001, message: "Abra uma pasta de projeto para usar esta extensão." },
        "configFileAdded": { code: 1002, message: "Arquivo complexity-config.json adicionado à raiz do projeto." },
        "validConfig": { code: 1003, message: "Configuração validada com sucesso." },
        "invalidConfig": { code: 1004, message: "O arquivo de configuração é inválido." },
        "notFoundConfig": { code: 1005, message: "O arquivo de configuração complexity-config.json não foi encontrado." },
        "inativeTextEditor": { code: 1006, message: "Nenhum editor de texto ativo." },
        "invalidFile": { code: 1007, message: "A extensão só pode ser executada em arquivos PHP." },
        "invalidKey": { code: 1008, message: "A chave {0} está faltando no seu arquivo de configuração." },
        "complexityExceeded": { code: 2001, message: "Complexidade excedida" },
        "complexityAccepted": { code: 2002, message: "Complexidade aceita" },
        "complexity": { code: 2003, message: "Complexidade" },
        "exceeded": { code: 2004, message: "Excedida" },
        "accepted": { code: 2005, message: "Aceita" },
        "totalComplexityExceeded": { code: 2006, message: "Complexidade total excedida" },
        "errorGeneratingAST": { code: 3001, message: "Erro ao gerar AST." }
    };

    getMessage(key: string): { code: number; message: string } {
        return this.messages[key] || { code: 9999, message: `Erro: ${key}` };
    }
}
