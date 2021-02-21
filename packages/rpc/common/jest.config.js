module.exports = Object.assign(require("../../../jest.config.base.js"), {
    preset: 'ts-jest',
    globals: {
        'ts-jest': {
            compiler: 'ttypescript',
        },
    },
});