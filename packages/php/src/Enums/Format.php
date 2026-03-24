<?php

declare(strict_types=1);

namespace SafeAccessInline\Enums;

/** Supported data-source formats for the SafeAccess façade. */
enum Format: string
{
    case Array = 'array';
    case Object = 'object';
    case Json = 'json';
    case Xml = 'xml';
    case Yaml = 'yaml';
    case Toml = 'toml';
    case Ini = 'ini';
    case Env = 'env';
    case Ndjson = 'ndjson';
}
