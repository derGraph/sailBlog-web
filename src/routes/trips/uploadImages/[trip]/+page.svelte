<script lang="ts">
	import errorStore from '$lib/errorStore.js';
	import { parseVisibility } from '$lib/visibility.js';
	import type { Media } from '@prisma/client';
	import { onMount } from 'svelte';

	let { data } = $props();

	let requestedTrip = $derived(data.requestedTrip);

    let images:Media[] = $state([]);
    let isUploading = $state(false);
    let uploadProgress = $state(0);
    let uploadStatus = $state("");
    let selectedVisibility = $state("1");

	onMount(() => {
		getTripImages();
	});

	function getTripImages(){
		fetch("/api/Media?tripId="+requestedTrip).then(async (response)=>{
			if (response.ok) {
				response.json().then((response_data) => {
                    images = [];
                    for(let image in response_data) {
                        let newMedia = response_data[image] as Media;
                        images.push(newMedia)
                    }
				});
			} else {
				$errorStore = response;
			}
		});
	}

    function parseAlt(alt: string|null){
        if(alt == null){
            alt = "Image";
        }
        return alt;
    }

    async function handleFileChange(event: Event) {
        let target = event.target as HTMLInputElement;
        if(target.files){
            isUploading = true;
            uploadProgress = 0;
            uploadStatus = `0 / ${target.files.length}`;
            const files = Array.from(target.files);
            const compressedFiles: { blob: Blob; exif: { lat?: number; long?: number; created?: string } }[] = [];
            let totalBytes = 0;
            for (const file of files) {
                if(!file.type.includes('image/')){
                    $errorStore = new Response('{"message": "Only images are allowed!"}', {status: 415, statusText: "Unsupported Media Type"});
                } else {
                    try{
                        const exif = await extractExifData(file);
                        let blob: Blob;
                        try {
                            blob = await compressImage(file);
                        } catch {
                            blob = file;
                        }
                        compressedFiles.push({ blob, exif });
                        totalBytes += blob.size;
                    }catch{
                        // Error already surfaced via errorStore.
                    }
                }
            }
            let uploadedBytes = 0;
            for(let i=0; i<compressedFiles.length; i++){
                const { blob, exif } = compressedFiles[i];
                uploadStatus = `${i + 1} / ${compressedFiles.length}`;
                let url = "/api/Media?tripId="+encodeURIComponent(requestedTrip)+"&visibility="+encodeURIComponent(selectedVisibility);
                if (exif.lat != null && exif.long != null) {
                    url += "&lat=" + encodeURIComponent(exif.lat) + "&long=" + encodeURIComponent(exif.long);
                }
                if (exif.created) {
                    url += "&created=" + encodeURIComponent(exif.created);
                }
                const response = await uploadBlob(
                    url,
                    blob,
                    (loaded, total) => {
                        const overall = totalBytes > 0 ? Math.round(((uploadedBytes + loaded) / totalBytes) * 100) : 0;
                        uploadProgress = overall;
                    }
                );
                uploadedBytes += blob.size;
                if(!response.ok){
                    $errorStore = response;
                }
            }
            isUploading = false;
            uploadProgress = 0;
            uploadStatus = "";
            await getTripImages();
        }
    }

    async function compressImage(file: File): Promise<Blob> {
        const maxDim = 2000;
        const quality = 0.5;
        let imageBitmap: ImageBitmap | null = null;
        try {
            imageBitmap = await createImageBitmap(file);
            const scale = Math.min(1, maxDim / Math.max(imageBitmap.width, imageBitmap.height));
            const targetWidth = Math.max(1, Math.round(imageBitmap.width * scale));
            const targetHeight = Math.max(1, Math.round(imageBitmap.height * scale));

            const canvas = document.createElement('canvas');
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return file;
            }
            ctx.drawImage(imageBitmap, 0, 0, targetWidth, targetHeight);

            const avif: Blob | null = await new Promise((resolve) =>
                canvas.toBlob(resolve, 'image/avif', quality)
            );
            if (avif) {
                return avif;
            }
            const webp: Blob | null = await new Promise((resolve) =>
                canvas.toBlob(resolve, 'image/webp', quality)
            );
            if (webp) {
                return webp;
            }
            const jpeg: Blob | null = await new Promise((resolve) =>
                canvas.toBlob(resolve, 'image/jpeg', quality)
            );
            if (jpeg) {
                return jpeg;
            }
            throw new Error('No supported image format for compression');
        } catch {
            $errorStore = new Response('{"message": "Image compression not supported in this browser."}', {status: 415, statusText: "Unsupported Media Type"});
            throw new Error('Compression not supported');
        } finally {
            if (imageBitmap) {
                imageBitmap.close();
            }
        }
    }

    async function extractExifData(file: File): Promise<{ lat?: number; long?: number; created?: string }> {
        try {
            const exifr = await import('exifr');
            const gps = await exifr.gps(file);
            const meta = await exifr.parse(file, ['DateTimeOriginal']);
            const lat = typeof gps?.latitude === 'number' ? gps.latitude : undefined;
            const long = typeof gps?.longitude === 'number' ? gps.longitude : undefined;
            const created = meta?.DateTimeOriginal instanceof Date ? meta.DateTimeOriginal.toISOString() : undefined;
            return { ...(lat != null && { lat }), ...(long != null && { long }), ...(created && { created }) };
        } catch {
            return {};
        }
    }

    function uploadBlob(url: string, blob: Blob, onProgress: (loaded: number, total: number) => void): Promise<Response> {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', url);
            if (blob.type) {
                xhr.setRequestHeader('Content-Type', blob.type);
            }
            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    onProgress(event.loaded, event.total);
                }
            };
            xhr.onload = () => {
                resolve(new Response(xhr.responseText, { status: xhr.status, statusText: xhr.statusText }));
            };
            xhr.onerror = () => reject(new Error('Upload failed'));
            xhr.send(blob);
        });
    }
