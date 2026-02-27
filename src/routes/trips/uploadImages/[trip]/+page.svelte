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
                                    console.log(images);

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
            // PROMPT FOR VISIBILITY
            for(let i=0; i<target.files?.length; i++){
                if(!target.files[i].type.includes('image/')){
                    $errorStore = new Response('{"message": "Only images are allowed!"}', {status: 415, statusText: "Unsupported Media Type"});
                } else {
                    console.log(target.files[i]);
                    const formData = new FormData();
                    const response = await fetch("/api/Media?visibility="+encodeURIComponent(0)+"&tripId="+encodeURIComponent(requestedTrip), {
                        method: "POST",
                        body: target.files[i],
                    });
                    if(!response.ok){
                        $errorStore = response;
                    }
                }
            }
        }
    }
</script>

<div class="felx-1 h-full flex felx-col md:container md:mx-auto p-3 rounded table-container">
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