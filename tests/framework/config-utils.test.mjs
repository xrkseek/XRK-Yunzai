import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  mergeConfigLayers,
  applyDefaults,
  buildDefaultsFromSchema,
  deepMergeConfig,
  resolveConfigSchema,
  buildArraySchemaIndex,
  coerceRootArrayToSchemaShape,
  unwrapRootArrayFromSchemaShape,
} from '../../lib/commonconfig/config-utils.js';

describe('config-utils merge layers', () => {
  it('mergeConfigLayers: template → stored → schema default', () => {
    const template = { host: '0.0.0.0', port: 8086, nested: { a: 1 } };
    const stored = { port: 2537, nested: { b: 2 } };
    const schema = {
      fields: {
        newField: { type: 'string', default: 'from-schema' },
        nested: {
          type: 'object',
          fields: {
            c: { type: 'number', default: 99 },
          },
        },
      },
    };

    const result = mergeConfigLayers(template, stored, schema);
    assert.equal(result.host, '0.0.0.0');
    assert.equal(result.port, 2537);
    assert.equal(result.newField, 'from-schema');
    assert.equal(result.nested.a, 1);
    assert.equal(result.nested.b, 2);
    assert.equal(result.nested.c, 99);
  });

  it('applyDefaults fills missing scalar without overwriting stored value', () => {
    const schema = {
      fields: {
        timeout: { type: 'number', default: 30 },
        name: { type: 'string', default: 'bot' },
      },
    };
    const result = applyDefaults({ name: 'custom' }, schema);
    assert.equal(result.name, 'custom');
    assert.equal(result.timeout, 30);
  });

  it('buildDefaultsFromSchema builds nested defaults', () => {
    const schema = {
      fields: {
        providers: { type: 'array', default: [] },
        server: {
          type: 'object',
          fields: {
            host: { type: 'string', default: '127.0.0.1' },
          },
        },
      },
    };
    assert.deepEqual(buildDefaultsFromSchema(schema), {
      providers: [],
      server: { host: '127.0.0.1' },
    });
  });

  it('deepMergeConfig preserves existing non-empty when new value is empty string', () => {
    const schema = { fields: { port: { type: 'number' } } };
    const merged = deepMergeConfig({ port: 8086 }, { port: '' }, schema);
    assert.equal(merged.port, 8086);
  });

  it('deepMergeConfig deletes unknown root keys when value is null (keyed siblings)', () => {
    const schema = { fields: { default: { type: 'object', fields: {} } } };
    const merged = deepMergeConfig(
      { default: { singleCD: 50 }, 123456: { singleCD: 1000 } },
      { 123456: null },
      schema,
    );
    assert.deepEqual(merged, { default: { singleCD: 50 } });
  });

  it('flattenStructure exposes keyedSiblings map without expanding value fields', async () => {
    const { flattenStructure } = await import('../../lib/commonconfig/config-utils.js');
    const flat = flattenStructure({
      fields: {
        default: {
          type: 'object',
          fields: { singleCD: { type: 'number', default: 50 } },
        },
        groupOverrides: {
          type: 'map',
          component: 'KeyedObject',
          fields: { singleCD: { type: 'number', default: 50 } },
          meta: {
            keyedSiblings: true,
            excludeKeys: ['default'],
            keyLabel: '群号',
          },
        },
      },
    });
    const override = flat.find((f) => f.path === 'groupOverrides');
    assert.ok(override);
    assert.equal(override.keyedSiblings, true);
    assert.equal(override.keyLabel, '群号');
    assert.deepEqual(override.excludeKeys, ['default']);
    assert.ok(override.meta?.fields?.singleCD);
    assert.equal(
      flat.some((f) => f.path.startsWith('groupOverrides.')),
      false,
    );
  });

  it('flattenStructure skips hidden fields and their children', async () => {
    const { flattenStructure } = await import('../../lib/commonconfig/config-utils.js');
    const flat = flattenStructure({
      fields: {
        visible: { type: 'boolean', default: true },
        ghost: {
          type: 'object',
          meta: { hidden: true },
          fields: { nested: { type: 'number', default: 1 } },
        },
        leafHidden: {
          type: 'number',
          default: 2,
          meta: { hidden: true },
        },
      },
    });
    assert.deepEqual(
      flat.map((f) => f.path),
      ['visible'],
    );
  });

  it('applyDefaults / buildDefaultsFromSchema skip keyedSiblings virtual fields', () => {
    const schema = {
      fields: {
        default: {
          type: 'object',
          fields: { a: { type: 'number', default: 1 } },
        },
        groupOverrides: {
          type: 'map',
          meta: { keyedSiblings: true },
          default: { shouldNotAppear: true },
        },
      },
    };
    assert.deepEqual(buildDefaultsFromSchema(schema), { default: { a: 1 } });
    const applied = applyDefaults({ default: {} }, schema);
    assert.equal(Object.hasOwn(applied, 'groupOverrides'), false);
  });

  it('resolveConfigSchema reads configFiles child for non-system configs', () => {
    const structure = {
      name: 'xrk',
      configs: {
        js_plugins: {
          schema: {
            fields: {
              list: {
                type: 'array',
                itemType: 'object',
                component: 'ArrayForm',
                fields: {
                  name: { type: 'string', label: '插件名' },
                  git: { type: 'string', label: 'Git 地址' }
                }
              }
            }
          }
        }
      }
    };
    const schema = resolveConfigSchema(structure, 'js_plugins');
    assert.ok(schema.fields.list);
    assert.equal(Object.keys(schema.fields.list.fields).length, 2);
  });

  it('buildArraySchemaIndex maps list[] fields for plugin arrays', () => {
    const schema = resolveConfigSchema({
      configs: {
        js_plugins: {
          schema: {
            fields: {
              list: {
                type: 'array',
                itemType: 'object',
                component: 'ArrayForm',
                fields: { name: { type: 'string' }, git: { type: 'string' } }
              }
            }
          }
        }
      }
    }, 'js_plugins');
    const map = buildArraySchemaIndex(schema);
    assert.equal(Object.keys(map.list).length, 2);
  });

  it('coerceRootArrayToSchemaShape wraps root JSON array for single list field', () => {
    const schema = {
      fields: {
        list: {
          type: 'array',
          itemType: 'object',
          fields: { name: { type: 'string' }, git: { type: 'string' } }
        }
      }
    };
    const items = [{ name: 'demo', git: 'https://example.com/x.js' }];
    const merged = mergeConfigLayers([], items, schema);
    assert.equal(merged.list.length, 1);
    assert.equal(merged.list[0].name, 'demo');
  });

  it('unwrapRootArrayFromSchemaShape restores root JSON array on write', () => {
    const schema = { fields: { list: { type: 'array' } } };
    const unwrapped = unwrapRootArrayFromSchemaShape({ list: [{ name: 'a' }] }, schema);
    assert.deepEqual(unwrapped, [{ name: 'a' }]);
  });
});

describe('string-array-utils', () => {
  it('mergeUniqueStrings keeps order and merges persisted extras', async () => {
    const { mergeUniqueStrings } = await import('../../lib/utils/string-array-utils.js');
    assert.deepEqual(mergeUniqueStrings(['a', 'b'], 'c'), ['a', 'b', 'c']);
    assert.deepEqual(mergeUniqueStrings(['a'], ['a', 'b']), ['a', 'b']);
    assert.deepEqual(mergeUniqueStrings(['a', 'a', 'b'], ['b', 'c']), ['a', 'b', 'c']);
  });
});
