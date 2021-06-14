![alt text](https://github.com/0cfg/rpc/blob/main/banner.png?raw=true)

# Codesphere RPC
`Codesphere RPC` is a modern, modular open source RPC framework for Typescript, which abstracts away HTTP and WebSocket and lets you write code as if there was no network layer in between.

It is intended for fullstack microservice applications and optimized for usage with DI containers (See: [inversify.js](https://github.com/inversify/InversifyJS)
).

`Codesphere RPC` is built on top of [express](https://github.com/expressjs/express) and [ws](https://github.com/websockets/ws) for node and the [WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket) and [fetch](https://developer.mozilla.org/en-US/docs/Web/API/fetch) API's in the browser.

The [express](https://github.com/expressjs/express) app can be used outside `Codesphere RPC` if needed (e.g. to comply with the requirements of external integrations).

## WIP

This is still a work in progress and under active development by the Codesphere team.

**Current features:**

* Request reply (like http)
* Serverside streaming
* Bidirectional streaming
* Middlewares (including OAuth support)

**Planned:**

* Clientside streaming
* Automatic type checks via a typescript transformer
* Stub generation as a tsc compile step
* CLI generation
* API Documentation generation as a tsc compile step
* Implementations for other languages
* 100% test coverage
* Tutorials and more documentation

## Contribute

Fork the project and send a PR.
PR's will be reviewed on a best effort basis and integrated into the next release.

### Prerequisites

* NodeJs 14.4.0 or higher
* Yarn

### Build

## Contribute

Fork the project and send a PR.
PR's will be reviewed on a best effort basis and integrated into the next release.

### Prerequisites

* NodeJs 14.4.0 or higher
* Yarn

### Build

1. `yarn`
2. `yarn bootstrap`
3. `yarn build`
4. `yarn test`
5. `yarn lintFix`

