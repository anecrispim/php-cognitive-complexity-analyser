export interface IMessagesStrategy {
    getMessage(key: string): { code: number; message: string };
}
