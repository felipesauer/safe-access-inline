# Changelog

## [0.2.0](https://github.com/felipesauer/safe-access-inline/compare/js-v0.1.1...js-v0.2.0) (2026-03-13)


### ⚠ BREAKING CHANGES

* **js:** installing the package now requires js-yaml ^4.0.0 and smol-toml ^1.0.0.

### Features

* **js:** add js-yaml and smol-toml plugin adapters and export from index ([1c04f52](https://github.com/felipesauer/safe-access-inline/commit/1c04f5282ac3c46cced5115e2206e41b26f7a88a))
* **js:** add TOML auto-detection to TypeDetector ([40ace9b](https://github.com/felipesauer/safe-access-inline/commit/40ace9b15c4f511a3604244bd29a02815775d44f))
* **js:** add toToml() to TransformableInterface ([92a5da4](https://github.com/felipesauer/safe-access-inline/commit/92a5da435f7ed874ccd1bdf6c5bb13ec12bf0fa2))
* **js:** promote js-yaml and smol-toml to production dependencies ([a8eecca](https://github.com/felipesauer/safe-access-inline/commit/a8eeccabe2ac4c3ac4932a193acf45a42e302b46))

## [0.1.1](https://github.com/felipesauer/safe-access-inline/compare/js-v0.1.0...js-v0.1.1) (2026-03-12)


### Bug Fixes

* **js:** add depth limit to XML parser to prevent DoS ([5c9b1ad](https://github.com/felipesauer/safe-access-inline/commit/5c9b1ad841e764fc979da8e4d433bb9c7e79ced6))
* **js:** validate XML root element name to prevent injection ([10eca88](https://github.com/felipesauer/safe-access-inline/commit/10eca88008794139f25c63e0eb2b9a53d9ea7c4d))

## 0.1.0 (2026-03-11)


### Features

* **js:** add contracts and exception hierarchy ([e5e89f3](https://github.com/felipesauer/safe-access-inline/commit/e5e89f31ed8f4dac63b1ba3afad22668978c59a8))
* **js:** add core engine with dot notation parser and plugin registry ([d190f3a](https://github.com/felipesauer/safe-access-inline/commit/d190f3a6695cef1dd8fdbdc7044de21474882aeb))
* **js:** add format accessors for array, object, json, xml, yaml, toml, ini, csv, and env ([f61d4a5](https://github.com/felipesauer/safe-access-inline/commit/f61d4a559ebebe7ab857755f9ce58203397a1b1c))
* **js:** add SafeAccess facade and barrel export ([09c8a24](https://github.com/felipesauer/safe-access-inline/commit/09c8a24bb27a0a46f9eef67bfdd8d3c0fcb67e98))


### Bug Fixes

* add @vitest/coverage-v8 to devDependencies ([63ab54c](https://github.com/felipesauer/safe-access-inline/commit/63ab54cfd667a9c32ddf660cb229055ed3a481fb))
* update package name to match repository structure ([2bcc658](https://github.com/felipesauer/safe-access-inline/commit/2bcc6587e97d8310a3b1c4a9d17ed9da844cba24))

## Changelog

All notable changes to the **JavaScript/TypeScript** package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
