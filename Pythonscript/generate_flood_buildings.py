#!/usr/bin/env python3
"""
OSM‑BYGNING × NVE FLOMSONER OG AKTSOMHETSOMRÅDER – Optimized version
-------------------------------------------------
- Skips retries for empty areas with no buildings
- Fixed timeout parameters
- Process buildings in small batches to avoid memory issues
- Enhanced with robust connection handling and error recovery
"""
from __future__ import annotations
import osmnx as ox, geopandas as gpd, pandas as pd, numpy as np
import requests, time, sys, warnings, argparse, json, hashlib, os, gc, random
from pathlib import Path
from shapely.errors import ShapelyDeprecationWarning
warnings.filterwarnings("ignore", category=ShapelyDeprecationWarning)

# ---------------- Arg‑parsing ----------------
parser = argparse.ArgumentParser(description="OSM‑bygning × NVE‑flom")
parser.add_argument("--bbox", nargs=4, type=float, metavar=("S","W","N","E"),
                    help="Latitude/longitude box: south west north east")
parser.add_argument("--step", type=float, default=0.5,
                    help="Chunk‑størrelse i grader (default 0.5)")
parser.add_argument("--resume", action="store_true", 
                    help="Fortsett fra tidligere kjøring")
parser.add_argument("--start-region", type=int, default=0,
                    help="Start fra spesifikk region (0-basert indeks)")
parser.add_argument("--start-chunk", type=str, default=None,
                    help="Start fra spesifikk chunk (format: x.x_y.y)")
args = parser.parse_args()

# ---------------- Konfigurasjon --------------
# BBOX for hele Norge (57.5N til 71.5N, 4E til 32E) - or use smaller area for testing
NORWAY_BBOX = (57.5, 4.0, 71.5, 32.0)
BBOX = tuple(args.bbox) if args.bbox else NORWAY_BBOX
STEP_DEG = args.step
OUTDIR = Path("data_osm_norge"); OUTDIR.mkdir(exist_ok=True)
SRS = "EPSG:25833"
MAX_RETRIES = 5  # Maksimalt antall forsøk ved nettverksfeil

# Fix timeout parameters to avoid conflicts
ox.settings.overpass_settings = "[out:json][timeout:180]"  # 3 minutes timeout
ox.settings.requests_kwargs = {}  # Remove timeout from here, it's set in the Overpass settings

# Create a state file to track progress
STATE_FILE = OUTDIR / "processing_state.json"

# Region info - divide Norway into smaller regions
def get_norway_regions():
    if args.bbox:
        # If user supplied a custom bbox, use it as a single region
        return [BBOX]
    
    # Split Norway into smaller regions for memory management and using mostly land areas
    regions = [
        # Southern Norway (more densely populated)
        (57.5, 4.0, 60.0, 8.0),    # Southwest Norway (around Stavanger)
        (57.5, 8.0, 60.0, 12.0),   # South Norway (around Kristiansand)
        (60.0, 4.0, 62.5, 8.0),    # Western Norway (around Bergen)
        (60.0, 8.0, 62.5, 12.0),   # Eastern Norway (around Oslo)
        (60.0, 12.0, 62.5, 16.0),  # Eastern Norway border areas
        
        # Central Norway
        (62.5, 4.0, 65.0, 10.0),   # Central Norway (around Trondheim)
        (62.5, 10.0, 65.0, 16.0),  # Central/Eastern Norway
        (62.5, 16.0, 65.0, 22.0),  # Sweden border areas
        
        # Northern Norway
        (65.0, 10.0, 68.0, 16.0),  # Northern Norway (around Bodø)
        (65.0, 16.0, 68.0, 22.0),  # Northern Norway/Sweden border
        (68.0, 14.0, 71.5, 22.0),  # Far North (around Tromsø)
        (68.0, 22.0, 71.5, 32.0),  # Far Northeast (Finnmark/Russia border)
    ]
    
    return regions

# Get regions to process
regions = get_norway_regions()
print(f"Prosesserer Norge i {len(regions)} regioner")

