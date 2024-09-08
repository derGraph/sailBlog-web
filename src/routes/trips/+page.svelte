<script lang="ts">
	import errorStore from "$lib/errorStore";
	import { onMount } from "svelte";
    import { parseVisibility } from "$lib/visibility";
	import type { User } from "@prisma/client";

    let tableArr: any[] = [];
    let totalWeight = 0;

    export let data;


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
            tableArr.forEach(element => {
                if(element.skipperName != data.user?.username){
                    let containsMe = false;
                    element.crew.forEach(crewMember => {
                        if(crewMember.username == data.user?.username){
                            containsMe = true;
                        }
                    });
                    if(!containsMe){
                        delete tableArr[tableArr.indexOf(element)];
                    }
                }
            });
        });
    }

    function parseDate(unparsedDate:any){
        if(unparsedDate == null){
            return;
        }else if(unparsedDate.time == null){
            return;
        }
        let parsedDate = new Date(unparsedDate.time);
        return parsedDate.getDate()+"."+(parsedDate.getMonth()+1)+"."+parsedDate.getFullYear();
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
    function parseActiveTrip(tripId:string){
        if(tripId==data.user?.activeTripId){
            //ACTIVE
            return 'radio_button_checked';
        }else{
            //NOT ACTIVE
            return 'radio_button_unchecked';
        }
    }


</script>

<div class="md:container md:mx-auto py-3 h-full rounded table-container">
    <table class="text-wrap table table-hover">
		<thead>
			<tr>
                <th class="min-w-16 w-16 ">active</th>
				<th>Trip name</th>
				<th>Start Date</th>
				<th>End Date</th>
				<th>Length</th>
                <th>Skipper</th>
                <th>Crew</th>
                <th>Visibilty</th>
			</tr>
		</thead>
		<tbody>
			{#each tableArr as row, i}
                    <tr>
                        <td on:click={() => selectActiveTrip(row.id)}><button type="button" class="material-symbols-outlined">{@html parseActiveTrip(row.id)}</button></td>
                        <td on:click="{()=>{window.location.href='/trips?trip='+row.id}}">{row.name}</td>
                        <td on:click="{()=>{window.location.href='/trips?trip='+row.id}}">{parseDate(row.startPoint)}</td>
                        <td on:click="{()=>{window.location.href='/trips?trip='+row.id}}">{parseDate(row.endPoint)}</td>
                        <td on:click="{()=>{window.location.href='/trips?trip='+row.id}}">{row.length}</td>
                        <td on:click="{()=>{window.location.href='/trips?trip='+row.id}}">{row.skipperName}</td>
                        <td on:click="{()=>{window.location.href='/trips?trip='+row.id}}">{parseCrew(row.crew)}</td>
                        <td on:click="{()=>{window.location.href='/trips?trip='+row.id}}">{parseVisibility(row.visibility)}</td>
                    </tr>
			{/each}
		</tbody>
		<tfoot>
			<tr>
				<th colspan="4">Total Miles</th>
				<td>{totalWeight}</td>
			</tr>
		</tfoot>
	</table>
    <div class="flex flex-row-reverse">
        <a href="/newTrip" class=""><button type="button" class="btn btn-md mt-1 variant-ringed-secondary"><span class="material-symbols-outlined mr-1">route</span>new Trip</button></a>
    </div>
</div>


