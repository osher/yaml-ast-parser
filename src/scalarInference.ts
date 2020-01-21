import { YAMLScalar } from './yamlAST'
import YAMLException = require('./exception');

export function parseYamlBoolean(input: string): boolean {
    if (["true", "True", "TRUE"].lastIndexOf(input) >= 0) {
        return true;
    }
    else if (["false", "False", "FALSE"].lastIndexOf(input) >= 0) {
        return false;
    }
    throw `Invalid boolean "${input}"`
}

function safeParseYamlInteger(input: string): number {
    // Use startsWith when es6 methods becomes available
    if (input.lastIndexOf('0o', 0) === 0) {
        return parseInt(input.substring(2), 8)
    }

    return parseInt(input);
}

export function parseYamlInteger(input: string): number {
    const result = safeParseYamlInteger(input)

    if (isNaN(result)) {
        throw `Invalid integer "${input}"`
    }

    return result;
}

export function parseYamlFloat(input: string): number {

    if ([".nan", ".NaN", ".NAN"].lastIndexOf(input) >= 0) {
        return NaN;
    }

    const infinity = /^([-+])?(?:\.inf|\.Inf|\.INF)$/
    const match = infinity.exec(input)
    if (match) {
        return (match[1] === '-') ? -Infinity : Infinity;
    }

    const result = parseFloat(input)

    if (!isNaN(result)) {
        return result;
    }

    throw `Invalid float "${input}"`
}

export enum ScalarType {
    null, bool, int, float, string
}

export enum DetermineScalarSchema  {
  Core = 'core',
  Json = 'json',
}


export function determineScalarType(node: YAMLScalar, schema: DetermineScalarSchema = DetermineScalarSchema.Core): ScalarType {
    if (node === void 0) {
        // we should throw here, but for backwards compatibility purposes we need to have it here
        return ScalarType.null;
    }

    switch (schema) {
        case DetermineScalarSchema.Core:
            return determineScalarTypeForCoreSchema(node);
        case DetermineScalarSchema.Json:
            return determineScalarTypeForJsonSchema(node);
    }
}

/** Determines the type of a scalar according to
 * the YAML 1.2 JSON Schema (https://yaml.org/spec/1.2/spec.html#id2804356)
 */
export function determineScalarTypeForJsonSchema(node: YAMLScalar): ScalarType {
    if (node.doubleQuoted || node.singleQuoted) {
        return ScalarType.string
    }

    const value = node.value;

    if (value === 'null') {
        return ScalarType.null;
    }

    if (value === 'true' || value === 'false') {
        return ScalarType.bool;
    }

    if (/^-?(?:0|[1-9][0-9]*)$/.test(value)) {
        return ScalarType.int;
    }

    if (/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]*)?(?:[eE][-+]?[0-9]+)?$/.test(value)) {
        return ScalarType.float;
    }

    throw new YAMLException('could not determine scalar type');
}

/** Determines the type of a scalar according to
 * the YAML 1.2 Core Schema (http://www.yaml.org/spec/1.2/spec.html#id2804923)
 */
export function determineScalarTypeForCoreSchema(node: YAMLScalar): ScalarType {
    if (node.doubleQuoted || !node.plainScalar || node.singleQuoted) {
        return ScalarType.string
    }

    const value = node.value;

    if (["null", "Null", "NULL", "~", ''].indexOf(value) >= 0) {
        return ScalarType.null;
    }

    if (value === null || value === undefined) {
        return ScalarType.null;
    }

    if (["true", "True", "TRUE", "false", "False", "FALSE"].indexOf(value) >= 0) {
        return ScalarType.bool;
    }

    const base10 = /^[-+]?[0-9]+$/
    const base8 = /^0o[0-7]+$/
    const base16 = /^0x[0-9a-fA-F]+$/

    if (base10.test(value) || base8.test(value) || base16.test(value)) {
        return ScalarType.int;
    }

    const float = /^[-+]?(\.[0-9]+|[0-9]+(\.[0-9]*)?)([eE][-+]?[0-9]+)?$/
    const infinity = /^[-+]?(\.inf|\.Inf|\.INF)$/
    if (float.test(value) || infinity.test(value) || [".nan", ".NaN", ".NAN"].indexOf(value) >= 0) {
        return ScalarType.float;
    }

    return ScalarType.string;
}
