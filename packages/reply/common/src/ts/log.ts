import {Status} from './Reply';
import {has} from '@0cfg/utils-common/lib/has';

export enum LogTag {
    Default = 'Default',
    Notify = 'Notify'
}

/**
 * Formats and prints a message, a status code, and the current timestamp to the command line.
 */
export const log = (
    message: string,
    logAsJson: boolean,
    code: Status = Status.Ok,
    stack?: string,
    ...tags: LogTag[]
    ): string => {
    if (logAsJson) {
        return logJson(message, code, stack, ...tags);
    }
    return logPlain(message, code, stack, ...tags);
};

export const logPlain = (
    message: string,
    code: Status = Status.Ok,
    stack?: string,
    ...tags: LogTag[]
    ): string => {
    const tagsString = tags.map(tag => `, #${tag}`).join('');
    const logString: string = `[${code}, ${new Date().toISOString()}${tagsString}]: ${
        message
        }${has(stack) ? ('\n' + stack) : ''}`;
    // eslint-disable-next-line no-console
    console.log(logString);
    return logString;
};

export const logJson = (
    message: string,
    code: Status = Status.Ok,
    stack?: string,
    ...tags: LogTag[]
    ): string => {
    const logJson = JSON.stringify({date: new Date().toISOString(), stack, message, code, tags});
    // eslint-disable-next-line no-console
    console.log(logJson);
    return logJson;
};
