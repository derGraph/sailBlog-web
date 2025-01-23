<script lang="ts">
	import errorStore from "$lib/errorStore";
	import { onMount } from "svelte";
	import type { User, Location, Trip } from "@prisma/client";
	import { parseDate, parseRadioButton } from "$lib/functions.js";
	import SearchBar from "$lib/searchBar.svelte";

    let tableArr: any[] = $state([]);
    let allTrips: any[] = $state([]);
    let showDeletedTrips = $state(false);
    let showMyTrips = $state(false);
    let showLocationSearch = $state(false);
    let showUserSearch = $state(false);
    let filterLocations: String[] = $state([]);
    let filterUsers: String[] = $state([]);

    let maxTrips = $state(0);
    let page = $state(0);

    let { data } = $props();

    onMount(()=>{
        reloadTable();
    });

    function applyTripFilter() {
        tableArr = allTrips.filter(trip => {
            // If showDeletedTrips is true, show only deleted trips
            if (showDeletedTrips) {
                return trip.deleted;
            }

            // If locations array is empty, consider all locations
            const locationMatch = filterLocations.length === 0 || trip.location.some((loc: { name: String; }) => filterLocations.includes(loc.name));

            // If user array is empty, consider all users
            const userMatch = filterUsers.length === 0 || trip.crew.some((loc: { username: String; }) => filterUsers.includes(loc.username)) || 
                            filterUsers.includes(trip.skipperName);
            // If showDeletedTrips is false, only include trips that are not deleted
            const deletionMatch = !trip.deleted;

            // If showMyTrips is false, include all trips; otherwise, filter by the user's trips
            const isMyTrip =
                !showMyTrips ||
                trip.crew.some((crewMember: { username: string | undefined; }) => crewMember.username === data.user?.username) ||
                trip.skipperName === data.user?.username;

            // Combine all conditions
            return locationMatch && deletionMatch && isMyTrip && userMatch;
        });
        maxTrips = tableArr.length;
        tableArr = tableArr.slice(page*10, (page+1)*10);
    }


    function reloadTable(){
        fetch('/api/Trips?deleted='+showDeletedTrips).then(async (response)=>{
            if (!response.ok) {
                $errorStore = response;
                return;
            }
            allTrips = await response.json();
            applyTripFilter();
        });
    }

    function parseCrew(unparsedCrew:User[]){
        let crewHtml = "";
        unparsedCrew.forEach(member => {
            crewHtml += member.username + ", ";
        });
        return crewHtml.replace(/. $/, "");
    }

    function parseLocation(locationData:Location[]){
        let parsedLocation = "";
        for(let location of locationData){
            parsedLocation += location.name;
        }
        return parsedLocation;
    }

    async function selectActiveTrip(tripId:string){
        let result;
        if(tripId != data.user?.activeTripId){
            result = await fetch("/api/User?activeTrip="+tripId, {method:"PUT"});
            if (!result.ok){
                errorStore.set(result);
            }else{
                window.location.reload();
            }
        }
    }

    async function addTrip() {
        let result = await fetch("/api/Trip?name=newTrip&skipper="+data.user?.username+'&crew='+data.user?.username, {method:"POST"});
        if (!result.ok){
                errorStore.set(result);
            }else{
                window.location.assign("/trips/edit/"+(await result.json()).id);
            }
    }
    
    async function getLocations(){
        let locationList:String[] = [];
        let result = await fetch("/api/Locations");
        if (!result.ok){
                errorStore.set(result);
            }else{
                let json = await result.json();
                for(let location of json){
                    locationList.push(location.name);
                }
            }
        return locationList;
    }

    async function addLocationTerm(location: String) {
        if(!filterLocations.includes(location)){
            filterLocations.push(location);
            applyTripFilter();
        }
    }

    async function searchUser(searchTerm:string) {
		let response = await fetch('/api/User?search='+searchTerm, {method: 'GET'});
		if(!response.ok){
			$errorStore = response;
		}else{
			let usernameArray:String[] = await response.json();
			return usernameArray;
		}
		return [];
	}

    async function addUserTerm(user: String) {
        if(!filterUsers.includes(user)){
            filterUsers.push(user);
            applyTripFilter();
        }
    }

</script>