# Load or initialize state
def load_or_init_state():
    if os.path.exists(STATE_FILE) and args.resume:
        with open(STATE_FILE, 'r') as f:
            state = json.load(f)
            print(f"Fortsetter fra tidligere kjøring - region {state['current_region']}, chunk {state.get('current_chunk', 'N/A')}")
            return state
    else:
        # Start from beginning or specified point
        return {
            'current_region': args.start_region,
            'processed_regions': [],
            'processed_chunks': {},
            'start_time': time.time()
        }

# Update and save state
def update_state(state, region_idx=None, chunk_id=None, completed_chunk=False):
    if region_idx is not None:
        state['current_region'] = region_idx
    
    if chunk_id is not None:
        state['current_chunk'] = chunk_id
        
        # Track processed chunks
        if completed_chunk:
            if str(region_idx) not in state['processed_chunks']:
                state['processed_chunks'][str(region_idx)] = []
            if chunk_id not in state['processed_chunks'][str(region_idx)]:
                state['processed_chunks'][str(region_idx)].append(chunk_id)
    
    # Save state
    with open(STATE_FILE, 'w') as f:
        json.dump(state, f)

# ---------------- Flomsone shapefiler ----------------
def load_flood_zones():
    """Load all flood zone shapefiles into memory"""
    shapefile_paths = {
        "10": "Flomsone_10Aar.shp",
        "20": "Flomsone_20Aar.shp", 
        "50": "Flomsone_50Aar.shp",
        "100": "Flomsone_100Aar.shp",
        "200": "Flomsone_200Aar.shp",
        "500": "Flomsone_500Aar.shp",
        "1000": "Flomsone_1000Aar.shp",
        "aktsomhet": "Flom_AktsomhetOmr.shp"
    }
    
    flood_zones = {}
    for period, filename in shapefile_paths.items():
        shapefile_path = Path(filename)
        if shapefile_path.exists():
            print(f"Laster shapefil for {period}...")
            try:
                os.environ['SHAPE_RESTORE_SHX'] = 'YES'
                flom = gpd.read_file(shapefile_path)
                
                if flom.crs is None:
                    print(f"  Shapefilen mangler koordinatsystem. Antar EPSG:25833...")
                    flom.crs = "EPSG:25833"
                elif flom.crs != SRS:
                    print(f"  Reprojiserer fra {flom.crs} til {SRS}")
                    flom = flom.to_crs(SRS)
                
                flood_zones[period] = flom
                print(f"  Lastet {len(flom)} flompolygoner for {period}-årsflom")
            except Exception as e:
                print(f"  Feil ved lasting av {period}-shapefil: {e}")
        else:
            print(f"Shapefil for {period} finnes ikke: {filename}")
    
    return flood_zones

# ------------------ Prosesser et chunk direkte med alle flomsoner -------------
def process_chunk_against_floodzones(buildings_chunk, flood_zones, region_hash, chunk_id):
    """Process a single chunk of buildings against all flood zones directly"""
    # Dictionary to hold results for each flood period
    flood_buildings = {period: [] for period in flood_zones.keys()}
    
    # Check each flood zone
    for period, flom in flood_zones.items():
        print(f"  Sjekker chunk {chunk_id} mot {period}-årsflom...")
        try:
            # Do spatial join for this flood type
            traf = gpd.sjoin(buildings_chunk, flom[["geometry"]], predicate="intersects")
            if not traf.empty:
                # Keep only essential columns
                essential_columns = ['osm_id', 'geometry']
                columns_to_keep = [col for col in essential_columns if col in traf.columns]
                traf = traf[columns_to_keep]
                
                # Simplify geometry to save space
                traf['geometry'] = traf['geometry'].simplify(0.5)
                
                # Reproject to WGS84
                traf = traf.to_crs("EPSG:4326")
                
                # Add to results
                flood_buildings[period].append(traf)
                print(f"    Fant {len(traf)} bygninger i {period}-årsflom")
            else:
                print(f"    Ingen bygninger i {period}-årsflom for denne chunken")
        except Exception as e:
            print(f"    Feil ved sjekk av {period}-årsflom: {e}")
    
    # Save results directly for this chunk
    for period, frames in flood_buildings.items():
        if frames:
            try:
                # Save directly to file for this chunk - no need to keep in memory
                chunk_file = OUTDIR / f"chunk_{chunk_id}_{period}_{region_hash}.geojson"
                if len(frames) > 1:
                    combined = pd.concat(frames, ignore_index=True)
                else:
                    combined = frames[0]
                
                # Remove duplicates
                if 'osm_id' in combined.columns:
                    before = len(combined)
                    combined = combined.drop_duplicates(subset=['osm_id'])
                    if before > len(combined):
                        print(f"    Fjernet {before - len(combined)} duplikater for {period}")
                
                combined.to_file(chunk_file, driver="GeoJSON")
                print(f"    Lagret {len(combined)} bygninger for {period} i {chunk_file.name}")
            except Exception as e:
                print(f"    Feil ved lagring av {period}-resultat: {e}")
    
    # Clear memory
    flood_buildings.clear()
    gc.collect()

