import {Reply} from './Reply';
import {isEmpty} from '@0cfg/utils-common/lib/isEmpty';
import {has} from '@0cfg/utils-common/lib/has';


/**
 * Extended version of {@link jest.Expect}.
 * Adds custom matchers for values of type {@link IResponse}
 */
interface ExpectReply extends jest.Expect {
    (actual: any): AnyMatchers;
}

/**
 * Custom matchers for values of any type
 */
interface AnyMatchers extends jest.Matchers<any> {
    not: AnyMatchers;
    resolves: AnyMatchers;

    /**
     * Tests if {@link ok} resolves to true
     */
    toBeOk(): any;

    /**
     * Tests if {@link isEmpty} resolves to true
     */
    toBeEmpty(): any;

    /**
     * Tests if {@link has} resolves to true
     */
    toExist(): any;
}

/**
 * Extends the jest expect constant with custom matchers.
 * The additional Matchers are defined in {@link ExpectReply}
 */
class ExpectExtender {
    public static extend(expect: jest.Expect): ExpectReply {
        expect.extend({
            toBeOk: function (received) {
                return ExpectExtender.toBeOk(received, (this as any).isNot);
            },
            toBeEmpty: function (received) {
                return ExpectExtender.toBeEmpty(received, (this as any).isNot);
            },
            toExist: function (received) {
                return ExpectExtender.toExist(received, (this as any).isNot);
            },
        });
        return expect as ExpectReply;
    }

    private static toBeOk(received: Reply, isNot: boolean): jest.CustomMatcherResult {
        return {
            pass: received.ok(),
            message: (): string => `IResponse expected to be ${isNot ? 'not ' : ''}ok but was ${isNot ? '' : 'not '}ok:
                 ${JSON.stringify(received)}`,
        };
    }

    private static toBeEmpty(received: Reply, isNot: boolean): jest.CustomMatcherResult {
        return {
            pass: isEmpty(received),
            message: (): string =>
                `Object expected to ${isNot ? 'not ' : ''}be empty but was ${isNot ? '' : 'not '}empty:
            ${JSON.stringify(received)}`,
        };
    }

    private static toExist(received: Reply, isNot: boolean): jest.CustomMatcherResult {
        return {
            pass: has(received),
            message: (): string =>
                `Object expected to ${isNot ? 'not ' : ''}exist but it was ${isNot ? '' : 'not '}null ${isNot ?
                    '' :
                    'nor '}undefined:
            ${JSON.stringify(received)}`,
        };
    }
}

/**
 * Extended version of expect with additional matchers.
 * @see ExpectReply
 */
export const expectReply: ExpectReply = ExpectExtender.extend(expect);
