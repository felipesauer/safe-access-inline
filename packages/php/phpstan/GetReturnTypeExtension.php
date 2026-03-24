<?php

declare(strict_types=1);

namespace SafeAccessInline\PHPStan;

use PhpParser\Node\Expr\MethodCall;
use PHPStan\Analyser\Scope;
use PHPStan\Reflection\MethodReflection;
use PHPStan\Type\ArrayType;
use PHPStan\Type\BooleanType;
use PHPStan\Type\Constant\ConstantIntegerType;
use PHPStan\Type\Constant\ConstantStringType;
use PHPStan\Type\DynamicMethodReturnTypeExtension;
use PHPStan\Type\FloatType;
use PHPStan\Type\Generic\GenericObjectType;
use PHPStan\Type\IntegerType;
use PHPStan\Type\MixedType;
use PHPStan\Type\StringType;
use PHPStan\Type\Type;
use PHPStan\Type\TypeCombinator;

/**
 * PHPStan extension: narrows the return type of `AbstractAccessor::get()` when the
 * accessor variable carries an explicit generic shape annotation.
 *
 * TypeScript achieves deep dot-notation path type inference through template literal
 * types and recursive conditional types, which have no direct PHP language equivalent.
 * This extension provides a partial approximation: when the caller annotates a variable
 * with a concrete shape type (`@var JsonAccessor<array{name: string, age: int}>`),
 * PHPStan can resolve the return type of `get()` for **literal string paths** known
 * at analysis time.
 *
 * Supported:
 *   - Single and multi-segment paths: `'name'`, `'user.address.city'`
 *   - Numeric array indices in paths: `'items.0.price'`
 *   - Graceful fallback to `mixed` when path is non-literal or shape is unannotated
 *
 * Not supported (requires full template literal type system):
 *   - Wildcard paths: `'items.*.price'`
 *   - Filter paths: `'items[?active==true].name'`
 *   - Recursive descent: `'..name'`
 *
 * ## Usage
 *
 * 1. Include `phpstan-extension.neon` in your `phpstan.neon`:
 *    ```neon
 *    includes:
 *        - vendor/safe-access-inline/safe-access-inline/phpstan-extension.neon
 *    ```
 *
 * 2. Annotate the accessor with its data shape:
 *    ```php
 *    // @var JsonAccessor<array{name: string, age: int, active: bool}> $acc
 *    $acc = SafeAccess::fromJson($json);
 *
 *    $name   = $acc->get('name');      // PHPStan: string|null
 *    $age    = $acc->get('age', 0);    // PHPStan: int|int (≡ int)
 *    $active = $acc->get('active');    // PHPStan: bool|null
 *    $city   = $acc->get('address.city'); // PHPStan: mixed (shape not deep-typed above)
 *    ```
 */
final class GetReturnTypeExtension implements DynamicMethodReturnTypeExtension
{
    /**
     * Applies to all concrete subclasses of AbstractAccessor.
     *
     * @return class-string
     */
    public function getClass(): string
    {
        return \SafeAccessInline\Core\AbstractAccessor::class;
    }

    /**
     * PHPStan extension: narrows the return type of `AbstractAccessor::get()` when the
     * accessor variable carries an explicit generic shape annotation.
     * Also returns fixed concrete types for the five type-casting methods.
     *
     * @param MethodReflection $methodReflection PHPStan reflection of the method being analysed.
     * @return bool Whether this extension handles the method.
     */
    public function isMethodSupported(MethodReflection $methodReflection): bool
    {
        return in_array(
            $methodReflection->getName(),
            ['get', 'getInt', 'getBool', 'getString', 'getFloat', 'getArray'],
            true,
        );
    }

