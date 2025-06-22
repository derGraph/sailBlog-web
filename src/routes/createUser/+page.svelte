<script lang="ts">
	import errorStore from '$lib/errorStore.js';
	import type { Role } from '@prisma/client';
	import { onMount } from 'svelte';

    let roles: Role[] = $state([]);
    let roleHasPassword = $state(true);

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
    }

    async function createUser(event: Event) {
        const formdata = new FormData(event.target as HTMLFormElement);
        let username = formdata.get('username');
        let email = formdata.get('email');
        let firstName = formdata.get('firstName');
        let lastName = formdata.get('lastName');
        let password = formdata.get('password');
        
        let url = new URL('/api/User', window.location.origin);
        
        if(username != null) {
            url.searchParams.append('username', username.toString());
        }

        if(email != null) {
            url.searchParams.append('email', email.toString());
        }

        if (firstName != null && firstName.toString() !== "") {
            url.searchParams.append('firstName', firstName.toString());
        }

        if (lastName != null && lastName.toString() !== "") {
            url.searchParams.append('lastName', lastName.toString());
        }

        if (password != null && password.toString() !== "") {
            url.searchParams.append('password', password.toString());
        }

        url.searchParams.append('role', (event.target as HTMLFormElement).querySelector('select')?.value || '');

        let result = await fetch(url, {method:"POST"});
        if (result.ok) {
            console.log(result);
        } else {
            $errorStore = result;
        }
    }
</script>

<div class="md:container md:mx-auto py-3 rounded-3xl my-3 bg-surface-100-900">
	<form class="md:mx-auto max-w-max space-y-3.5" action="javascript:void(0);" onsubmit={createUser}>
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
		<button type="submit" class="btn preset-filled">
			<span>Submit</span>
		</button>
	</form>
</div>