# ------------------ Robust Overpass API handling -------------
def fetch_osm_with_retry(n, s, e, w):
    """Fetch buildings with robust error handling and retries"""
    bbox = (w, s, e, n)
    
    # Define backup Overpass endpoints
    endpoints = [
        "https://overpass-api.de/api/interpreter",
        "https://overpass.kumi.systems/api/interpreter"
    ]
    
    # Store the original endpoint to restore it later
    original_endpoint = ox.settings.overpass_endpoint if hasattr(ox.settings, 'overpass_endpoint') else None
    
    for attempt in range(MAX_RETRIES):
        try:
            # Vary the delay between attempts
            if attempt > 0:
                # Exponential backoff with jitter
                delay = (2 ** attempt) + random.uniform(0, 1)
                print(f"  Forsøk {attempt+1}/{MAX_RETRIES} - venter {delay:.1f} sekunder...")
                time.sleep(delay)
            
            # Try using different Overpass API endpoints if we have connection issues
            if attempt > 0 and len(endpoints) > 0:
                # Switch between different Overpass API endpoints
                endpoint_idx = (attempt - 1) % len(endpoints)
                endpoint = endpoints[endpoint_idx]
                print(f"  Prøver alternativ Overpass API: {endpoint}")
                
                # Temporarily set the endpoint
                ox.settings.overpass_endpoint = endpoint
            
            # Make the actual request with a custom timeout
            result = ox.features_from_bbox(bbox=bbox, tags={"building": True})
            
            # Restore original endpoint
            if original_endpoint is not None:
                ox.settings.overpass_endpoint = original_endpoint
                
            return result
            
        except ox._errors.InsufficientResponseError as e:
            error_msg = str(e)
            print(f"  Feil ved henting av data (InsufficientResponseError): {error_msg}")
            
            # If the error indicates "No matching features" - this is an empty area, no need to retry
            if "No matching features" in error_msg:
                print("  Ingen bygninger funnet i dette området. Hopper over retries.")
                break  # Exit the retry loop immediately
            
            # Otherwise continue with retry loop
            
        except Exception as e:
            error_type = type(e).__name__
            error_msg = str(e)
            print(f"  Feil ved henting av data ({error_type}): {error_msg}")
            
            # Continue with the retry loop
            
    # If we've exhausted all retries or found no buildings
    print(f"  Returnerer tom frame for chunk.")
    
    # Restore original endpoint
    if original_endpoint is not None:
        ox.settings.overpass_endpoint = original_endpoint
        
    return gpd.GeoDataFrame(columns=["geometry"], geometry="geometry", crs="EPSG:4326")

