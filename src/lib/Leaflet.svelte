<script lang="ts">
  import L from 'leaflet';
  import 'leaflet/dist/leaflet.css';
  import 'leaflet.markercluster';
  import 'leaflet.markercluster/dist/MarkerCluster.css';
  import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
  import { onDestroy, onMount, setContext } from 'svelte';
  import errorStore from './errorStore';

  import { dark } from './darkMode.svelte';

  let mode = $state(localStorage.getItem('mode') || 'light');

  let map: L.Map | undefined = $state();
  let mapElement: HTMLDivElement = $state();
  let lines: L.Polyline[][] = $state([]);
  let tripImageLayer: L.LayerGroup | undefined = $state();
  let fullscreenImageSrc: string | null = $state(null);
  let fullscreenImageAlt: string = $state('Image');
  let mapMoved: Boolean = false;
  let myEvent: number = 0;
  let maxBounds: LatLngBounds;

  let recenterButtonStructure = L.Control.extend({
    options: {
      position: 'topleft'
    },
    onAdd: function () {
      var container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
      var button = L.DomUtil.create(
        'a',
        'leaflet-control-button material-symbols-outlined',
        container
      );
      button.ariaDisabled = 'false';
      button.ariaLabel = 'Center';
      button.href = '#';
      button.innerText = 'filter_center_focus';
      L.DomEvent.disableClickPropagation(button);
      L.DomEvent.on(button, 'click', function () {
        if (map?.getBounds().isValid()) {
          if (maxBounds.isValid()) {
            map?.fitBounds(maxBounds);
            mapMoved = false;
          }
        }
      });

      container.title = 'Recenter!';

      return container;
    },
    onRemove: function () {}
  });

  let recenterButton = new recenterButtonStructure();
  const IMAGE_GROUPING_DISTANCE_METERS = 1000;

  type TripImage = {
    id: string;
    username: string;
    lat?: unknown;
    long?: unknown;
    alt?: string | null;
  };

  function parseCoordinate(value: unknown): number | null {
    if (value == null) {
      return null;
    }

    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }

    if (typeof value === 'string') {
      const trimmedValue = value.trim();
      if (trimmedValue === '') {
        return null;
      }

      const coordinate = Number(trimmedValue);
      return Number.isFinite(coordinate) ? coordinate : null;
    }

    if (typeof value === 'object') {
      if ('toNumber' in value && typeof value.toNumber === 'function') {
        const coordinate = value.toNumber();
        return Number.isFinite(coordinate) ? coordinate : null;
      }

      if ('valueOf' in value && typeof value.valueOf === 'function') {
        const primitiveValue = value.valueOf();
        if (typeof primitiveValue === 'number' && Number.isFinite(primitiveValue)) {
          return primitiveValue;
        }
        if (typeof primitiveValue === 'string') {
          const coordinate = Number(primitiveValue);
          return Number.isFinite(coordinate) ? coordinate : null;
        }
      }

      if ('toString' in value && typeof value.toString === 'function') {
        const stringValue = value.toString().trim();
        if (stringValue !== '' && stringValue !== '[object Object]') {
          const coordinate = Number(stringValue);
          return Number.isFinite(coordinate) ? coordinate : null;
        }
      }
    }

    return null;
  }

  function getDistanceInMeters(
    fromLat: number,
    fromLong: number,
    toLat: number,
    toLong: number
  ): number {
    const toRadians = (value: number) => (value * Math.PI) / 180;
    const earthRadiusMeters = 6371000;
    const deltaLat = toRadians(toLat - fromLat);
    const deltaLong = toRadians(toLong - fromLong);
    const startLat = toRadians(fromLat);
    const endLat = toRadians(toLat);
    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(startLat) * Math.cos(endLat) * Math.sin(deltaLong / 2) * Math.sin(deltaLong / 2);

    return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function normalizeNearbyImageLocations(images: TripImage[]): TripImage[] {
    const clusters: { images: TripImage[]; lat: number; long: number }[] = [];

    for (const image of images) {
      const imageLat = parseCoordinate(image.lat);
      const imageLong = parseCoordinate(image.long);

      if (imageLat == null || imageLong == null) {
        continue;
      }

      const cluster = clusters.find(({ lat, long }) => {
        return (
          getDistanceInMeters(imageLat, imageLong, lat, long) <= IMAGE_GROUPING_DISTANCE_METERS
        );
      });

      if (cluster) {
        cluster.images.push(image);
        const total = cluster.images.length;
        cluster.lat = (cluster.lat * (total - 1) + imageLat) / total;
        cluster.long = (cluster.long * (total - 1) + imageLong) / total;
        continue;
      }

      clusters.push({
        images: [image],
        lat: imageLat,
        long: imageLong
      });
    }

    return clusters.flatMap((cluster) =>
      cluster.images.map((image) => ({
        ...image,
        lat: cluster.lat,
        long: cluster.long
      }))
    );
  }

  function createTripImageClusterGroup() {
    return (L as any).markerClusterGroup({
      chunkedLoading: true,
      showCoverageOnHover: false,
      maxClusterRadius: 80,
      disableClusteringAtZoom: 22,
      spiderfyOnMaxZoom: true,
      spiderfyDistanceMultiplier: 2.4,
      iconCreateFunction: (cluster: any) => {
        const count = cluster.getChildCount();
        return L.divIcon({
          className: 'trip-image-cluster',
          html: `<span>${count}</span>`,
          iconSize: [44, 44]
        });
      }
    });
  }

  onMount(() => {
    const mode = localStorage.getItem('mode') || 'light';
    document.documentElement.setAttribute('class', mode);
    map = L.map(mapElement);
    tripImageLayer = createTripImageClusterGroup();
    tripImageLayer.addTo(map);

    var osmLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      className: 'osm-layer'
    });

    var seamarkLayer = L.tileLayer('https://t1.openseamap.org/seamark/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openseamap.org/">OpenSeaMap</a>'
    });

    var controlLayer = L.control.scale();

    osmLayer.addTo(map);
    seamarkLayer.addTo(map);
    controlLayer.addTo(map);
    map.invalidateSize();
  });

  onDestroy(() => {
    map?.remove();
    map = undefined;
  });

  setContext('map', {
    getMap: () => map
  });

  interface Props {
    bounds?: L.LatLngBoundsExpression | undefined;
    view?: L.LatLngExpression | undefined;
    zoom?: number | undefined;
    tracks?: String[] | null;
    showTripImages?: boolean;
    children?: import('svelte').Snippet;
  }

  let {
    bounds = undefined,
    view = undefined,
    zoom = undefined,
    tracks = null,
    showTripImages = false,
    children
  }: Props = $props();

  onMount(() => {
    if (!bounds && (!view || !zoom)) {
      throw new Error('Must set either bounds, or view and zoom.');
    }
  });

  function onMouseDown(ev: {}) {
    mapMoved = true;
  }

  function onZoomStart(ev: {}) {
    if (myEvent > 0) {
      myEvent -= 1;
    } else {
      mapMoved = true;
    }
  }

  function onDrag(ev: {}) {
    mapMoved = true;
  }

  function getColorByPropulsion(propulsion: number): string {
    switch (propulsion) {
      case 0:
        // anchoring
        return '#4682B4';
      case 1:
        // motoring
        return '#FF6600';
      case 2:
        // sailing
        return '#2E8B57';
      default:
        return 'red'; // Fallback color
    }
  }

  async function onTracksChange(tracks: any[] | null) {
    if (!map) {
      return;
    }
    lines = []; // Reset the lines2D array
    clearTripImages();
    if (tracks != null) {
      recenterButton.addTo(map!);
      for (const trackId of tracks) {
        let tripLength = 0;
        let oldStartDate = 0;
        do {
          let tripData = await getTrip(trackId, oldStartDate);
          if (!tripData) {
            break;
          }
          tripLength = Object.keys(tripData).length;
          let trackLines: L.Polyline[] = [];
          let currentLine: L.LatLng[] = [];
          let currentPropulsion: number | null = null;

          for (const key of Object.keys(tripData)) {
            let point = new L.LatLng(tripData[key].lat, tripData[key].long);
            let propulsionType = tripData[key].propulsion;
            oldStartDate = new Date(tripData[key].time).getTime();

            if (currentPropulsion === null) {
              // First point
              currentPropulsion = propulsionType;
              currentLine.push(point);
            } else if (propulsionType === currentPropulsion) {
              // Same propulsion, continue current line
              currentLine.push(point);
            } else {
              // Propulsion type changed
              // Finish the current segment
              const color = getColorByPropulsion(currentPropulsion);
              let polyline = L.polyline(currentLine, { color });
              trackLines.push(polyline);

              // Start a new segment with the old line extending to the new point
              currentLine = [currentLine[currentLine.length - 1], point];
              currentPropulsion = propulsionType;
            }
          }

          // Push the last segment
          if (currentLine.length > 0) {
            const color = getColorByPropulsion(currentPropulsion!);
            let polyline = L.polyline(currentLine, { color });
            trackLines.push(polyline);
          }

          // Add the trackLines to the lines2D array
          lines = [...lines, trackLines];
        } while (tripLength >= 5000);
        if (showTripImages) {
          await addTripImages(trackId);
        }
      }
    } else {
      recenterButton.remove();
    }
  }

  function clearTripImages() {
    if (tripImageLayer) {
      tripImageLayer.clearLayers();
    }
  }

  function getTripImageLayer() {
    if (!tripImageLayer) {
      tripImageLayer = createTripImageClusterGroup();
      tripImageLayer.addTo(map!);
    }
    return tripImageLayer;
  }

  async function addTripImages(tripId: String) {
    let response = await fetch('/api/Media?tripId=' + tripId);
    if (!response.ok) {
      $errorStore = response;
      return;
    }
    let raw = await response.json();
    let images: TripImage[] = [];

    if (Array.isArray(raw)) {
      images = raw.map((item: any) => ({
        id: item.id,
        username: item.username,
        lat: item.lat,
        long: item.long,
        alt: item.alt
      }));
    } else {
      for (const id of Object.keys(raw)) {
        const item = raw[id];
        images.push({
          id,
          username: item.username,
          lat: item.lat,
          long: item.long,
          alt: item.alt
        });
      }
    }

    const layer = getTripImageLayer();
    for (const image of normalizeNearbyImageLocations(images)) {
      const imageLat = parseCoordinate(image.lat);
      const imageLong = parseCoordinate(image.long);
      if (imageLat == null || imageLong == null) {
        continue;
      }
      const altText = image.alt ?? 'Image';
      const imageUrl = `/api/Media/${image.username}/${image.id}.avif`;
      const thumbHtml = `<div class="trip-image-thumb-wrap" role="img" aria-label="${altText}" style="background-image:url('${imageUrl}')"></div>`;
      const latLng = L.latLng(imageLat, imageLong);
      if (!Number.isFinite(latLng.lat) || !Number.isFinite(latLng.lng)) {
        continue;
      }

      const marker = L.marker(latLng, {
        icon: L.divIcon({
          className: 'image-marker trip-image-marker',
          html: thumbHtml,
          iconSize: [72, 72],
          iconAnchor: [36, 36]
        })
      });
      marker.on('click', () => {
        fullscreenImageSrc = `/api/Media/${image.username}/${image.id}.avif`;
        fullscreenImageAlt = altText;
      });
      marker.addTo(layer);
    }
  }

  function onLineChange(lines2D: L.Polyline[][]) {
    if (lines2D.length != 0) {
      if (lines2D[0].length != 0) {
        maxBounds = lines2D[0][0].getBounds();
        lines2D.forEach((trackLines) => {
          trackLines.forEach((line) => {
            line.remove();
            line.addTo(map!);
            maxBounds.extend(line.getBounds());
          });
        });
        if (map?.getBounds().isValid() && !mapMoved) {
          if (maxBounds.isValid()) {
            myEvent += 1;
            map?.fitBounds(maxBounds);
          }
        }
      }
    }
  }

  async function getTrip(tripId: String, startDate?: Number) {
    if (startDate == null) {
      startDate = 0;
    }
    let response = await fetch(
      '/api/Datapoints?tripId=' + tripId + '&start=' + startDate + '&amount=5000'
    );
    if (!response.ok) {
      $errorStore = response;
      return;
    }
    return await response.json();
  }
  $effect(() => {
    if (map) {
      if (bounds) {
        map.fitBounds(bounds);
      } else if (view && zoom) {
        map.setView(view, zoom);
      }
      map?.dragging.enable();
      map?.on('mousedown', onMouseDown);
      map?.on('zoomstart', onZoomStart);
      map?.on('dragstart', onDrag);
    }
  });
  $effect(() => {
    onLineChange(lines);
  });
  $effect(() => {
    if (!map) {
      return;
    }
    tracks;
    showTripImages;
    onTracksChange(tracks);
  });
