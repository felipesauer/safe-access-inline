# Changelog

## [0.2.2](https://github.com/felipesauer/safe-access-inline/compare/php-v0.2.1...php-v0.2.2) (2026-03-14)


### Features

* **js:** add array operation tests for push, pop, filterAt, mapAt, sortAt and more ([e95a136](https://github.com/felipesauer/safe-access-inline/commit/e95a1360acc0924e399e64ac0246259c9d6ab757))
* **js:** add deepMerge() with last-wins semantics and recursive object merging ([fe3f4e7](https://github.com/felipesauer/safe-access-inline/commit/fe3f4e734420120c56cb189a6ceae739044b7c38))
* **js:** add framework integration tests for NestJS and Vite plugin ([7e9ad41](https://github.com/felipesauer/safe-access-inline/commit/7e9ad41d09364863112dff9fc0a24d8ad2a66ea7))
* **js:** add multi-index, slice, bracket notation and getBySegments to parser ([56dd8f1](https://github.com/felipesauer/safe-access-inline/commit/56dd8f159a8d4685cb6da416cad609dc4549a938))
* **js:** extend AbstractAccessor with all roadmap feature methods (phases 1-12) ([3cd6873](https://github.com/felipesauer/safe-access-inline/commit/3cd6873af69e661341c98cf138f8ff186adfa77f))
* **js:** extend SafeAccess facade with fromFile, layer, fromUrl and watchFile ([2e2dc60](https://github.com/felipesauer/safe-access-inline/commit/2e2dc60b2077b66855cb2022b78b41ca6fbab224))
* **js:** update TypeDetector to support NDJSON format auto-detection ([bcfe6d9](https://github.com/felipesauer/safe-access-inline/commit/bcfe6d9c674c00e0a024aeb0c6b0f1326d85c34b))
* **php:** add CsvSanitizer for CSV injection prevention on export ([c7f9ce3](https://github.com/felipesauer/safe-access-inline/commit/c7f9ce3c13467083fc041d0829f1eb785d8da56e))
* **php:** add DeepMerger::merge() for recursive array merging with last-wins semantics ([04ea814](https://github.com/felipesauer/safe-access-inline/commit/04ea814fe11da233aee1cf765320a22aa12df93b))
* **php:** add FileWatcher with filemtime() polling for worker environments ([68e7816](https://github.com/felipesauer/safe-access-inline/commit/68e7816c847deae7b32cd64dbbdb917f88e5fc62))
* **php:** add IoLoader with readFile() and HTTPS-only fetchUrl() ([db0192d](https://github.com/felipesauer/safe-access-inline/commit/db0192d502f906c20388f01648001f900c97bd3b))
* **php:** add JsonPatch and JsonPatchOperation DTO per RFC 6902 ([0004d2a](https://github.com/felipesauer/safe-access-inline/commit/0004d2a127f8a11061191bfe981b077b35d03fa1))
* **php:** add Laravel ServiceProvider with helper and Facade, and Symfony Bundle ([6a9eb89](https://github.com/felipesauer/safe-access-inline/commit/6a9eb89dc33e0f97f303d7c27d1df02146103503))
* **php:** add length(), match() and keys() filter functions to FilterParser ([571f774](https://github.com/felipesauer/safe-access-inline/commit/571f774ff0e910554fb1f5a7b28c6610feb35841))
* **php:** add NdjsonAccessor and AccessorFormat::Ndjson enum case ([661a5bd](https://github.com/felipesauer/safe-access-inline/commit/661a5bd02a75c0fe6905afe644ac7b0ef2ed30f3))
* **php:** add ReadonlyViolationException for readonly mode enforcement ([c3b8fe9](https://github.com/felipesauer/safe-access-inline/commit/c3b8fe91f7319124539179c1e8b1a266d54b2fda))
* **php:** add SchemaAdapterInterface, SchemaValidationResult DTO and SchemaValidationException ([91d7ccd](https://github.com/felipesauer/safe-access-inline/commit/91d7ccdfc68a55a7736cdc447fd3538dd6ad88a1))
* **php:** add SecurityException class for security violations ([71ee934](https://github.com/felipesauer/safe-access-inline/commit/71ee934a5b6ce52e6c0962579ef51e91925544ee))
* **php:** add SecurityGuard with assertSafeKey() to block prototype pollution ([e021246](https://github.com/felipesauer/safe-access-inline/commit/e021246131a7e22256773a2309b364562fef9ebe))
* **php:** add SecurityOptions for recursion depth and payload size validation ([5e90822](https://github.com/felipesauer/safe-access-inline/commit/5e90822295f77e674d75b52a95e4849b7e30b207))
* **php:** add SecurityPolicy with SSRF prevention, DataMasker and AuditLogger ([92d2f38](https://github.com/felipesauer/safe-access-inline/commit/92d2f380d629f173c2a701fe3e32f4a80961d6d6))
* **php:** add SymfonyValidatorAdapter and JsonSchemaAdapter ([d91523d](https://github.com/felipesauer/safe-access-inline/commit/d91523da57a83e230a0a89bcb7832dfb7c0c4c74))
* **php:** add toNdjson() to HasTransformations trait for NDJSON serialization ([4c67072](https://github.com/felipesauer/safe-access-inline/commit/4c67072759a4b630c4ff8c5480523b28523ca93e))
* **php:** propagate readonly option through all accessor from() static methods ([aa544a8](https://github.com/felipesauer/safe-access-inline/commit/aa544a8e1810646684015adde0c1c53986f65b90))


### Bug Fixes

* **php:** enforce PARSE_EXCEPTION_ON_INVALID_TYPE to prevent unsafe YAML deserialization ([dade8c2](https://github.com/felipesauer/safe-access-inline/commit/dade8c22921e5e6117acc27beaacb05a0bd146d0))
* **php:** reject DOCTYPE and ENTITY in XML parser and enforce LIBXML_NONET ([abbb5d9](https://github.com/felipesauer/safe-access-inline/commit/abbb5d96c544b8a7157906ee6ac586ff9690d412))
* **php:** remove stale [@phpstan-ignore](https://github.com/phpstan-ignore) annotations in LaravelFacade ([c997601](https://github.com/felipesauer/safe-access-inline/commit/c997601a52f4bd3ecf6bb5172f17290234090d40))


### Performance Improvements

* **php:** add PathCache with static LRU array and 1000-entry limit ([cc44f9c](https://github.com/felipesauer/safe-access-inline/commit/cc44f9c44dc207c0e96c0f748dd8531809ea1aa4))


### Miscellaneous Chores

* **deps:** update JS and PHP package manifests with new feature dependencies ([c80dd97](https://github.com/felipesauer/safe-access-inline/commit/c80dd9701acbe4a74a7772df55434b47770aa1fd))

## [0.2.1](https://github.com/felipesauer/safe-access-inline/compare/php-v0.2.0...php-v0.2.1) (2026-03-13)


### Features

* **php:** add AccessorFormat enum and SafeAccess::from() unified factory ([4e88d80](https://github.com/felipesauer/safe-access-inline/commit/4e88d80671af92a533f3c266b62310922312fd3e))
* **php:** add FilterParser with expression parsing and evaluation ([a71f922](https://github.com/felipesauer/safe-access-inline/commit/a71f922748784491ce4f3c827af03b4bf9ab28f0))
* **php:** add immutable merge() to AbstractAccessor and WritableInterface ([1558a54](https://github.com/felipesauer/safe-access-inline/commit/1558a5458e8c1b1ab2bb45d017ba808c0f18f104))
* **php:** refactor DotNotationParser to support filter expressions, recursive descent, and merge ([25c6563](https://github.com/felipesauer/safe-access-inline/commit/25c6563ec52cca17d1d740dfd61a89a5c154bef0))


### Miscellaneous Chores

* add DotNotationParser performance benchmarks for JS and PHP ([4cd3d01](https://github.com/felipesauer/safe-access-inline/commit/4cd3d01095f10c539ed8671159492df1daa5318d))

## [0.2.0](https://github.com/felipesauer/safe-access-inline/compare/php-v0.1.2...php-v0.2.0) (2026-03-13)


### ⚠ BREAKING CHANGES

* **php:** installing the package now requires symfony/yaml ^7.0 and devium/toml ^1.0. Suggest entry updated to ext-yaml only.

### Features

* **php:** add DeviumTomlSerializer and NativeYamlSerializer plugins ([d8d2e33](https://github.com/felipesauer/safe-access-inline/commit/d8d2e3347aa63703c137b883a866cb50e2f45a7b))
* **php:** add toToml() to TransformableInterface ([7d69982](https://github.com/felipesauer/safe-access-inline/commit/7d69982a80367657d692cb6b2329a76f0d381a45))
* **php:** add YAML and TOML format auto-detection to TypeDetector ([f0f48e9](https://github.com/felipesauer/safe-access-inline/commit/f0f48e96d3a5997c657bd28f6ec9a2e7004d7d6c))
* **php:** promote symfony/yaml and devium/toml to required dependencies ([f351290](https://github.com/felipesauer/safe-access-inline/commit/f3512905bcf30c96a0e7cf7b194e318df3d8a7f6))


### Bug Fixes

* **php:** suppress PHP warnings in IniAccessor parse_ini_string call ([97f818e](https://github.com/felipesauer/safe-access-inline/commit/97f818ec531eb457462340d523738462c0cb2797))


### Miscellaneous Chores

* **main:** release php 0.2.0 ([13fe09b](https://github.com/felipesauer/safe-access-inline/commit/13fe09be73cab46ca88e797efee721a438954684))
* **main:** release php 0.2.0 ([9f7210a](https://github.com/felipesauer/safe-access-inline/commit/9f7210a46bc96d59217494f64926821c621169d0))
* revert php version to 0.1.2 and update changelog ([9e89858](https://github.com/felipesauer/safe-access-inline/commit/9e89858561065171677a87244b74fa7ef4ff26c8))

## [0.1.2](https://github.com/felipesauer/safe-access-inline/compare/php-v0.1.1...php-v0.1.2) (2026-03-12)

### Bug Fixes

- **php:** resolve nested TOML tables returning null and PHPStan plugin errors ([228b1da](https://github.com/felipesauer/safe-access-inline/commit/228b1da0f6ce645e7a6ea39b8717cea9fa22d166))

### Miscellaneous Chores

- **php:** add coverage ignore annotations for defensive code ([c7cbdc9](https://github.com/felipesauer/safe-access-inline/commit/c7cbdc916bfb0137429912d1536a59932bc4545d))

## [0.1.1](https://github.com/felipesauer/safe-access-inline/compare/php-v0.1.0...php-v0.1.1) (2026-03-12)

### Bug Fixes

- **php:** validate XML root element name to prevent injection ([6736345](https://github.com/felipesauer/safe-access-inline/commit/67363452d42d02c16e8753eae9c54b970dbe8249))

### Miscellaneous Chores

- add .gitattributes for LF normalization and export-ignore ([755a3a3](https://github.com/felipesauer/safe-access-inline/commit/755a3a3a6c91a4cc3986fd5fb478c3296bbd3901))

## 0.1.0 (2026-03-11)

### Features

- **php:** add contracts and exception hierarchy ([2b71664](https://github.com/felipesauer/safe-access-inline/commit/2b7166430ae4617b7fcc59b6c639d433110d8477))
- **php:** add core engine with dot notation parser and plugin registry ([81e008a](https://github.com/felipesauer/safe-access-inline/commit/81e008a05b44e31b734eb330c2801f91756f7c90))
- **php:** add format accessors for array, object, json, xml, yaml, toml, ini, csv, and env ([eb62f4e](https://github.com/felipesauer/safe-access-inline/commit/eb62f4eccba716f694163824bbeb0e1fd0d1a6d4))
- **php:** add SafeAccess facade and parser/serializer plugins ([4927424](https://github.com/felipesauer/safe-access-inline/commit/49274244739ad24e13e5a8d55f56f18e50d6b3e1))

### Bug Fixes

- cast Toml::decode() result to array in DeviumTomlParser ([b04dadb](https://github.com/felipesauer/safe-access-inline/commit/b04dadb0781cebef8169c90c2e2c1c0c4b61bbd6))

### Miscellaneous Chores

- **php:** add project configuration and tooling ([a08cafb](https://github.com/felipesauer/safe-access-inline/commit/a08cafbb6a67308c0f686d0ea8b51062bacce427))

## Changelog

All notable changes to the **PHP** package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
