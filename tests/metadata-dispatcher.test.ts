import * as path from 'path';

const FIXTURE_DIR = path.join(__dirname, 'fixtures', 'v3-project');

jest.mock('fs', () => {
  const actual = jest.requireActual('fs');
  return {
    ...actual,
    readFileSync: (filePath: unknown, ...rest: unknown[]) => {
      if (typeof filePath === 'string' && filePath.endsWith('_metadata.json')) {
        throw new Error('simulated: typewind-v4 metadata not found');
      }
      return actual.readFileSync(filePath, ...rest);
    },
  };
});

describe('loadTypewindMetadata dispatcher', () => {
  const originalCwd = process.cwd();

  afterEach(() => {
    jest.resetModules();
    process.chdir(originalCwd);
  });

  it('falls back to the v3 adapter when typewind-v4 metadata cannot be read', () => {
    process.chdir(FIXTURE_DIR);

    const { loadTypewindMetadata, resetTypewindMetadataCache } = require('../src/utils/metadata');
    resetTypewindMetadataCache();

    const metadata = loadTypewindMetadata();
    expect(metadata).not.toBeNull();
    expect(metadata.classOrder).toContain('flex');
    expect(metadata.cssProperties.flex).toEqual(['display']);
  });
});