</script>

<div class="w-full h-full rounded-3xl" bind:this={mapElement}>
  {#if map}
    {@render children?.()}
  {/if}
</div>

{#if fullscreenImageSrc}
  <div
    class="fixed inset-0 z-[1100] bg-black/90 flex items-center justify-center p-4"
    role="button"
    tabindex="0"
    aria-label="Close image preview"
    onclick={() => {
      fullscreenImageSrc = null;
    }}
    onkeydown={(event) => {
      if (event.key === 'Escape') fullscreenImageSrc = null;
    }}
  >
    <img
      src={fullscreenImageSrc}
      alt={fullscreenImageAlt}
      class="max-w-[96vw] max-h-[92vh] object-contain rounded-lg"
    />
    <button
      type="button"
      class="absolute top-4 right-4 btn preset-tonal-secondary border border-secondary-500"
      onclick={(event) => {
        event.stopPropagation();
        fullscreenImageSrc = null;
      }}
    >
      Close
    </button>
  </div>
{/if}

{#if dark.mode}
  <style lang="">
    .osm-layer,
    .leaflet-control-zoom-in,
    .leaflet-control-zoom-out,
    .leaflet-control-button,
    .leaflet-control-scale,
    .leaflet-control-attribution {
      filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%);
    }
  </style>
{/if}

<style lang="css">
  :global(.trip-image-cluster) {
    border-radius: 9999px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 0.9rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.28);
    border: 2px solid var(--color-surface-700);
    opacity: 1 !important;
    background: var(--color-secondary-700) !important;
    color: #ffffff;
  }

  :global(.leaflet-marker-icon.trip-image-cluster) {
    background: var(--color-secondary-700) !important;
    border: 2px solid var(--color-surface-700) !important;
    backdrop-filter: none !important;
    filter: none !important;
  }

  :global(.leaflet-marker-icon.trip-image-cluster div) {
    background: transparent !important;
    border: 0 !important;
    backdrop-filter: none !important;
    filter: none !important;
    opacity: 1 !important;
  }

  :global(.trip-image-cluster span) {
    display: inline-flex;
    width: 100%;
    height: 100%;
    align-items: center;
    justify-content: center;
    background: transparent !important;
    opacity: 1 !important;
  }

  :global(.trip-image-marker) {
    background: transparent !important;
    border: 0 !important;
    opacity: 1 !important;
  }

  :global(.trip-image-thumb-wrap) {
    width: 72px;
    height: 72px;
    border-radius: 10px;
    overflow: hidden;
    border: 2px solid var(--color-secondary-700) !important;
    background-color: var(--color-surface-700) !important;
    background-size: cover;
    background-position: center center;
    background-repeat: no-repeat;
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.4);
    opacity: 1 !important;
  }
</style>