    /**
     * Resolves the return type of a `get()` call.
     *
     * Resolution strategy:
     * - If the accessor has a known generic shape (`AbstractAccessor<TShape>`) **and**
     *   the path argument is a compile-time constant string, walk the shape type
     *   through each dot-separated segment.
     * - When the walk succeeds, the return type is `resolved | null` (absent key returns
     *   `null`). If a non-null `$default` is also provided, it is unioned in.
     * - When the walk fails (non-literal path, unknown shape, missing segment), return
     *   `null` so PHPStan falls back to the declared `mixed` return type.
     *
     * @param MethodReflection $methodReflection PHPStan reflection of `get()`.
     * @param MethodCall       $methodCall       AST node of the `get()` call site.
     * @param Scope            $scope            Analysis scope at the call site.
     * @return Type|null Narrowed type, or null to fall back to the declared return type.
     */
    public function getTypeFromMethodCall(
        MethodReflection $methodReflection,
        MethodCall $methodCall,
        Scope $scope,
    ): ?Type {
        // For type-casting methods, return their fixed concrete types immediately.
        // These do not depend on the generic shape or the path argument.
        $castTypes = [
            'getInt'    => new IntegerType(),
            'getBool'   => new BooleanType(),
            'getString' => new StringType(),
            'getFloat'  => new FloatType(),
            'getArray'  => new ArrayType(new MixedType(), new MixedType()),
        ];
        if (array_key_exists($methodReflection->getName(), $castTypes)) {
            return $castTypes[$methodReflection->getName()];
        }

        // Existing get() resolution follows.
        $callerType = $scope->getType($methodCall->var);

        // Only attempt resolution when the accessor is explicitly typed as generic.
        if (!($callerType instanceof GenericObjectType)) {
            return null;
        }

        $typeArgs = $callerType->getTypes();
        if (count($typeArgs) < 1) {
            return null;
        }

        $resolvedType = $this->walkPath($typeArgs[0], $methodCall, $scope);

        // If walk succeeded and the type is concrete (not never/error), compose the return.
        if ($resolvedType === null || $resolvedType->isNever()->yes()) {
            return null;
        }

        // Absent keys return null, so add null to the resolved type.
        $returnType = TypeCombinator::addNull($resolvedType);

        // If a $default argument was provided, union it in: the caller gets that type
        // back when the key is absent.
        if (count($methodCall->getArgs()) >= 2) {
            $defaultType = $scope->getType($methodCall->getArgs()[1]->value);
            $returnType = TypeCombinator::union($returnType, $defaultType);
        }

        return $returnType;
    }

    /**
     * Walks a dot-notation path through a statically-known array shape type.
     *
     * Each segment is resolved against the current type using `getOffsetValueType()`.
     * For numeric segments (e.g. `'0'` in `'items.0.price'`), both integer and string
     * offsets are tried so that both list and string-indexed PHP arrays are handled.
     *
     * @param  Type       $shapeType  PHPStan type representing the accessor's data shape.
     * @param  MethodCall $methodCall AST node of the `get()` call.
     * @param  Scope      $scope      PHPStan scope at the call site.
     * @return Type|null  The type at the end of the path, or null if unresolvable.
     */
    private function walkPath(Type $shapeType, MethodCall $methodCall, Scope $scope): ?Type
    {
        if (count($methodCall->getArgs()) < 1) {
            return null;
        }

        $pathArgType = $scope->getType($methodCall->getArgs()[0]->value);
        if (!($pathArgType instanceof ConstantStringType)) {
            return null; // Non-literal path cannot be resolved statically.
        }

        $path = $pathArgType->getValue();

        // Wildcard / filter / recursive descent paths are not resolvable statically.
        if (str_contains($path, '*') || str_contains($path, '[') || str_contains($path, '..')) {
            return null;
        }

        $segments = explode('.', $path);
        $current = $shapeType;

        foreach ($segments as $segment) {
            if (!$current->isArray()->yes()) {
                return null; // Current level is not an array — cannot descend.
            }

            $offsetType = is_numeric($segment)
                ? $this->resolveNumericOffset($current, $segment)
                : $current->getOffsetValueType(new ConstantStringType($segment));

            if ($offsetType === null || $offsetType->isNever()->yes()) {
                return null; // Segment not present in the known shape.
            }

            $current = $offsetType;
        }

        return $current;
    }

    /**
     * Resolves a numeric segment against an array type.
     *
     * Tries an integer offset first (for `list<T>`) and falls back to a string
     * offset (for `array<string, T>`) when the integer offset yields `never`.
     *
     * @param  Type   $type    The array type to resolve the offset against.
     * @param  string $segment The numeric segment string, e.g. `'0'`.
     * @return Type|null Resolved offset type, or null when neither offset works.
     */
    private function resolveNumericOffset(Type $type, string $segment): ?Type
    {
        $intOffset = $type->getOffsetValueType(new ConstantIntegerType((int) $segment));
        if (!$intOffset->isNever()->yes()) {
            return $intOffset;
        }

        $strOffset = $type->getOffsetValueType(new ConstantStringType($segment));
        if (!$strOffset->isNever()->yes()) {
            return $strOffset;
        }

        return null;
    }
}
