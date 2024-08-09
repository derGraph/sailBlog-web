<script lang="ts">
    import { Avatar, ListBox } from '@skeletonlabs/skeleton';
	import { onMount } from 'svelte';
    import Tiptap from '$lib/Tiptap/+Tiptap.svelte';
    
    export let data
    let newFirstName = "";
    let newLastName = "";

    $: requestedUserName = data.requestedUser;

    let error = new Response;

    let requestedUser = {
        firstName: "",
        lastName: "",
        username: "",
        description: "",
    };

    $: editName = false;

    onMount(async () => {
        fetch("/api/User?username="+requestedUserName)
        .then(response => {
            if(response.ok){
                response.json().then(response_data => {
                    requestedUser=response_data[Object.keys(response_data)[0]];
                    requestedUser.username = Object.keys(response_data)[0];
                })
            }else{
                error = response
            }
        });
        
    });


	function getInitials(user: any){
		if (user != null && Object.keys(user).includes("firstName") && Object.keys(user).includes("lastName")){
			return user.firstName.charAt(0) + user.lastName.charAt(0)
		}
	}

	function getPictureUrl(user){
		return "https://upload.wikimedia.org/wikipedia/en/9/9a/Trollface_non-free.png"
	}

    function editNameChange(){
        if(editName){
            editName=false;
        }else{
            newFirstName = requestedUser.firstName;
            newLastName = requestedUser.lastName;
            editName=true;
        }
    }

	$: user = data.user;
	$: session = data.session;
    const saveEditor = (message: any) => {
        fetch("/api/User?username="+requestedUserName+"&description="+encodeURIComponent(message), {
            method: "PUT"
        })
        .then(response_data => {
            if(response_data.ok){
                return true
            }else{
                error = response_data
                return false
            }
        }).catch(error => {
            console.log(error);
            return false;
        });
    }
    function resetError(){
        error = new Response
    }
</script>


<div class="md:container md:mx-auto py-3 h-full w-full flex flex-row">
    <div class="flex flex-col w-full bg-surface-100-800-token rounded-3xl items-center">
        {#if error.status && error.status != 200}
            <aside class="alert variant-ghost-warning text-warning-400-500-token">
                <div class="material-symbols-outlined ">warning</div>
                <div class="alert-message">
                    {#await error.json()}
                    <h3 class="h3">"Loading..."</h3>
                    {:then parsed}
                    <h3 class="h3">{error.status} {error.statusText}: {parsed.message}</h3>
                    {:catch parsingError}
                    <h3 class="h3">Error in response: {parsingError}</h3>
                    {/await}
                </div>
                <div class="alert-actions">
                    <button class="btn variant-filled-warning" on:click={resetError}>
                        <span>Ok</span>
                    </button>
                </div>
            </aside>
        {/if}
        {#if requestedUser.firstName && requestedUser.lastName}
            <Avatar initials ={getInitials(requestedUser)} src={getPictureUrl(requestedUser)} class="mt-3" background="bg-primary-500" width="w-40" rounded="rounded-full" />
        {:else}
            <div class="placeholder-circle w-40 mt-3" />
        {/if}
        {#if requestedUser.firstName && requestedUser.lastName}
            {#if editName==false}
                <div class="flex flex-row">
                    <h1 class="h1 mt-3">{requestedUser.firstName+" "+requestedUser.lastName}</h1>
                    {#if user?.username == requestedUserName}
                        <button class="h1 mt-3 material-symbols-outlined max-h" on:click={editNameChange}>edit</button>
                    {/if}
                </div>
            {:else}
                <div class="flex flex-row">
                    
                    <input name="firstName" class="mt-3 input min-w" bind:value="{newFirstName}" type="text" placeholder="{requestedUser.firstName}" required />
                    <input name="lastName" class="mt-3 ml-3 input min-w" bind:value="{newLastName}" type="text" placeholder="{requestedUser.lastName}" required />
                    {#if user?.username == requestedUserName}
                        <button class="h1 mt-3 material-symbols-outlined max-h" on:click={editNameChange}>check</button>
                    {/if}
                </div>
            {/if}
            
        {/if}
        {#if requestedUser.username}
            <h4 class="h4">@{requestedUser.username}</h4>
        {/if}
        {#if user?.username == requestedUserName}
            <Tiptap saveEditor={saveEditor} description={requestedUser.description}/>
        {:else if requestedUser.description}
            <div class="remove-all">
                {@html requestedUser.description}
            </div>
        {/if}
    </div>
</div>