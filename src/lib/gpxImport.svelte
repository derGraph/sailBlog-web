<script lang="ts">
    import errorStore from "./errorStore";
    import { Progress } from '@skeletonlabs/skeleton-svelte';
    
    // Import the parser function directly as a standard utility module
    import { parseFullGPXStream, type GPXResult } from './gpxParser';

    let { isOpen = $bindable(false) } = $props();

    let files: FileList | undefined = $state();
    let importedResults: GPXResult | undefined = $state();

    let progress = $state(0);
    let loading = $state(false);

    async function readFile() {
        if (!files || files.length === 0) return;
        const gpxFile = files[0];

        loading = true;
        progress = 0;

        try {
            console.log(`Starting main-thread stream parsing for: ${gpxFile.name} (${(gpxFile.size / 1024 / 1024).toFixed(1)} MB)`);
            
            importedResults = await parseFullGPXStream(gpxFile, 50, (pct) => {
                progress = pct;
            });

            console.log(importedResults)

        } catch (err: any) {
            console.error("Direct parser encountered a failure:", err);
            errorStore.set(err.message || "Failed to process GPX file data.");
        } finally {
            loading = false;
        }
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
            
            {#if !(importedResults && importedResults.tracks.length > 0)}
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
                    <span class="text-xs bg-primary-hover/20 px-2 py-0.5 rounded-full font-mono">{importedResults?.tracks.length ?? 0} items</span>
                </div>
                
                <!-- Scrollable container for results -->
                <div class="flex-1 overflow-y-auto pr-1 space-y-2 max-h-[40vh] scrollbar-thin">
                    {#if importedResults && importedResults.tracks.length > 0}
                        {#each importedResults.tracks as track:GPXTrack}
                            <div class="flex items-center justify-between p-3 rounded-xl bg-surface-container-low border border-surface-divider hover:bg-surface-container-medium transition-colors">
                                <div class="flex items-center gap-3 min-w-0">
                                    <span class="material-symbols-outlined text-primary">description</span>
                                    <div class="truncate">
                                        <p class="text-sm font-medium truncate">{track.name}</p>
                                        <p class="text-xs text-surface-dimmed">{track.segments[0].length || 'Unknown'} Datapoints</p>
                                    </div>
                                </div>
                                <button class="btn btn-md preset-tonal-success border border-success-500"
                                    onclick={()=>{console.log("aaa")}}
                                    >
                                    Add to active Trip!
                                </button>
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
