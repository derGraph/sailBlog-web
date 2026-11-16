-- Cover each visible-status range used by map requests and unoptimized worker reads.
CREATE INDEX `Datapoint_tripId_optimized_time_id_idx`
ON `Datapoint`(`tripId`, `optimized`, `time`, `id`);
