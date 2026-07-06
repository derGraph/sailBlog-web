import sax from 'sax/lib/sax.js';

// === Core Type Definitions ===
export interface GPXMetadata {
    name?: string; 
    desc?: string; 
    author?: string; 
    time?: string;
    keywords?: string; 
    bounds?: { minlat: number; minlon: number; maxlat: number; maxlon: number };
}

export interface GPXPoint {
    lat: number; 
    lon: number; 
    ele?: number; 
    time?: string;
    magvar?: number; 
    geoidheight?: number; 
    name?: string;
    cmt?: string; 
    desc?: string; 
    src?: string;
    sat?: number; 
    vdop?: number; 
    hdop?: number; 
    pdop?: number;
    ageofdgpsdata?: number; 
    dgpsid?: number;
    extensions?: Record<string, string>;
}

export interface GPXRoute { 
    name?: string; 
    cmt?: string; 
    desc?: string; 
    rtept: GPXPoint[]; 
}

export interface GPXTrack { 
    name?: string; 
    cmt?: string; 
    desc?: string; 
    segments: GPXPoint[][]; 
}

export interface GPXResult {
    metadata: GPXMetadata;
    waypoints: GPXPoint[];
    routes: GPXRoute[];
    tracks: GPXTrack[];
}

/**
 * Low-memory streaming parser that handles massive GPX files sequentially on the main thread.
 * 
 * @param file The HTML File object to parse.
 * @param sampleRate Downsample strategy. Keeps 1 out of every X points (1 = all, 10 = 10%).
 * @param onProgress Real-time progress update callback hook (0 to 100).
 */
export async function parseFullGPXStream(
    file: File, 
    sampleRate: number = 1,
    onProgress?: (percentage: number) => void
): Promise<GPXResult> {
    const result: GPXResult = { metadata: {}, waypoints: [], routes: [], tracks: [] };
    
    // Fix: Instantiate the pure text-token parser instead of a stream object
    const parser = sax.parser(true, { lowercase: true, trim: true });
    
    const totalBytes = file.size;
    let loadedBytes = 0;

    const tagStack: string[] = [];
    let currentText = "";
    let ptCounter = 0;

    let activePoint: GPXPoint | null = null;
    let activeRoute: GPXRoute | null = null;
    let activeTrack: GPXTrack | null = null;
    let activeSegment: GPXPoint[] | null = null;
    let extensionDepth = 0;

    // Direct, explicit event handlers hook directly into the SAX parsing tree
    parser.onopentag = (node) => {
        const tagName = node.name;
        tagStack.push(tagName);
        currentText = "";

        if (tagName === 'wpt' || tagName === 'rtept' || tagName === 'trkpt') {
            activePoint = {
                lat: parseFloat(node.attributes.lat as string),
                lon: parseFloat(node.attributes.lon as string)
            };
            return;
        }
        if (tagName === 'rte') { activeRoute = { rtept: [] }; return; }
        if (tagName === 'trk') { activeTrack = { segments: [] }; return; }
        if (tagName === 'trkseg') { activeSegment = []; ptCounter = 0; return; }

        if (tagName === 'bounds' && tagStack.includes('metadata')) {
            result.metadata.bounds = {
                minlat: parseFloat(node.attributes.minlat as string),
                minlon: parseFloat(node.attributes.minlon as string),
                maxlat: parseFloat(node.attributes.maxlat as string),
                maxlon: parseFloat(node.attributes.maxlon as string),
            };
        }

        if (tagName === 'extensions') {
            extensionDepth++;
            if (activePoint) activePoint.extensions = {};
        } else if (extensionDepth > 0) {
            extensionDepth++;
        }
    };

    parser.ontext = (text) => { 
        currentText += text; 
    };

    parser.onclosetag = (tagName) => {
        tagStack.pop();

        if (extensionDepth > 0) {
            if (tagName === 'extensions') { 
                extensionDepth = 0; 
            } else {
                extensionDepth--;
                if (activePoint && activePoint.extensions) {
                    activePoint.extensions[tagName] = currentText;
                }
            }
            return;
        }

        if (activePoint) {
            if (tagName === 'wpt' || tagName === 'rtept' || tagName === 'trkpt') {
                if (tagName === 'wpt') result.waypoints.push(activePoint);
                else if (tagName === 'rtept' && activeRoute) activeRoute.rtept.push(activePoint);
                else if (tagName === 'trkpt' && activeSegment) {
                    ptCounter++;
                    if (ptCounter % sampleRate === 0) activeSegment.push(activePoint);
                }
                activePoint = null;
            } else {
                if (tagName === 'ele') activePoint.ele = parseFloat(currentText);
                else if (tagName === 'time') activePoint.time = currentText;
                else if (['name', 'desc', 'cmt', 'src'].includes(tagName)) {
                    (activePoint as any)[tagName] = currentText;
                } else if (['sat', 'vdop', 'hdop', 'pdop'].includes(tagName)) {
                    (activePoint as any)[tagName] = parseFloat(currentText);
                }
            }
            return;
        }

        if (activeRoute) {
            if (tagName === 'rte') { 
                result.routes.push(activeRoute); 
                activeRoute = null; 
            } else if (tagName === 'name' || tagName === 'desc' || tagName === 'cmt') {
                activeRoute[tagName as 'name' | 'desc' | 'cmt'] = currentText;
            }
            return;
        }

        if (activeTrack) {
            if (tagName === 'trk') { 
                result.tracks.push(activeTrack); 
                activeTrack = null; 
            } else if (tagName === 'trkseg' && activeSegment) { 
                activeTrack.segments.push(activeSegment); 
                activeSegment = null; 
            } else if (tagName === 'name' || tagName === 'desc' || tagName === 'cmt') {
                activeTrack[tagName as 'name' | 'desc' | 'cmt'] = currentText;
            }
            return;
        }

        if (tagStack.includes('metadata') && ['name', 'desc', 'author', 'time', 'keywords'].includes(tagName)) {
            (result.metadata as any)[tagName] = currentText;
        }
    };

    // Native modern pipeline parsing loop
    const reader = file.stream().getReader();
    const decoder = new TextDecoder("utf-8");

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            loadedBytes += value.length;
            if (onProgress && totalBytes > 0) {
                const pct = Math.round((loadedBytes / totalBytes) * 100);
                onProgress(Math.min(pct, 99)); 
            }

            // Write raw string fragments straight into the direct compiler sequence
            parser.write(decoder.decode(value, { stream: true }));
        }

        // Complete the parsing track tree layout explicitly
        parser.close();
        if (onProgress) onProgress(100);
        return result;

    } catch (err) {
        // Clean up error state references cleanly
        (parser as any).error = null;
        throw err;
    } finally {
        reader.releaseLock();
    }
}