# ------------------ Hovedfunksjon for å prosessere en region -------------
def process_region(region, region_index, flood_zones, state):
    s, w, n, e = region
    region_name = f"Region {region_index+1} ({s:.1f},{w:.1f} til {n:.1f},{e:.1f})"
    print(f"\n===== Prosesserer {region_name} =====")
    
    # unikt hash for regionen
    region_hash = hashlib.md5(json.dumps(region).encode()).hexdigest()[:8]
    
    # Generate chunks for this region
    lat_vals = np.arange(s, n, STEP_DEG)
    lon_vals = np.arange(w, e, STEP_DEG)
    total_chunks = len(lat_vals) * len(lon_vals)
    chunk_count = 0
    
    # Check if we should skip chunks based on state
    processed_chunks = state.get('processed_chunks', {}).get(str(region_index), [])
    start_chunk = args.start_chunk if args.start_chunk and region_index == args.start_region else None
    started = start_chunk is None  # If no start_chunk specified, we've already started
    
    # Process each chunk
    for y0 in lat_vals:
        for x0 in lon_vals:
            chunk_id = f"{x0:.1f}_{y0:.1f}"
            chunk_count += 1
            
            # Skip already processed chunks or if we haven't reached the starting chunk
            if chunk_id in processed_chunks:
                print(f"Hopper over allerede prosessert chunk {chunk_count}/{total_chunks}: {chunk_id}")
                continue
            
            # If we have a start chunk and haven't reached it yet
            if not started and start_chunk != chunk_id:
                print(f"Hopper over chunk {chunk_count}/{total_chunks}: {chunk_id} (før startpunkt)")
                continue
            else:
                started = True  # Once we've reached the start chunk, process all subsequent chunks
            
            print(f"Prosesserer chunk {chunk_count}/{total_chunks}: {chunk_id}")
            update_state(state, region_index, chunk_id)
            
            # Calculate boundary coordinates - don't exceed region bounds
            y1 = min(y0 + STEP_DEG, n)
            x1 = min(x0 + STEP_DEG, e)
            
            # Fetch buildings with robust retry mechanism
            buildings = fetch_osm_with_retry(y1, y0, x1, x0)
            
            if not buildings.empty:
                print(f"  Hentet {len(buildings)} bygninger")
                
                # Convert to UTM for spatial operations
                buildings_utm = buildings.to_crs(SRS)
                
                # Process this chunk directly against flood zones
                process_chunk_against_floodzones(buildings_utm, flood_zones, region_hash, chunk_id)
                
                # Clear memory
                del buildings
                del buildings_utm
                gc.collect()
            else:
                print(f"  Ingen bygninger funnet i denne chunken")
            
            # Mark this chunk as completed
            update_state(state, region_index, chunk_id, completed_chunk=True)
            
            # Short pause between chunks to be nice to the server
            time.sleep(1)
    
    return region_hash

