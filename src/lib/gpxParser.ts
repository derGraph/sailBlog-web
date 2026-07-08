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
    time?: number;
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

export interface GPXRouteHeader { 
    name?: string; 
    cmt?: string; 
    desc?: string; 
    pointCount: number;
}

export interface GPXTrackHeader { 
    name?: string; 
    cmt?: string; 
    desc?: string; 
    pointCount: number;
}

export interface GPXStreamedResult {
    metadata: GPXMetadata;
    trackHeaders: GPXTrackHeader[];
    routeHeaders: GPXRouteHeader[];
    getTrackSegments: (trackIndex?: number) => AsyncGenerator<GPXPoint[], void, unknown>;
    getRoutePoints: () => AsyncGenerator<GPXPoint[], void, unknown>;
    getWaypoints: () => AsyncGenerator<GPXPoint, void, unknown>;
}

/**
 * Parses a GPX file and returns an object containing global metadata, 
 * layout headers, and async generators to pull point datasets sequentially.
 */
export async function parseGPXLazy(
    file: File, 
    sampleRate: number = 1,
    onProgress?: (percentage: number) => void
): Promise<GPXStreamedResult> {
    
    const metadata: GPXMetadata = {};
    const trackHeaders: GPXTrackHeader[] = [];
    const routeHeaders: GPXRouteHeader[] = [];
    
    const decoder = new TextDecoder("utf-8");

    // Helper generator that streams raw chunks out of the file layout
    async function* getTargetElements(targetType: 'track_segment' | 'route_points' | 'waypoint', trackIndex?: number) {
        const parser = sax.parser(true, { lowercase: true, trim: true });
        const reader = file.stream().getReader();
        const totalBytes = file.size;
        let loadedBytes = 0;

        const tagStack: string[] = [];
        let currentText = "";
        let ptCounter = 0;
        let currentTrackIdx = -1; 

        let activePoint: GPXPoint | null = null;
        let activeRoutePoints: GPXPoint[] | null = null;
        let activeSegment: GPXPoint[] | null = null;
        let extensionDepth = 0;
        let targetTrackFinished = false; 
        
        const yieldQueue: any[] = [];

        parser.onopentag = (node: sax.Tag | sax.QualifiedTag) => {
            const tagName = node.name;
            tagStack.push(tagName);
            currentText = ""; // Always safely wipe text snippet buffer

            // Keep track of which track we are currently inside
            if (tagName === 'trk') {
                currentTrackIdx++;
            }

            if (tagName === 'wpt' || tagName === 'rtept' || tagName === 'trkpt') {
                // Ignore point if it doesn't match the targeted track
                if (tagName === 'trkpt' && trackIndex !== undefined && currentTrackIdx !== trackIndex) {
                    return;
                }
                activePoint = {
                    lat: parseFloat(node.attributes.lat as string),
                    lon: parseFloat(node.attributes.lon as string)
                };
                return;
            }
            if (tagName === 'rte' && targetType === 'route_points') { activeRoutePoints = []; return; }
            
            if (tagName === 'trkseg' && targetType === 'track_segment') { 
                if (trackIndex === undefined || currentTrackIdx === trackIndex) {
                    activeSegment = []; 
                    ptCounter = 0; 
                } else {
                    activeSegment = null; // Explicitly enforce safety isolation for untargeted segments
                }
                return; 
            }

            if (tagName === 'extensions') {
                extensionDepth++;
                if (activePoint) activePoint.extensions = {};
            } else if (extensionDepth > 0) {
                extensionDepth++;
            }
        };

        parser.ontext = (text: string) => { currentText += text; };

        parser.onclosetag = (tagName: string) => {
            tagStack.pop();

            if (extensionDepth > 0) {
                if (tagName === 'extensions') extensionDepth = 0;
                else {
                    extensionDepth--;
                    if (activePoint && activePoint.extensions) activePoint.extensions[tagName] = currentText;
                }
                return;
            }

            if (activePoint) {
                if (tagName === 'wpt' || tagName === 'rtept' || tagName === 'trkpt') {
                    if (tagName === 'wpt' && targetType === 'waypoint') {
                        yieldQueue.push({ type: 'wpt', data: activePoint });
                    } else if (tagName === 'rtept' && activeRoutePoints && targetType === 'route_points') {
                        activeRoutePoints.push(activePoint);
                    } else if (tagName === 'trkpt' && activeSegment && targetType === 'track_segment') {
                        ptCounter++;
                        if (ptCounter % sampleRate === 0) activeSegment.push(activePoint);
                    }
                    activePoint = null;
                } else {
                    if (tagName === 'ele') activePoint.ele = parseFloat(currentText);
                    else if (tagName === 'time') {
                        const cleanText = currentText.trim();
                        const parsedTime = Date.parse(cleanText);
                        if (!isNaN(parsedTime)) {
                            activePoint.time = new Date(parsedTime).getTime();
                        }
                    }
                    else if (['name', 'desc', 'cmt', 'src'].includes(tagName)) (activePoint as any)[tagName] = currentText;
                    else if (['sat', 'vdop', 'hdop', 'pdop'].includes(tagName)) (activePoint as any)[tagName] = parseFloat(currentText);
                }
                return;
            }

            if (tagName === 'rte' && activeRoutePoints && targetType === 'route_points') {
                yieldQueue.push({ type: 'rte', data: activeRoutePoints });
                activeRoutePoints = null;
            }
            if (tagName === 'trkseg' && targetType === 'track_segment') {
                if (activeSegment) {
                    yieldQueue.push({ type: 'trkseg', data: activeSegment });
                }
                activeSegment = null; // Always clear out reference when exiting block scope
            }

            // Clean short-circuit break: stop stream parsing when targeted segment block fully closes
            if (tagName === 'trk' && targetType === 'track_segment' && trackIndex !== undefined && currentTrackIdx === trackIndex) {
                targetTrackFinished = true;
            }
        };

        try {
            while (true) {
                if (targetTrackFinished) break;

                const { done, value } = await reader.read();
                if (done) break;

                loadedBytes += value.length;
                if (onProgress && totalBytes > 0) {
                    onProgress(Math.min(Math.round((loadedBytes / totalBytes) * 100), 99));
                }

                parser.write(decoder.decode(value, { stream: true }));
                while (yieldQueue.length > 0) {
                    yield yieldQueue.shift().data;
                }
            }
            parser.close();
            while (yieldQueue.length > 0) {
                yield yieldQueue.shift().data;
            }
            if (onProgress) onProgress(100);
        } finally {
            reader.releaseLock();
        }
    }

    // --- PRE-SCAN FOR STRUCTURAL HEADERS ---
    const preParser = sax.parser(true, { lowercase: true, trim: true });
    const preReader = file.stream().getReader();
    const totalBytes = file.size;
    let preLoadedBytes = 0;
    
    const tagStack: string[] = [];
    let currentText = "";
    let currentTrack: GPXTrackHeader | null = null;
    let currentRoute: GPXRouteHeader | null = null;

    preParser.onopentag = (node: sax.Tag | sax.QualifiedTag) => {
        const tagName = node.name;
        tagStack.push(tagName);
        currentText = "";
        if (tagName === 'trk') currentTrack = { pointCount: 0 };
        if (tagName === 'rte') currentRoute = { pointCount: 0 };
        
        if (tagName === 'trkpt' && currentTrack) currentTrack.pointCount++;
        if (tagName === 'rtept' && currentRoute) currentRoute.pointCount++;

        if (tagName === 'bounds' && tagStack.includes('metadata')) {
            metadata.bounds = {
                minlat: parseFloat(node.attributes.minlat as string),
                minlon: parseFloat(node.attributes.minlon as string),
                maxlat: parseFloat(node.attributes.maxlat as string),
                maxlon: parseFloat(node.attributes.maxlon as string),
            };
        }
    };
    preParser.ontext = (text: string) => { currentText += text; };
    preParser.onclosetag = (tagName: string) => {
        tagStack.pop();
        if (currentTrack) {
            if (tagName === 'trk') { trackHeaders.push(currentTrack); currentTrack = null; }
            else if (['name', 'desc', 'cmt'].includes(tagName)) currentTrack[tagName as 'name'] = currentText;
        }
        if (currentRoute) {
            if (tagName === 'rte') { routeHeaders.push(currentRoute); currentRoute = null; }
            else if (['name', 'desc', 'cmt'].includes(tagName)) currentRoute[tagName as 'name'] = currentText;
        }
        if (tagStack.includes('metadata') && ['name', 'desc', 'author', 'time', 'keywords'].includes(tagName)) {
            (metadata as any)[tagName] = currentText;
        }
    };

    try {
        while (true) {
            const { done, value } = await preReader.read();
            if (done) break;
            
            preLoadedBytes += value.length;
            if (onProgress && totalBytes > 0) {
                onProgress(Math.min(Math.round((preLoadedBytes / totalBytes) * 100), 100));
            }
            preParser.write(decoder.decode(value, { stream: true }));
        }
        preParser.close();
    } finally {
        preReader.releaseLock();
    }

    return {
        metadata,
        trackHeaders,
        routeHeaders,
        getTrackSegments: (trackIndex?: number) => {
            return getTargetElements('track_segment', trackIndex);
        },
        getRoutePoints: () => getTargetElements('route_points'),
        getWaypoints: () => getTargetElements('waypoint')
    };
}