</script>

<div class="h-full md:container md:mx-auto p-3 rounded table-container">
    <div class="rounded-3xl bg-surface-100-900 p-4 mb-3 border border-surface-300-700">
        <div class="flex flex-wrap items-start gap-3">
            <div class="grow">
                <h2 class="h3">Trip Image Upload</h2>
                <p class="text-sm text-surface-700-300 mt-1">Choose default visibility, then upload one or multiple images.</p>
            </div>
            <button
                class="btn preset-tonal-primary border border-primary-500"
                onclick={() => document.getElementById("mediaPickerUpload")?.click()}
            >
                <span class="material-symbols-outlined mr-1">upload</span>
                Add Images
            </button>
        </div>
        <div class="mt-3 flex flex-wrap items-center gap-2">
            <span class="text-sm font-medium">Default visibility</span>
            <div class="card preset-tonal-secondary border border-secondary-500 [&>*+*]:border-secondary-500 w-fit">
                <button
                    type="button"
                    class="px-3 py-1 rounded-s-full"
                    class:preset-filled-secondary-500={selectedVisibility === "0"}
                    onclick={() => {selectedVisibility = "0"}}
                    aria-pressed={selectedVisibility === "0"}>
                    private
                </button>
                <button
                    type="button"
                    class="px-3 py-1"
                    class:preset-filled-secondary-500={selectedVisibility === "1"}
                    onclick={() => {selectedVisibility = "1"}}
                    aria-pressed={selectedVisibility === "1"}>
                    logged in
                </button>
                <button
                    type="button"
                    class="px-3 py-1 rounded-e-full"
                    class:preset-filled-secondary-500={selectedVisibility === "2"}
                    onclick={() => {selectedVisibility = "2"}}
                    aria-pressed={selectedVisibility === "2"}>
                    public
                </button>
            </div>
            <span class="text-xs text-surface-700-300">Trip visibility is the upper limit for trip-linked uploads.</span>
        </div>
    </div>

    <input
        id="mediaPickerUpload"
        type="file"
        class="hidden h-0"
        accept="image/*"
        multiple={true}
        onchange={(event) => handleFileChange(event)}
    />

    {#if isUploading}
        <div class="mb-3 rounded-3xl bg-surface-100-900 p-4 border border-surface-300-700">
            <div class="text-sm mb-2">Uploading {uploadStatus} ({uploadProgress}%)</div>
            <div class="h-2 w-full rounded-full bg-surface-300-700 overflow-hidden">
                <div class="h-2 bg-primary-500 rounded-full transition-all duration-200" style={`width:${uploadProgress}%`}></div>
            </div>
        </div>
    {/if}

    <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 overflow-auto grow">
        {#each images as image}
            <div class="rounded-2xl overflow-hidden bg-surface-100-900 border border-surface-300-700 group">
                <img src={"/api/Media/"+image.username+"/"+image.id+".avif"} alt={parseAlt(image.alt)} class="aspect-square object-cover w-full h-full" />
                <div class="p-2 border-t border-surface-300-700">
                    <div class="text-xs text-surface-700-300 truncate">{parseAlt(image.alt)}</div>
                    <div class="text-xs mt-1 inline-block px-2 py-0.5 rounded-full bg-surface-200-800 border border-surface-400-600">
                        {parseVisibility(image.visibility) ?? "unknown"}
                    </div>
                </div>
            </div>
        {/each}
    </div>

    {#if images.length === 0}
        <div class="rounded-3xl bg-surface-100-900 border border-dashed border-surface-400-600 p-8 text-center text-surface-700-300 mt-3">
            No images uploaded for this trip yet.
        </div>
    {/if}
</div>
