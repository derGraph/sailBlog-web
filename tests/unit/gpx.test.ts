import { describe, expect, it } from 'vitest';
import { parseGPXLazy } from '../../src/lib/gpxParser';

const file = (xml: string) => new File([xml], 'fixture.gpx', { type: 'application/gpx+xml' });
async function collect<T>(values: AsyncIterable<T>) {
  const result: T[] = [];
  for await (const value of values) result.push(value);
  return result;
}
const point = (lat: number, time = '') => `<trkpt lat="${lat}" lon="14.79">${time}</trkpt>`;

describe('GPX import', () => {
  it('handles split UTF-8 input and selected tracks spanning multiple chunks', async () => {
    const input = file(
      `<gpx><metadata><name>Überfahrt 海</name></metadata><trk><trkseg>${point(1)}</trkseg></trk><trk><trkseg>${point(2)}</trkseg></trk></gpx>`
    );
    const encoded = new TextEncoder().encode(await input.text());
    Object.defineProperty(input, 'stream', {
      value: () =>
        new ReadableStream({
          start(controller) {
            for (const byte of encoded) controller.enqueue(new Uint8Array([byte]));
            controller.close();
          }
        })
    });
    const parsed = await parseGPXLazy(input);
    expect(parsed.metadata.name).toBe('Überfahrt 海');
    expect((await collect(parsed.getTrackSegments(0)))[0].map((p) => p.lat)).toEqual([1]);
    expect((await collect(parsed.getTrackSegments(1)))[0].map((p) => p.lat)).toEqual([2]);
  });
  it('keeps tracks and segments separate and selects only the requested track', async () => {
    const parsed = await parseGPXLazy(
      file(`<gpx><metadata><name>Voyage</name></metadata>
      <trk><name>First</name><trkseg>${point(1)}${point(2)}</trkseg><trkseg>${point(3)}</trkseg></trk>
      <trk><name>Second</name><trkseg>${point(4)}${point(5)}</trkseg></trk></gpx>`)
    );
    expect(parsed.metadata.name).toBe('Voyage');
    expect(parsed.trackHeaders.map((track) => [track.name, track.pointCount])).toEqual([
      ['First', 3],
      ['Second', 2]
    ]);
    expect(
      (await collect(parsed.getTrackSegments(0))).map((segment) => segment.map((p) => p.lat))
    ).toEqual([[1, 2], [3]]);
    expect(
      (await collect(parsed.getTrackSegments(1))).map((segment) => segment.map((p) => p.lat))
    ).toEqual([[4, 5]]);
  });
  it('parses timestamps, leaves absent/invalid timestamps unset, and finishes progress', async () => {
    const progress: number[] = [];
    const parsed = await parseGPXLazy(
      file(`<gpx><trk><trkseg>${point(1, '<time>2026-10-14T12:00:00Z</time>')}
      ${point(2)}${point(3, '<time>invalid</time>')}</trkseg></trk></gpx>`),
      1,
      (value) => progress.push(value)
    );
    const [segment] = await collect(parsed.getTrackSegments());
    expect(segment[0].time).toBe(Date.parse('2026-10-14T12:00:00Z'));
    expect(segment[1].time).toBeUndefined();
    expect(segment[2].time).toBeUndefined();
    expect(progress.at(-1)).toBe(100);
    expect(progress.every((value) => value >= 0 && value <= 100)).toBe(true);
  });
  it('samples independently within each track segment', async () => {
    const parsed = await parseGPXLazy(
      file(`<gpx><trk><trkseg>${point(1)}${point(2)}${point(3)}${point(4)}</trkseg>
      <trkseg>${point(5)}${point(6)}</trkseg></trk></gpx>`),
      2
    );
    expect(
      (await collect(parsed.getTrackSegments())).map((segment) => segment.map((p) => p.lat))
    ).toEqual([[2, 4], [6]]);
  });
  it('reads route points and waypoints without mixing them into tracks', async () => {
    const parsed = await parseGPXLazy(
      file(
        '<gpx><wpt lat="1" lon="2"><name>Harbour</name></wpt><rte><name>Route</name><rtept lat="3" lon="4"/></rte></gpx>'
      )
    );
    expect(parsed.routeHeaders).toEqual([{ name: 'Route', pointCount: 1 }]);
    expect(await collect(parsed.getWaypoints())).toMatchObject([
      { lat: 1, lon: 2, name: 'Harbour' }
    ]);
    expect(await collect(parsed.getRoutePoints())).toMatchObject([[{ lat: 3, lon: 4 }]]);
    expect(await collect(parsed.getTrackSegments())).toEqual([]);
  });
  it('rejects malformed XML instead of silently importing a partial voyage', async () => {
    await expect(parseGPXLazy(file('<gpx><trk></gpx>'))).rejects.toThrow();
  });
  it.each([0, -1, 1.5, NaN])('rejects invalid sampling rate %s', async (rate) => {
    await expect(parseGPXLazy(file('<gpx/>'), rate)).rejects.toThrow(/sample/i);
  });
});
