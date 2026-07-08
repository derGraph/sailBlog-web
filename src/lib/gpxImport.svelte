<script lang="ts">
    import errorStore from "./errorStore";
    import { Progress } from '@skeletonlabs/skeleton-svelte';
    
    // Import the parser function directly as a standard utility module
    import { parseGPXLazy, type GPXPoint, type GPXStreamedResult } from './gpxParser';
    import { createId } from "@paralleldrive/cuid2";

    let { isOpen = $bindable(false) } = $props();

    let files: FileList | undefined = $state();
    let importedResults: GPXStreamedResult | undefined = $state();

    let progress = $state(0);
    let loading = $state(false);
    let loadingIndex = $state(-1);

    interface rawDatapoint {
        id: string;
        lat: number;
        long: number;
        time: number;
        speed?: number;
        heading?: number;
        depth?: number;
        h_accuracy?: number;
        v_accuracy?: number;
        propulsion: number;
    };

    async function readFile() {
        if (!files || files.length === 0) return;
        const gpxFile = files[0];

        loading = true;
        progress = 0;

        try {            
            importedResults = await parseGPXLazy(gpxFile, 1, (pct) => {
                progress = pct;
            });

        } catch (err: any) {
            console.error("Direct parser encountered a failure:", err);
            errorStore.set(err.message || "Failed to process GPX file data.");
        } finally {
            loading = false;
        }
    }

    async function uploadDatapoints(datapoints: rawDatapoint[]) {
        // UPLOAD AND CLEAR DATAPOINTS
        // Assuming 'dataset' is your array of rawDatapoint
        const formattedData = datapoints.reduce((acc, point) => {
            // Extract ID and keep the rest of the properties
            const { id, ...rest } = point; 
            
            // Assign the rest of the data to the ID key
            acc[id] = rest; 
            
            return acc;
        }, {} as Record<string, any>);


        try {
            const response = await fetch('/api/Datapoints', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formattedData)
            });

            if (!response.ok) {
                $errorStore = response;
                isOpen = false;
                files = undefined;
                importedResults = undefined;
                loadingIndex = -1;
                return;
            }
        } catch (error) {
            console.error('Error sending POST request:', error);
        }
    }

    async function uploadRoute(trackId: number) {
    let newDatapoints: rawDatapoint[] = [];
    loadingIndex = trackId;

    // 1. Get total points first from your header to calculate accurate progress
    const totalPoints = importedResults!.trackHeaders[trackId]?.pointCount || 1;
    let uploadedPointsCount = 0;

    for await (const segment of importedResults!.getTrackSegments(trackId)) {
        // Use a standard for-loop to avoid the slow .indexOf() performance penalty
        for (let i = 0; i < segment.length; i++) {
            let point = segment[i];

            if (!point.time) { /* ... your error handling ... */ return; }

            newDatapoints.push({
                id: createId(),
                lat: point.lat,
                long: point.lon,
                time: point.time,
                propulsion: 1,
                speed: Number(point.extensions?.["navionics_speed"]),
                h_accuracy: Number(point.extensions?.["navionics_haccuracy"]),
                v_accuracy: Number(point.extensions?.["navionics_vaccuracy"])
            });


            // Trigger upload when batch is full OR we hit the absolute end of the segment
            if (newDatapoints.length >= 500 || i === segment.length - 1) {
                await uploadDatapoints(newDatapoints);
                
                // Track total overall points uploaded against the total file points
                uploadedPointsCount += newDatapoints.length;
                progress = Math.min((uploadedPointsCount / totalPoints) * 100, 100);
                
                newDatapoints = [];
            }
        }
    }
    loadingIndex = -1;
}
</script>

