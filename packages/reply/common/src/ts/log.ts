import {Status} from './Reply';

export enum LogTag {
    Default = 'Default',
    Notify = 'Notify'
}

/**
 * Formats and prints a message, a status code, and the current timestamp to the command line.
 */
export const log = (message: string, code: Status = Status.Ok, ...tags: LogTag[]): string => {
    const tagsString = tags.map(tag => `, #${tag}`).join('');
    const logString: string = `[${code}, ${new Date().toISOString()}${tagsString}]: ${message}`;
    // eslint-disable-next-line no-console
    console.log(logString);
    return logString;
};
