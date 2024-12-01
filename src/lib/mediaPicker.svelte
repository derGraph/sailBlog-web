<script lang="ts">
    import { onMount } from "svelte";
	import errorStore from "./errorStore";
    
    let {isOpen = $bindable(false), usernameToFetch = "", onFinished = function(username:string, id:string){}} = $props();

    let images: any[] = $state([]);
    let files: any[] = [];
    let mediaVisibilityPopup = $state(false);
    let fileToUpload: string | Blob | null = null;

    // Fetch images when the component mounts
    onMount(async () => {
        await fetchImages();
    });

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
            files.forEach(async (file: any) => {
                const formData = new FormData();
                const response = await fetch("/api/Media?visibility="+encodeURIComponent(visibility)+"&alt="+encodeURIComponent(alt), {
                    method: "POST",
                    body: file,
                });
                if(!response.ok){
                    $errorStore = response;
                }
            });
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
</script>
{#if mediaVisibilityPopup}
    <div class="fixed flex h-full inset-0 content-center items-center place-content-center bg-black bg-opacity-80 z-[1002]">
        <div class="variant-glass-surface rounded-3xl p-4 shadow-lg content-center justify-center w-11/12 md:w-1/3">
            <label for="options" class="h3">Choose visibility and describe photo</label>
            <select id="options" class="input mt-2 border w-full mb-1">
                <option value=0 class="h4">only you</option>
                <option value=1 class="h4" selected>logged in users</option>
                <option value=2 class="h4">everyone</option>
            </select>
            <input id="altText" placeholder="description" class="input mb-1"/>
            <button 
                class="btn variant-filled"
                onclick={uploadImage}>
                OK
            </button>
            <button 
                class="btn variant-filled"
                onclick={() => {mediaVisibilityPopup=false}}>
                Cancel
            </button>
        </div>
    </div>
{/if}
{#if isOpen}
    <div class="fixed h-full inset-0 content-center bg-black bg-opacity-50 z-[1001]">
        <div class="flex content-center justify-center h-[91.6%] md:h-5/6">
            <div class="variant-glass-surface rounded-3xl shadow-lg w-11/12 md:w-3/4 lg:w-3/4 p-4 flex flex-col">
                <div class="text-right">
                    <button onclick={() => (isOpen = false)} class="hover:text-gray-500 material-symbols-outlined">
                        close
                    </button>
                </div>

                <div class="grid grid-cols-2 lg:grid-cols-3 gap-2 overflow-auto flex-grow">
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