{#if isOpen}
    <div class="fixed inset-0 h-full bg-black bg-opacity-50 z-1001 flex items-center justify-center">
        <div class="preset-tonal-surface rounded-3xl shadow-xl w-11/12 md:w-3/4 lg:w-2/3 max-h-[85vh] p-6 flex flex-col gap-4">
            
            <!-- Header / Close Button -->
            <div class="flex justify-between items-center border-b border-surface-divider pb-2">
                <h3 class="text-lg font-semibold">Import Files</h3>
                <button onclick={() => (isOpen = false)} class="hover:text-gray-500 material-symbols-outlined transition-colors">
                    close
                </button>
            </div>
            
            {#if !(importedResults && importedResults.trackHeaders.length > 0)}
            <!-- File Input Section -->
            <div class="flex items-center justify-center p-4 min-h-[80px] border-2 border-dashed border-surface-outline-vibrant rounded-2xl bg-surface-hover/10">
            
                <!-- Custom Label container with all items perfectly centered -->
                <label class="flex items-center justify-center gap-8 px-5 py-2.5 rounded-xl bg-surface-container-high border border-surface-divider hover:bg-surface-container-highest cursor-pointer text-sm font-medium transition-colors max-w-sm text-center">
                    <span class="material-symbols-outlined text-sm">upload_file</span>
                    <span>Datei durchsuchen...</span>
                    
                    {#if loading}
                        <!-- Progress Indicator tucked nicely right after the text -->
                        <Progress class="inline-flex items-center" value={progress}>
                            <Progress.Circle class="[--size:--spacing(8)]"> <!-- Shrunk size slightly so it matches text height -->
                                <Progress.CircleTrack />
                                <Progress.CircleRange />
                            </Progress.Circle>
                        </Progress>
                    {/if}
                    
                    <!-- Hidden underlying native input -->
                    <input type="file" 
                        class="hidden"
                        accept=".gpx"
                        onchange={readFile}
                        bind:files>
                </label>

            </div>
            {/if}

            <!-- Import Results List -->
            <div class="flex-1 flex flex-col min-h-0">
                <div class="text-sm font-medium mb-2 flex justify-between items-center">
                    <span>Imported Results</span>
                    <span class="text-xs bg-primary-hover/20 px-2 py-0.5 rounded-full font-mono">{importedResults?.trackHeaders.length ?? 0} items</span>
                </div>
                
                <!-- Scrollable container for results -->
                <div class="flex-1 overflow-y-auto pr-1 space-y-2 max-h-[40vh] scrollbar-thin">
                    {#if importedResults && importedResults.trackHeaders.length > 0}
                        {#each importedResults.trackHeaders as track:GPXTrackHeader}
                            <div class="flex items-center justify-between p-3 rounded-xl bg-surface-container-low border border-surface-divider hover:bg-surface-container-medium transition-colors">
                                <div class="flex items-center gap-3 min-w-0">
                                    <span class="material-symbols-outlined text-primary">description</span>
                                    <div class="truncate">
                                        <p class="text-sm font-medium truncate">{track.name}</p>
                                        <p class="text-xs text-surface-dimmed">{track.pointCount || 'Unknown'} Datapoints</p>
                                    </div>
                                </div>
                                {#if loadingIndex == importedResults!.trackHeaders.indexOf(track)}
                                    <div class="flex items-center justify-center mr-4 shrink-0">
                                        <Progress class="flex" value={progress}>
                                            <Progress.Circle class="[--size:--spacing(8)]"> <!-- Shrunk size slightly so it matches text height -->
                                                <Progress.CircleTrack />
                                                <Progress.CircleRange />
                                            </Progress.Circle>
                                        </Progress>
                                    </div>
                                {:else}
                                    <button class="btn btn-md preset-tonal-success border border-success-500"
                                        onclick={()=>{uploadRoute(importedResults!.trackHeaders.indexOf(track))}}
                                        >
                                        Add to active Trip!
                                    </button>
                                {/if}
                            </div>
                        {/each}
                    {:else}
                        <!-- Empty State -->
                        <div class="flex flex-col items-center justify-center h-32 text-surface-dimmed border border-dashed border-surface-divider rounded-xl">
                            <span class="material-symbols-outlined text-3xl mb-1">find_in_page</span>
                            <p class="text-xs">No data imported yet.</p>
                        </div>
                    {/if}
                </div>
            </div>

        </div>
    </div>
{/if}
