/**
 * Discriminator for the different segment kinds produced by the
 * dot-notation path parser.
 */
export enum SegmentType {
    KEY = 'key',
    INDEX = 'index',
    WILDCARD = 'wildcard',
    DESCENT = 'descent',
    DESCENT_MULTI = 'descent-multi',
    MULTI_INDEX = 'multi-index',
    MULTI_KEY = 'multi-key',
    FILTER = 'filter',
    SLICE = 'slice',
}
