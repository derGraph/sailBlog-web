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
    let visibilitySavingByImageId: Record<string, boolean> = $state({});
    let openVisibilityPanelId: string | null = $state(null);
    let deletingByImageId: Record<string, boolean> = $state({});

	onMount(() => {
		getTripImages();
	});

	function getTripImages(){
		fetch("/api/Media?tripId="+requestedTrip).then(async (response)=>{
			if (response.ok) {
				response.json().then((response_data) => {
                    images = normalizeTripImages(response_data);
				});
			} else {
				$errorStore = response;
			}
		});
	}

    function normalizeTripImages(response_data: any): Media[] {
        if (Array.isArray(response_data)) {
            return response_data as Media[];
        }
        const normalized: Media[] = [];
        for (const mediaId in response_data) {
            normalized.push({
                ...response_data[mediaId],
                id: mediaId
            } as Media);
        }
        return normalized;
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

    async function updateImageVisibility(imageId: string, oldVisibility: number, event: Event) {
        const target = event.currentTarget as HTMLSelectElement | null;
        if (!target) {
            return;
        }
        const newVisibility = Number.parseInt(target.value, 10);
        if (Number.isNaN(newVisibility)) {
            target.value = String(oldVisibility);
            return;
        }

        visibilitySavingByImageId[imageId] = true;
        const response = await fetch('/api/Media?mediaId=' + encodeURIComponent(imageId) + '&visibility=' + encodeURIComponent(newVisibility), { method: 'PUT' });
        if (!response.ok) {
            $errorStore = response;
            target.value = String(oldVisibility);
        } else {
            const responseData = await response.json();
            images = images.map((image) => image.id === imageId ? { ...image, visibility: responseData.visibility } as Media : image);
            target.value = String(responseData.visibility);
            openVisibilityPanelId = null;
        }
        visibilitySavingByImageId[imageId] = false;
    }

    function toggleVisibilityPanel(panelId: string) {
        openVisibilityPanelId = openVisibilityPanelId === panelId ? null : panelId;
    }

    function getImagePanelId(image: Media, index: number) {
        return image.id ?? `${image.username ?? "image"}-${index}`;
    }

    async function deleteImage(image: Media) {
        if (!image.id) {
            $errorStore = new Response('{"message":"Image id missing."}', { status: 400, statusText: 'Bad Request' });
            return;
        }
        if (!confirm('Delete this image?')) {
            return;
        }

        deletingByImageId[image.id] = true;
        const response = await fetch('/api/Media?mediaId=' + encodeURIComponent(image.id), { method: 'DELETE' });
        if (!response.ok) {
            $errorStore = response;
        } else {
            images = images.filter((candidate) => candidate.id !== image.id);
            if (openVisibilityPanelId === image.id) {
                openVisibilityPanelId = null;
            }
        }
        deletingByImageId[image.id] = false;
    }

</script>

<div class="h-full min-h-0 md:container md:mx-auto p-3 rounded table-container flex flex-col">
    <div class="rounded-3xl bg-surface-100-900 p-4 mb-3 border border-surface-300-700">
        <div class="flex flex-wrap items-start gap-3">
            <div class="grow">
                <h2 class="h3">Trip Image Upload</h2>
                <p class="text-sm text-surface-700-300 mt-1">Choose default visibility, then upload one or multiple images.</p>
            </div>
            <div class="flex flex-col gap-2">
                <button
                    class="btn preset-tonal-primary border border-primary-500"
                    onclick={() => document.getElementById("mediaPickerUpload")?.click()}
                >
                    <span class="material-symbols-outlined mr-1">upload</span>
                    Add Images
                </button>
                <a
                    class="btn preset-tonal-secondary border border-secondary-500"
                    href="/trips/importGooglePhotos/{requestedTrip}"
                >
                    <span class="material-symbols-outlined mr-1">photo_library</span>
                    Import Google Photos
                </a>
            </div>
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

    <div class="min-h-0 grow overflow-auto">
    <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
        {#each images as image, index}
            <div class="rounded-2xl overflow-hidden bg-surface-100-900 border border-surface-300-700 relative">
                <img src={"/api/Media/"+image.username+"/"+image.id+".avif"} alt={parseAlt(image.alt)} class="aspect-square object-cover w-full" />
                <div class="absolute top-2 right-2 z-10 flex gap-1">
                <button
                    type="button"
                    class="btn-icon preset-tonal-error border border-error-500 material-symbols-outlined !w-8 !h-8 !p-0 flex items-center justify-center"
                    aria-label="Delete image"
                    onclick={() => deleteImage(image)}
                    disabled={deletingByImageId[image.id]}
                >
                    {#if deletingByImageId[image.id]}hourglass_top{:else}delete{/if}
                </button>
                <button
                    type="button"
                    class="btn-icon preset-tonal-secondary border border-secondary-500 material-symbols-outlined !w-8 !h-8 !p-0 flex items-center justify-center"
                    aria-label="Change visibility"
                    aria-expanded={openVisibilityPanelId === getImagePanelId(image, index)}
                    onclick={() => toggleVisibilityPanel(getImagePanelId(image, index))}
                >
                    visibility
                </button>
                </div>
                {#if openVisibilityPanelId === getImagePanelId(image, index)}
                <div class="absolute inset-x-0 bottom-0 p-2 bg-surface-100-900/95 backdrop-blur-sm border-t border-surface-300-700 z-20">
                    <div class="text-xs text-surface-700-300 truncate">{parseAlt(image.alt)}</div>
                    <div class="text-xs text-surface-700-300 mt-1">{parseVisibility(image.visibility) ?? "unknown"}</div>
                    <div class="mt-2 flex items-center gap-2">
                        <select
                            class="select !w-full !py-1 !px-2 text-xs"
                            value={String(image.visibility)}
                            disabled={!image.id}
                            onchange={(event) => updateImageVisibility(image.id, image.visibility, event)}
                        >
                            <option value="0">private</option>
                            <option value="1">logged in</option>
                            <option value="2">public</option>
                        </select>
                        {#if visibilitySavingByImageId[image.id]}
                            <span class="text-xs text-surface-700-300">saving...</span>
                        {/if}
                    </div>
                </div>
                {/if}
            </div>
        {/each}
    </div>
    </div>

    {#if images.length === 0}
        <div class="rounded-3xl bg-surface-100-900 border border-dashed border-surface-400-600 p-8 text-center text-surface-700-300 mt-3">
            No images uploaded for this trip yet.
        </div>
    {/if}
</div>