# ------------------ Funksjon for å slå sammen chunk-resultater -------------
def merge_chunk_results():
    print("\n===== Slår sammen chunk-resultater =====")
    
    # Generate hash for whole Norway
    norway_hash = hashlib.md5(json.dumps(BBOX).encode()).hexdigest()[:8]
    
    # For each flood period, find and merge all chunk files
    for period in ["10", "20", "50", "100", "200", "500", "1000", "aktsomhet"]:
        # Find all chunk files for this period
        chunk_files = list(OUTDIR.glob(f"chunk_*_{period}_*.geojson"))
        
        if not chunk_files:
            print(f"Ingen chunk-filer funnet for {period}")
            continue
            
        print(f"Slår sammen {len(chunk_files)} chunk-filer for {period}...")
        
        # Process files in smaller batches to save memory
        batch_size = 20  # Process 20 files at a time
        total_buildings = 0
        
        # Final output file
        output_file = OUTDIR / f"osm_buildings_flood_{period}yr_{norway_hash}.geojson"
        first_batch = True
        
        # Process chunks in batches
        for i in range(0, len(chunk_files), batch_size):
            batch_files = chunk_files[i:i+batch_size]
            print(f"  Prosesserer batch {i//batch_size + 1}/{(len(chunk_files)-1)//batch_size + 1} ({len(batch_files)} filer)...")
            
            # Read this batch of files
            frames = []
            for file in batch_files:
                try:
                    gdf = gpd.read_file(file)
                    if not gdf.empty:
                        frames.append(gdf)
                        print(f"    Leste {len(gdf)} bygninger fra {file.name}")
                except Exception as e:
                    print(f"    Feil ved lesing av {file.name}: {e}")
            
            if not frames:
                print("    Ingen data i denne batchen")
                continue
                
            # Combine frames from this batch
            try:
                combined = pd.concat(frames, ignore_index=True)
                
                # Remove duplicates
                if 'osm_id' in combined.columns:
                    before_count = len(combined)
                    combined = combined.drop_duplicates(subset=['osm_id'])
                    print(f"    Fjernet {before_count - len(combined)} duplikater")
                
                # Add to total count
                total_buildings += len(combined)
                
                # Save to final file - append mode for all but first batch
                if first_batch:
                    combined.to_file(output_file, driver="GeoJSON")
                    first_batch = False
                else:
                    # For subsequent batches, read existing file, append, and save again
                    try:
                        existing = gpd.read_file(output_file)
                        updated = pd.concat([existing, combined], ignore_index=True)
                        
                        # Final deduplication
                        if 'osm_id' in updated.columns:
                            before_final = len(updated)
                            updated = updated.drop_duplicates(subset=['osm_id'])
                            if before_final > len(updated):
                                print(f"    Fjernet {before_final - len(updated)} duplikater ved sammenslåing")
                        
                        updated.to_file(output_file, driver="GeoJSON")
                    except Exception as e:
                        print(f"    Feil ved sammenslåing med eksisterende fil: {e}")
                        # If error, try saving as separate file
                        combined.to_file(OUTDIR / f"osm_buildings_flood_{period}yr_batch{i//batch_size + 1}_{norway_hash}.geojson", driver="GeoJSON")
            except Exception as e:
                print(f"    Feil ved sammenslåing av batch: {e}")
            
            # Clear memory
            frames.clear()
            gc.collect()
            
            # Delete processed chunk files after successful merge
            for file in batch_files:
                try:
                    os.remove(file)
                except Exception as e:
                    print(f"    Kunne ikke slette {file.name}: {e}")
        
        # Report total buildings for this period
        if os.path.exists(output_file):
            file_size_mb = output_file.stat().st_size / (1024 * 1024)
            print(f"✅ Lagret {total_buildings} bygninger for {period}-årsflom til {output_file.name} ({file_size_mb:.2f} MB)")
    
    # Create info file
    info_file = OUTDIR / f"norge_flood_info_{norway_hash}.json"
    with open(info_file, 'w') as f:
        json.dump({
            "bbox": BBOX,
            "bbox_hash": norway_hash,
            "processing_date": time.strftime("%Y-%m-%d %H:%M:%S")
        }, f)
    
    print(f"✅ Lagret informasjonsfil: {info_file.name}")

# ------------------ Hovedprosessering -------------
print("Laster flomsoner...")
flood_zones = load_flood_zones()

# Load or initialize state
state = load_or_init_state()
start_region = state['current_region']

# Process each region from the current state
region_hashes = []
try:
    for i, region in enumerate(regions[start_region:], start=start_region):
        region_hash = process_region(region, i, flood_zones, state)
        if region_hash:
            region_hashes.append(region_hash)
            state['processed_regions'].append(i)
            update_state(state, i+1)  # Update to next region
        
        # Clear memory between regions
        gc.collect()
except KeyboardInterrupt:
    print("\n\nProsessering avbrutt av bruker. Fremgangen er lagret.")
    print(f"Du kan fortsette senere med: python {sys.argv[0]} --resume")
    sys.exit(1)
except Exception as e:
    print(f"\n\nFeil under prosessering: {e}")
    print(f"Fremgangen er lagret. Du kan fortsette senere med: python {sys.argv[0]} --resume")
    raise

# Merge results from all chunks
merge_chunk_results()

# Clean up state file after successful completion
if os.path.exists(STATE_FILE):
    os.remove(STATE_FILE)

print("\nProsessering fullført!")
print(f"Resultatfiler finnes i: {OUTDIR.resolve()}")