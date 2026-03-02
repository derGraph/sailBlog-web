<script lang="ts">
	import errorStore from '$lib/errorStore.js';
	import type { Role } from '@prisma/client';
	import { onMount } from 'svelte';

    let roles: Role[] = $state([]);
    let roleHasPassword = $state(true);
    let roleHasMagicLink = $state(false);

    let magicLink: null|string = null;

    onMount(async () => {
        let result = await fetch("/api/Roles", {method:"GET"});
        if (result.ok) {
            roles = await result.json();
            roleHasPassword = roles[0].needsPassword;
        } else {
            $errorStore = result;
        }
    });

    function roleSelected(event: Event) {
        const selectElement = event.target as HTMLSelectElement;
        const selectedRoleId = selectElement.value;
        // Check if the selected role requires a password
        roleHasPassword = roles.some(role => role.id === selectedRoleId && role.needsPassword);
        roleHasMagicLink = roles.some(role => role.id === selectedRoleId && role.canUseMagicLink);

        if (!roleHasMagicLink) {
            magicLink = null;
        }
    }

    async function createUser(event: Event) {
        const formdata = new FormData(event.target as HTMLFormElement);
        let username = formdata.get('username')?.toString();
        let email = formdata.get('email')?.toString();
        let firstName = formdata.get('firstName')?.toString();
        let lastName = formdata.get('lastName')?.toString();
        let password = formdata.get('password')?.toString();
        const role = (event.target as HTMLFormElement).querySelector('select')?.value || '';

        let result = await fetch('/api/User', {
            method:"POST",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ...(username && { username }),
                ...(email && { email }),
                ...(firstName && { firstName }),
                ...(lastName && { lastName }),
                ...(password && { password }),
                ...(magicLink && { magicLink }),
                role
            })
        });
        if (result.ok) {
            magicLink = null;
            (document.getElementById("createUserForm") as HTMLFormElement)?.reset();
            alert("User created!");
        } else {
            $errorStore = result;
        }
    }


	function generateMagicLink(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement; }) {
        magicLink = generateSecureRandomString()+"."+generateSecureRandomString();        
        navigator.clipboard.writeText(window.location.protocol+"//"+window.location.host+"/sign_in?allowMagicLink=1#magicLink="+encodeURIComponent(magicLink));
        alert("Link copied to Clipboard!\nWarning: This cannot be regenerated!");
	}

    function generateSecureRandomString(): string {
        const alphabet = "abcdefghijklmnpqrstuvwxyz23456789";
        const bytes = new Uint8Array(24);
        crypto.getRandomValues(bytes);
        let returnString = "";
        for (let i = 0; i < bytes.length; i++) {
            // >> 3 s"removes" the right-most 3 bits of the byte
            returnString += alphabet[bytes[i] >> 3];
        }
        return returnString;
    }
</script>

<div class="md:container md:mx-auto py-3 rounded-3xl my-3 bg-surface-100-900">
	<form class="md:mx-auto max-w-max space-y-3.5" action="javascript:void(0);" onsubmit={createUser} id="createUserForm">
		<h3 class="h3 md:mx-auto">Sign up!</h3>
		<label class="label">
			<span>Username</span>
			<input name="username" class="input" type="text" placeholder="Username" required />
		</label>
		<label class="email">
			<span>Email</span>
			<input name="email" class="input" type="text" placeholder="Email" />
		</label>
		<label class="label">
			<span>First Name</span>
			<input name="firstName" class="input" type="text" placeholder="First Name" />
		</label>
		<label class="label">
			<span>Last Name</span>
			<input name="lastName" class="input" type="text" placeholder="Last Name" />
		</label>
        <label class="label">
            <span>Select</span>
            <select class="select input" onchange={roleSelected}>
                ${#each roles as role}
                    <option value={role.id}>{role.id}</option>
                {/each}
            </select>
        </label>

        {#if roleHasPassword}
            <label class="label">
                <span>Password</span>
                <input name="password" class="input" type="password" placeholder="password" />
            </label>
        {/if}

        {#if roleHasMagicLink}
            <label class="label">
                <span>Magic Link</span>
                <button type="button" class="btn preset-filled" onclick={generateMagicLink}>
                    <span>Generate</span>
                </button>
            </label>
        {/if}
		<button type="submit" class="btn preset-filled">
			<span>Submit</span>
		</button>

	</form>
</div>
