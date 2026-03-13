<?php

namespace SafeAccessInline\Enums;

enum AccessorFormat: string
{
    case Array = 'array';
    case Object = 'object';
    case Json = 'json';
    case Xml = 'xml';
    case Yaml = 'yaml';
    case Toml = 'toml';
    case Ini = 'ini';
    case Csv = 'csv';
    case Env = 'env';
}
