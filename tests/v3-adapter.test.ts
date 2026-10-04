import * as path from 'path';
import { buildV3Metadata } from '../src/utils/v3-adapter';

const FIXTURE_DIR = path.join(__dirname, 'fixtures', 'v3-project');

describe('buildV3Metadata', () => {
  it('returns null when no tailwind.config.* exists', () => {
    expect(buildV3Metadata(__dirname)).toBeNull();
  });

  it('builds classOrder, cssProperties, and valueIndex from a real Tailwind v3 context', () => {
    const metadata = buildV3Metadata(FIXTURE_DIR);
    expect(metadata).not.toBeNull();
    expect(metadata!.classOrder!.length).toBeGreaterThan(100);
    expect(metadata!.rootFontSize).toBe(16);

    const flexIdx = metadata!.classOrder!.indexOf('flex');
    const gridIdx = metadata!.classOrder!.indexOf('grid');
    expect(flexIdx).toBeGreaterThanOrEqual(0);
    expect(gridIdx).toBeGreaterThanOrEqual(0);

    expect(metadata!.cssProperties!['flex']).toEqual(['display']);
    expect(metadata!.cssProperties!['grid']).toEqual(['display']);
    expect(new Set(metadata!.cssProperties!['truncate'])).toEqual(
      new Set(['overflow', 'text-overflow', 'white-space'])
    );

    expect(metadata!.valueIndex!['p']?.['16']).toBe('p_4');
    expect(metadata!.valueIndex!['px']?.['8']).toBe('px_2');
  });

  it('does not let border-spacing-N clobber the border family', () => {
    const metadata = buildV3Metadata(FIXTURE_DIR);
    expect(metadata!.valueIndex!['border']?.['4']).toBe('border_4');
    expect(metadata!.valueIndex!['border']?.['8']).toBe('border_8');
    expect(metadata!.valueIndex!['border_spacing']?.['4']).toBe('border_spacing_1');
  });

  it('includes a family default (bare utility) as a valueIndex candidate', () => {
    const metadata = buildV3Metadata(FIXTURE_DIR);
    expect(metadata!.valueIndex!['border']?.['1']).toBe('border');
  });
});
