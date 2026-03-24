<?php

declare(strict_types=1);

namespace SafeAccessInline\Enums;

/** Discriminator for the different segment kinds produced by the path parser. */
enum SegmentType: string
{
    case KEY = 'key';
    case INDEX = 'index';
    case WILDCARD = 'wildcard';
    case DESCENT = 'descent';
    case DESCENT_MULTI = 'descent-multi';
    case MULTI_INDEX = 'multi-index';
    case MULTI_KEY = 'multi-key';
    case FILTER = 'filter';
    case SLICE = 'slice';
    case PROJECTION = 'projection';
}
