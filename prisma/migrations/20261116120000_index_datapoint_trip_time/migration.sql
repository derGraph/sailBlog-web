-- Support trip edge lookups and chronological datapoint reads without sorting whole trips.
CREATE INDEX `Datapoint_tripId_time_id_idx` ON `Datapoint`(`tripId`, `time`, `id`);
