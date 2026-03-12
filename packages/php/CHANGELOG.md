# Changelog

## [0.1.2](https://github.com/felipesauer/safe-access-inline/compare/php-v0.1.1...php-v0.1.2) (2026-03-12)


### Bug Fixes

* **php:** resolve nested TOML tables returning null and PHPStan plugin errors ([228b1da](https://github.com/felipesauer/safe-access-inline/commit/228b1da0f6ce645e7a6ea39b8717cea9fa22d166))


### Miscellaneous Chores

* **php:** add coverage ignore annotations for defensive code ([c7cbdc9](https://github.com/felipesauer/safe-access-inline/commit/c7cbdc916bfb0137429912d1536a59932bc4545d))

## [0.1.1](https://github.com/felipesauer/safe-access-inline/compare/php-v0.1.0...php-v0.1.1) (2026-03-12)


### Bug Fixes

* **php:** validate XML root element name to prevent injection ([6736345](https://github.com/felipesauer/safe-access-inline/commit/67363452d42d02c16e8753eae9c54b970dbe8249))


### Miscellaneous Chores

* add .gitattributes for LF normalization and export-ignore ([755a3a3](https://github.com/felipesauer/safe-access-inline/commit/755a3a3a6c91a4cc3986fd5fb478c3296bbd3901))

## 0.1.0 (2026-03-11)


### Features

* **php:** add contracts and exception hierarchy ([2b71664](https://github.com/felipesauer/safe-access-inline/commit/2b7166430ae4617b7fcc59b6c639d433110d8477))
* **php:** add core engine with dot notation parser and plugin registry ([81e008a](https://github.com/felipesauer/safe-access-inline/commit/81e008a05b44e31b734eb330c2801f91756f7c90))
* **php:** add format accessors for array, object, json, xml, yaml, toml, ini, csv, and env ([eb62f4e](https://github.com/felipesauer/safe-access-inline/commit/eb62f4eccba716f694163824bbeb0e1fd0d1a6d4))
* **php:** add SafeAccess facade and parser/serializer plugins ([4927424](https://github.com/felipesauer/safe-access-inline/commit/49274244739ad24e13e5a8d55f56f18e50d6b3e1))


### Bug Fixes

* cast Toml::decode() result to array in DeviumTomlParser ([b04dadb](https://github.com/felipesauer/safe-access-inline/commit/b04dadb0781cebef8169c90c2e2c1c0c4b61bbd6))


### Miscellaneous Chores

* **php:** add project configuration and tooling ([a08cafb](https://github.com/felipesauer/safe-access-inline/commit/a08cafbb6a67308c0f686d0ea8b51062bacce427))

## Changelog

All notable changes to the **PHP** package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
