<script lang="ts">
	import { onMount } from 'svelte';

    export let data

    onMount(async () => {
		if (data.confirmed){
            setTimeout(callBack_func, 5000);
        }
        function callBack_func() {
            document.location.href = "/";
        }
	});
</script>

<div class='md:container md:mx-auto py-3 h-full rounded content-center'>
	{#if data.confirmed}
        <h1 class="h1 text-center">You have been logged out!</h1>
        <h2 class="h2 text-center">Bye bye!</h2>
        <h3 class="h3 text-center">Redirecting in 5 seconds!</h3>
    {:else}
        <h1 class="h1 text-center">Error logging you out!</h1>
        <h2 class="h2 text-center">Contact support!</h2>
    {/if}
</div>