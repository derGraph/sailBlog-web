<script lang="ts">
	import errorStore from "$lib/errorStore";
	import { onMount } from "svelte";
    import { parseVisibility } from "$lib/visibility";
	import type { User } from "@prisma/client";
	import { parseDate, parseRadioButton } from "$lib/functions.js";

    let tableArr: any[] = $state([]);
    let totalLength = $state(0);
    let totalSailedLength = $state(0);
    let totalMotoredLength = $state(0);

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
            for(let index in tableArr){
                totalLength += Number(tableArr[index].length_sail)+Number(tableArr[index].length_motor);
                totalSailedLength += Number(tableArr[index].length_sail);
                totalMotoredLength += Number(tableArr[index].length_motor);
                if(tableArr[index].skipperName != data.user?.username){
                    let containsMe = false;
                    for(let crewMember in tableArr[index].crew){
                        if(tableArr[index].crew[crewMember].username == data.user?.username){
                            containsMe = true;
                        }
                    }
                    if(!containsMe){
                        tableArr.splice(tableArr.indexOf(tableArr[index]), 1);
                    }
                }
            }
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

</script>

<div class="md:container md:mx-auto py-3 h-full rounded table-container">
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
    <div class="flex flex-row-reverse">
        <a href="/newTrip" class=""><button type="button" class="btn btn-md mt-1 variant-ringed-secondary"><span class="material-symbols-outlined mr-1">route</span>new Trip</button></a>
    </div>
</div>


