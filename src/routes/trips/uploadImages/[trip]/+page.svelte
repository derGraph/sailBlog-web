<script lang="ts">
	import errorStore from '$lib/errorStore.js';
	import type { Media } from '@prisma/client';
	import { onMount } from 'svelte';

	let { data } = $props();

	let requestedTrip = $derived(data.requestedTrip);

	let user = $derived(data.user);
	let session = $derived(data.session);

    let medias:Media[] = [];

    let images:Media[] = $state([]);
    let isUploading = $state(false);
    let uploadProgress = $state(0);
    let uploadStatus = $state("");

	onMount(() => {
		getTripImages();
	});

	function getTripImages(){
		fetch("/api/Media?tripId="+requestedTrip).then(async (response)=>{
			if (response.ok) {
				response.json().then((response_data) => {
                    for(let image in response_data) {
                        let newMedia = response_data[image] as Media;
                        newMedia.id = image;
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
                let url = "/api/Media?tripId="+encodeURIComponent(requestedTrip);
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

<div class="felx-1 h-full flex felx-col md:container md:mx-auto p-3 rounded table-container">
    {#if isUploading}
        <div class="mb-3 w-full">
            <div class="text-sm mb-1">Uploading {uploadStatus} ({uploadProgress}%)</div>
            <div class="h-2 w-full rounded bg-surface-300-700 overflow-hidden">
                <div class="h-2 bg-primary-500" style={`width:${uploadProgress}%`}></div>
            </div>
        </div>
    {/if}
    <div class="grid grid-cols-2 lg:grid-cols-3 gap-2 overflow-auto grow">
        <button
            class="border rounded cursor-pointer max-h-72"
            onclick={() => document.getElementById("mediaPickerUpload")?.click()}
        >   
            <span class="material-symbols-outlined content-center h-min">add</span>
        </button>
        <input
            id="mediaPickerUpload" 
            type="file" 
            class="hidden h-0"
            accept="image/*"
            multiple={true}
            onchange={(event) => handleFileChange(event)}
        />
        {#each images as image}
            <button
                class="border rounded cursor-pointer h-min"
                onclick={() => null}
            >   
                <img src={"/api/Media/"+image.username+"/"+image.id+".avif"} alt={parseAlt(image.alt)} class="object-cover rounded content-center w-full h-full" />
            </button>
        {/each}
    </div>
</div>
