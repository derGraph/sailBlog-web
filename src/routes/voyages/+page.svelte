<script lang="ts">
	let totalWeight = 10;
	let search = '';
	let name = '0';

	let trips = [{ id: '1' }, {}];

	/*
    model Trip {
    id                String    @id @default(cuid())
    trip              Voyage    @relation(fields: [tripId], references: [id])
    tripId            String
    name              String
    description       String?
    startPoint        Datapoint?@relation("startPoint", fields: [startPointId], references: [id])
    startPointId      String?   @unique
    endPoint          Datapoint?@relation("endPoint", fields: [endPointId], references: [id])
    endPointId        String?   @unique
    start             DateTime?
    end               DateTime?
    last_update       DateTime  @updatedAt
    length            Decimal?
    skipper           User?     @relation("skipper", fields: [skipperName], references: [username])
    skipperName       String?
    crew              User[]    @relation("crew")
    }*/
</script>

<div class="md:container md:mx-auto py-3 h-full">
	<div class="bg-surface-100-800-token rounded-3xl h-full">
		<div class="bg-surface-200-700-token rounded-t-3xl flex flex-wrap place-content-between">
			<span class="text-4xl align-middle mt-2 ml-5 w-max grow md:grow-0">Your Trips!</span>
			<input
				class="input w-min m-2 place-self-end grow md:grow-0"
				type="search"
				bind:value={search}
				placeholder="Search..."
			/>
		</div>
		<div class="bg-surface-100-800-token">
			<h3 class="h3 ml-5">Maybe hier scroll container oder pagination</h3>
		</div>
		<hr />
		<div class="bg-surface-100-800-token">
			<h3 class="h3 ml-5">{name}</h3>
		</div>
	</div>
</div>
