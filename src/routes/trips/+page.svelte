<script lang="ts">
	import errorStore from "$lib/errorStore";
	import { onMount } from "svelte";
    import { parseVisibility } from "$lib/visibility";
	import type { User } from "@prisma/client";
	import { parseDate, parseRadioButton } from "$lib/functions.js";
	import SearchBar from "$lib/searchBar.svelte";

    let tableArr: any[] = $state([]);
    let totalLength = $state(0);
    let totalSailedLength = $state(0);
    let totalMotoredLength = $state(0);
    let showDeletedTrips = $state(false);
    let showMyTrips = $state(false);

    let { data } = $props();

    onMount(()=>{
        reloadTable();
    });

    function reloadTable(){
        fetch('/api/Trips').then(async (response)=>{
            if (!response.ok) {
                $errorStore = response;
                return;
            }
            tableArr = await response.json();
            tableArr = tableArr.filter((trip:{length_sail:Number, length_motor:Number, skipperName:String|null, crew:User[]})=>{
                if(trip.skipperName == data.user?.username){
                    // is Skipper
                    totalLength += Number(trip.length_sail)+Number(trip.length_motor);
                    totalSailedLength += Number(trip.length_sail);
                    totalMotoredLength += Number(trip.length_motor);
                    return true;
                }
                if((trip.crew.map((member)=>{return member.username})).includes(data.user!.username)){
                    // is Crew;
                    totalLength += Number(trip.length_sail)+Number(trip.length_motor);
                    totalSailedLength += Number(trip.length_sail);
                    totalMotoredLength += Number(trip.length_motor);
                    return true;
                }
                return false;
            });
        });
    }

    function parseCrew(unparsedCrew:User[]){
        let crewHtml = "";
        unparsedCrew.forEach(member => {
            crewHtml += member.username + ", ";
        });
        return crewHtml.replace(/. $/, "");
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

</script>

<div class="md:container md:mx-auto pb-3 h-full rounded table-container">
    <div class="flex flex-row my-1 flex-wrap">
        <button type="button" onclick={()=>{if(showMyTrips){showDeletedTrips=false} showMyTrips = !showMyTrips}} class="btn btn-md variant-ghost mr-2">
            <span class="material-symbols-outlined">{#if showMyTrips}check_box{:else}check_box_outline_blank{/if}</span>
            my Trips
        </button>
        <button type="button" onclick={()=>{if(!showDeletedTrips){showMyTrips=true} showDeletedTrips = !showDeletedTrips}} class="btn btn-md variant-ghost-error">
            <span class="material-symbols-outlined">{#if showDeletedTrips}check_box{:else}check_box_outline_blank{/if}</span>
            deleted Trips
        </button>
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
                <th>Skipper</th>
                <th>Crew</th>
                <th>Visibilty</th>
			</tr>
		</thead>
		<tbody>
			{#each tableArr as row}
                <tr class="group">
                    <td onclick={() => selectActiveTrip(row.id)} class="!align-middle"><button type="button" class="material-symbols-outlined !align-middle">{@html parseRadioButton(row.id, data.user)}</button></td>
                    <td onclick={()=>{window.location.href='/trips/'+row.id}} class="!align-middle">{row.name}</td>
                    <td onclick={()=>{window.location.href='/trips/'+row.id}} class="!align-middle">{parseDate(row.startPoint)}</td>
                    <td onclick={()=>{window.location.href='/trips/'+row.id}} class="!align-middle">{parseDate(row.endPoint)}</td>
                    <td onclick={()=>{window.location.href='/trips/'+row.id}} class="!align-middle">{((Number(row.length_sail) + Number(row.length_motor))/1853).toFixed(0)} NM<div class="hidden group-hover:block"><span class="!text-xs material-symbols-outlined">sailing</span>{(Number(row.length_sail)/1853).toFixed(0)} <span class="!text-xs material-symbols-outlined">mode_heat</span>{(Number(row.length_motor)/1853).toFixed(0)}</div></td>
                    <td onclick={()=>{window.location.href='/trips/'+row.id}} class="!align-middle">{row.skipperName}</td>
                    <td onclick={()=>{window.location.href='/trips/'+row.id}} class="!align-middle">{parseCrew(row.crew)}</td>
                    <td onclick={()=>{window.location.href='/trips/'+row.id}} class="!align-middle">{parseVisibility(row.visibility)}</td>
                </tr>
			{/each}
		</tbody>
		<tfoot>
			<tr class="group">
				<th colspan="4">Total Miles</th>
				<td>{(totalLength/1853).toFixed(0)} NM<div class="hidden group-hover:block"><span class="!text-xs material-symbols-outlined">sailing</span>{(totalSailedLength/1853).toFixed(0)} <span class="!text-xs material-symbols-outlined">mode_heat</span>{(totalMotoredLength/1853).toFixed(0)}</div></td>
			</tr>
		</tfoot>
	</table>
</div>


