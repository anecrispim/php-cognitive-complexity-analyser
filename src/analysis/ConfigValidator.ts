import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { MessageContext } from '../messages/MessageContext';

interface ComplexityConfig {
    totalFileComplexity: {
        maxComplexity: number;
        indices: {
            [key: string]: {
                maxComplexity: number;
                weights: { [key: string]: number | { [subKey: string]: number } };
            };
        };
    };
}

export class ConfigValidator {
    private defaultConfig: ComplexityConfig | null = null;

    constructor(context: vscode.ExtensionContext) {
        const defaultConfigPath = path.join(context.extensionPath, 'config', 'complexity-config.json');
        this.loadDefaultConfig(defaultConfigPath);
    }

    /**
     * Método responsável pro carregar o arquivo de configuração padrão
     * @param defaultConfigPath
     */
    private loadDefaultConfig(defaultConfigPath: string): void {
        const configData = fs.readFileSync(defaultConfigPath, 'utf8');
        this.defaultConfig = JSON.parse(configData);
    }

    /**
     * Método responsável por validar o arquivo de configuração do usuário, incluindo nome e estruturas json
     * que devem seguir conforme o arquivo padrão
     * @param configPath
     */
    public validateUserConfig(configPath: string): boolean {
        const userConfig: ComplexityConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        return this.compareConfigs(this.defaultConfig, userConfig);
    }

    /**
     * Método responsável por comparar as configurações entre os arquivos padrão e do usuário
     * @param defaultConfig 
     * @param userConfig
     * @param path
     */
    private compareConfigs(defaultConfig: any, userConfig: any, path: string[] = []): boolean {
        const messageContext = new MessageContext();

        for (const key in defaultConfig) {
            const currentPath = [...path, key].join('.');

            if (!(key in userConfig)) {
                vscode.window.showErrorMessage(messageContext.getMessage('invalidKey').replace('{0}', currentPath));
                return false;
            }

            if (typeof defaultConfig[key] === 'object' && !Array.isArray(defaultConfig[key])) {
                if (!this.compareConfigs(defaultConfig[key], userConfig[key], [...path, key])) {
                    return false;
                }
            }
        }
        return true;
    }
}