<div class="md:container md:mx-auto pb-3 h-full rounded table-container">
    <div class="flex flex-row my-1 flex-wrap">
        <button type="button" onclick={()=>{if(showMyTrips){showDeletedTrips=false} showMyTrips = !showMyTrips; reloadTable()}} class="btn btn-md variant-ghost mr-2">
            <span class="material-symbols-outlined">{#if showMyTrips}check_box{:else}check_box_outline_blank{/if}</span>
            my Trips
        </button>
        <button type="button" onclick={()=>{if(!showDeletedTrips){showMyTrips=true} showDeletedTrips = !showDeletedTrips; reloadTable()}} class="btn btn-md variant-ghost-error mr-4">
            <span class="material-symbols-outlined">{#if showDeletedTrips}check_box{:else}check_box_outline_blank{/if}</span>
            deleted Trips
        </button>
        <spacer class="flex-1"></spacer>
        <button type="button" onclick={()=>{showLocationSearch = !showLocationSearch}} class="btn btn-md variant-ghost mr-2">
            <span class="material-symbols-outlined">search</span>
            search for Location
        </button>
        <SearchBar bind:displayed = {showLocationSearch} getList={getLocations} onSelected={addLocationTerm}></SearchBar>
        {#each filterLocations as filterLocation}
            <button type="button" onclick={()=>{filterLocations = filterLocations.filter(e => e !== filterLocation); applyTripFilter()}} class="btn btn-md variant-ghost-tertiary mr-2">
                <span class="material-symbols-outlined">close</span>
                {filterLocation}
            </button>
        {/each}
        <button type="button" onclick={()=>{showUserSearch = !showUserSearch}} class="btn btn-md variant-ghost mr-2">
            <span class="material-symbols-outlined">search</span>
            search for User
        </button>
        <SearchBar bind:displayed = {showUserSearch} getList={searchUser} onSelected={addUserTerm}></SearchBar>
        {#each filterUsers as filterUser}
            <button type="button" onclick={()=>{filterUsers = filterUsers.filter(e => e !== filterUser); applyTripFilter()}} class="btn btn-md variant-ghost-tertiary mr-2">
                <span class="material-symbols-outlined">close</span>
                {filterUser}
            </button>
        {/each}
        <spacer class="flex-1"></spacer>
        <button type="button" onclick={()=>{addTrip()}} class="btn btn-md variant-ghost-success"><span class="material-symbols-outlined">add</span>add Trip</button>
    </div>
    <table class="text-wrap table table-hover">
		<thead>
			<tr>
                <th class="min-w-16 w-16">active</th>
				<th>Trip name</th>
				<th>Start Date</th>
				<th>End Date</th>
				<th>Distance</th>
                <th>Location</th>
                <th>Skipper</th>
                <th>Crew</th>
			</tr>
		</thead>
		<tbody>
			{#each tableArr as row}
                <tr class="group">
                    <td onclick={() => selectActiveTrip(row.id)} class="!align-middle"><button type="button" class="material-symbols-outlined !align-middle">{@html data.user ? parseRadioButton(row.id, data.user) : 'radio_button_unchecked'}</button></td>
                    <td onclick={()=>{window.location.href='/trips/'+row.id}} class="!align-middle">{row.name}</td>
                    <td onclick={()=>{window.location.href='/trips/'+row.id}} class="!align-middle">{parseDate(row.startPoint)}</td>
                    <td onclick={()=>{window.location.href='/trips/'+row.id}} class="!align-middle">{parseDate(row.endPoint)}</td>
                    <td onclick={()=>{window.location.href='/trips/'+row.id}} class="!align-middle">{((Number(row.length_sail) + Number(row.length_motor))/1853).toFixed(0)} NM<div class="hidden group-hover:block"><span class="!text-xs material-symbols-outlined">sailing</span>{(Number(row.length_sail)/1853).toFixed(0)} <span class="!text-xs material-symbols-outlined">mode_heat</span>{(Number(row.length_motor)/1853).toFixed(0)}</div></td>
                    <td onclick={()=>{window.location.href='/trips/'+row.id}} class="!align-middle">{parseLocation(row.location)}</td>
                    <td onclick={()=>{window.location.href='/trips/'+row.id}} class="!align-middle">{row.skipperName}</td>
                    <td onclick={()=>{window.location.href='/trips/'+row.id}} class="!align-middle">{parseCrew(row.crew)}</td>
                </tr>
			{/each}
		</tbody>
		<tfoot>
			<tr class="group">
				<td>
                    {#if maxTrips >= 10}
                    <div class="btn-group variant-ghost-secondary [&>*+*]:border-secondary-500">
                        {#each {length: maxTrips}, i }
                            {#if i%10 == 0}
                            <button
                                onclick={() => {page = (i/10); applyTripFilter()}}
                                class="!btn-sm"
                                class:variant-filled-secondary={page == (i/10)}>
                                {i/10 + 1}
                            </button>
                            {/if}
                        {/each}
                    </div>
                    {/if}
                </td>
			</tr>
		</tfoot>
	</table>
</div>


