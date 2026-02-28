<script lang="ts">
	import errorStore from "./errorStore";
    
    let {isOpen = $bindable(false), usernameToFetch = "", onFinished = function(username:string, id:string){}, canUpload = true} = $props();

    let images: any[] = $state([]);
    let files: any[] = [];
    let mediaVisibilityPopup = $state(false);
    let fileToUpload: string | Blob | null = null;
    let isUploading = $state(false);
    let uploadProgress = $state(0);

    // Fetch images when username changes
    $effect(()=>{
        usernameToFetch;
        fetchImages();
    });

    // Fetch images from the API
    async function fetchImages() {
        try {
            const response = await fetch("/api/Media?username="+usernameToFetch);
            if (!response.ok) {
                $errorStore = response;
                return;
            }
            images = await response.json(); // Assuming the response is a JSON array of image objects
            images = images.reverse();
        } catch (error) {
            console.error("Error fetching images:", error);
        }
    }

    // Handle file selection
    async function handleFileChange(event: Event) {
        let target = event.target as HTMLInputElement;
        if(target.files){
            for(let i=0; i<target.files?.length; i++){
                if(!target.files[i].type.includes('image/')){
                    $errorStore = new Response('{"message": "Only images are allowed!"}', {status: 415, statusText: "Unsupported Media Type"});
                } else {
                    mediaVisibilityPopup = true;
                    files[0] = target.files[i];
                }
            }
        }
    }

    // Upload the selected file
    async function uploadImage() {
        let alt:string = (document.getElementById("altText") as HTMLInputElement).value;
        if(alt.length<5 || alt == "description must be provided!"){
            (document.getElementById("altText") as HTMLInputElement).value = "description must be provided!";
            return;
        }
        let visibility = Number.parseInt((document.getElementById("options") as HTMLInputElement).value);
        if(visibility == null){
            visibility = 1;
        }
        if(files){
            isUploading = true;
            uploadProgress = 0;
            const compressedFiles: { blob: Blob; exif: { lat?: number; long?: number; created?: string } }[] = [];
            let totalBytes = 0;
            for (const file of files) {
                try{
                    const exif = await extractExifData(file);
                    let blob: Blob;
                    try{
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
            let uploadedBytes = 0;
            for (const item of compressedFiles) {
                const blob = item.blob;
                const exif = item.exif;
                let url = "/api/Media?visibility="+encodeURIComponent(visibility)+"&alt="+encodeURIComponent(alt);
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
        }
        mediaVisibilityPopup = false;
        setTimeout(async function() {await fetchImages();}, 500)
    }

    // Close the modal and return the selected image ID
    function selectImage(username:String, imageId:String) {
        onFinished(username, imageId);
        isOpen = false;
    }

    function parseAlt(alt: string){
        if(alt == null){
            alt = "Image";
        }
        return alt;
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
{#if mediaVisibilityPopup}
    <div class="fixed flex h-full inset-0 content-center items-center place-content-center bg-black bg-opacity-80 z-1002">
        <div class="preset-tonal-surface rounded-3xl p-4 shadow-lg content-center justify-center w-11/12 md:w-1/3">
            <label for="options" class="h3">Choose visibility and describe photo</label>
            <select id="options" class="input mt-2 border w-full mb-1">
                <option value=0 class="h4">only you</option>
                <option value=1 class="h4" selected>logged in users</option>
                <option value=2 class="h4">everyone</option>
            </select>
            <input id="altText" placeholder="description" class="input mb-1"/>
            {#if isUploading}
                <div class="mb-2">
                    <div class="text-sm mb-1">Uploading ({uploadProgress}%)</div>
                    <div class="h-2 w-full rounded bg-surface-300-700 overflow-hidden">
                        <div class="h-2 bg-primary-500" style={`width:${uploadProgress}%`}></div>
                    </div>
                </div>
            {/if}
            <button 
                class="btn preset-filled"
                onclick={uploadImage}>
                OK
            </button>
            <button 
                class="btn preset-filled"
                onclick={() => {mediaVisibilityPopup=false}}>
                Cancel
            </button>
        </div>
    </div>
{/if}
{#if isOpen}
    <div class="fixed h-full inset-0 content-center bg-black bg-opacity-50 z-1001">
        <div class="flex content-center justify-center h-[91.6%] md:h-5/6">
            <div class="preset-tonal-surface rounded-3xl shadow-lg w-11/12 md:w-3/4 lg:w-3/4 p-4 flex flex-col">
                <div class="text-right">
                    <button onclick={() => (isOpen = false)} class="hover:text-gray-500 material-symbols-outlined">
                        close
                    </button>
                </div>

                <div class="grid grid-cols-2 lg:grid-cols-3 gap-2 overflow-auto grow">
                            {#if canUpload}
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
                                    onchange={(event) => handleFileChange(event)}
                                />
                            {/if}
                    {#each images as image}
                            <button
                                class="border rounded cursor-pointer h-min"
                                onclick={() => selectImage(image.username, image.id)}
                            >   
                                <img src={"/api/Media/"+image.username+"/"+image.id+".avif"} alt={parseAlt(image.alt)} class="object-cover rounded content-center w-full h-full" />
                            </button>
                    {/each}
                </div>
            </div>
        </div>
    </div>
{/if}
