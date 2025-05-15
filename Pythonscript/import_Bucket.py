#!/usr/bin/env python3
"""
Skript som kun importerer Polygon og MultiPolygon geometrier
- Hopper over Point-geometrier
- Håndterer duplikater korrekt
"""
import requests
import geopandas as gpd
import pandas as pd
from sqlalchemy import create_engine, text
import tempfile
import os

# OPPDATER DISSE!
SUPABASE_URL = "https://emefguxbwcvfxaiywmri.supabase.co"  
DATABASE_URL = "postgresql://postgres:iyrhnrP7ni8DVAU1@db.emefguxbwcvfxaiywmri.supabase.co:5432/postgres"

def import_flood_data():
    engine = create_engine(DATABASE_URL)
    
    print("Tester database-tilkobling...")
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version();"))
            print("✓ Database tilkoblet")
    except Exception as e:
        print(f"Feil: {e}")
        return
    
    # Slett og opprett tabell på nytt for å unngå alle problemer
    print("Sletter og oppretter tabell på nytt...")
    with engine.connect() as conn:
        # Slett eksisterende tabell
        conn.execute(text("DROP TABLE IF EXISTS osm_buildings_flood"))
        
        # Opprett ny tabell for KUN POLYGONER
        conn.execute(text("""
            CREATE TABLE osm_buildings_flood (
                id BIGINT,
                element VARCHAR(20),
                geometry GEOMETRY(POLYGON, 4326) NOT NULL,  -- KUN POLYGON
                flood_period INTEGER NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                CONSTRAINT osm_buildings_flood_pkey PRIMARY KEY (id, flood_period)
            )
        """))
        
        # Opprett indekser
        conn.execute(text("CREATE INDEX idx_buildings_geom ON osm_buildings_flood USING GIST (geometry)"))
        conn.execute(text("CREATE INDEX idx_buildings_flood_period ON osm_buildings_flood (flood_period)"))
        
        conn.commit()
        print("✓ Tabell opprettet (kun for Polygoner)")
    
    periods = [10, 20, 50, 100, 200, 500, 1000]
    bbox_hash = "fdd7a59a"
    
    for period in periods:
        print(f"\nImporterer {period}-årsflom...")
        
        url = f"{SUPABASE_URL}/storage/v1/object/public/flombyggninger/osm_buildings_flood_{period}yr_{bbox_hash}.geojson"
        
        response = requests.get(url)
        if response.status_code == 200:
            print(f"  Lastet ned {len(response.content)/1024/1024:.1f} MB")
            
            with tempfile.NamedTemporaryFile(mode='w', suffix='.geojson', delete=False, encoding='utf-8') as f:
                f.write(response.text)
                temp_path = f.name
            
            try:
                # Les fil
                gdf = gpd.read_file(temp_path)
                print(f"  Leste {len(gdf)} features")
                
                # Sett CRS hvis mangler
                if gdf.crs is None:
                    gdf.crs = "EPSG:4326"
                
                # VIKTIG: Filtrer ut kun Polygoner og MultiPolygoner
                initial_count = len(gdf)
                if 'geometry' in gdf.columns:
                    # Sjekk geometri-typer
                    geom_types = gdf.geometry.geom_type.value_counts()
                    print(f"  Geometri-typer funnet: {dict(geom_types)}")
                    
                    # Behold kun Polygoner og MultiPolygoner
                    gdf = gdf[gdf.geometry.geom_type.isin(['Polygon', 'MultiPolygon'])]
                    print(f"  Filtrerte: {initial_count} → {len(gdf)} (kun Polygoner)")
                else:
                    print("  ADVARSEL: Ingen geometri-kolonne funnet!")
                    continue
                
                # Fjern duplikater INNENFOR filen
                duplicate_count = len(gdf)
                gdf = gdf.drop_duplicates(subset=['id'])
                if duplicate_count > len(gdf):
                    print(f"  Fjernet {duplicate_count - len(gdf)} duplikater i filen")
                
                # Legg til flood_period
                gdf['flood_period'] = period
                
                # Sjekk ID kolonne
                if 'id' not in gdf.columns:
                    print("  Genererer ID...")
                    gdf.reset_index(inplace=True)
                    gdf['id'] = gdf.index + (period * 1000000)
                
                # Sjekk element
                if 'element' not in gdf.columns:
                    gdf['element'] = 'unknown'
                
                # Fix ID type
                gdf['id'] = pd.to_numeric(gdf['id'], errors='coerce').fillna(0).astype(int)
                gdf = gdf[gdf['id'] != 0]
                
                # Keep only needed columns
                gdf = gdf[['id', 'element', 'geometry', 'flood_period']]
                
                if len(gdf) == 0:
                    print(f"  ADVARSEL: Ingen gyldig polygondata for {period}-årsflom!")
                    continue
                
                print(f"  Importerer {len(gdf)} polygoner...")
                
                # Importere i batches
                batch_size = 2000
                total_imported = 0
                
                for i in range(0, len(gdf), batch_size):
                    batch = gdf.iloc[i:i+batch_size].copy()
                    
                    # Sett CRS for batch
                    if batch.crs is None:
                        batch.crs = "EPSG:4326"
                    
                    try:
                        # Double-check at alle geometrier er polygoner før import
                        batch = batch[batch.geometry.geom_type.isin(['Polygon', 'MultiPolygon'])]
                        
                        if len(batch) > 0:
                            batch.to_postgis('osm_buildings_flood', engine, if_exists='append', index=False)
                            total_imported += len(batch)
                            print(f"  ✓ Batch {i//batch_size + 1}/{(len(gdf)-1)//batch_size + 1} - {total_imported} importert")
                        else:
                            print(f"  ! Batch {i//batch_size + 1} hoppet over (ingen polygoner)")
                    except Exception as e:
                        if "duplicate key" in str(e):
                            print(f"  Hopper over batch {i//batch_size + 1} pga duplikater")
                        else:
                            print(f"  Feil i batch {i//batch_size + 1}: {e}")
                
                print(f"  ✓ Importert {total_imported} polygoner av {len(gdf)} features")
                
            except Exception as e:
                print(f"  FEIL for {period}: {e}")
                import traceback
                traceback.print_exc()
            finally:
                if os.path.exists(temp_path):
                    os.unlink(temp_path)
        else:
            print(f"  Kunne ikke laste ned: {response.status_code}")
    
    # Aktsomhet med samme behandling
    print(f"\nImporterer aktsomhet...")
    all_aktsomhet = []
    
    for i in range(1, 5):
        print(f"  Del {i}/4...")
        url = f"{SUPABASE_URL}/storage/v1/object/public/flombyggninger/osm_buildings_flood_aktsomhetyr_{bbox_hash}_part{i}of4.geojson"
        
        response = requests.get(url)
        if response.status_code == 200:
            with tempfile.NamedTemporaryFile(mode='w', suffix='.geojson', delete=False, encoding='utf-8') as f:
                f.write(response.text)
                temp_path = f.name
            
            try:
                gdf = gpd.read_file(temp_path)
                
                if gdf.crs is None:
                    gdf.crs = "EPSG:4326"
                
                # Filtrer kun Polygoner for aktsomhet også
                initial_count = len(gdf)
                gdf = gdf[gdf.geometry.geom_type.isin(['Polygon', 'MultiPolygon'])]
                print(f"    Filtrerte: {initial_count} → {len(gdf)} polygoner")
                
                # Fjern duplikater innen denne delen
                gdf = gdf.drop_duplicates(subset=['id'])
                
                if 'id' not in gdf.columns:
                    gdf.reset_index(inplace=True)
                    gdf['id'] = gdf.index + (i * 1000000)
                
                if 'element' not in gdf.columns:
                    gdf['element'] = 'unknown'
                
                gdf['flood_period'] = -1
                gdf['id'] = pd.to_numeric(gdf['id'], errors='coerce').fillna(0).astype(int)
                gdf = gdf[gdf['id'] != 0]
                gdf = gdf[['id', 'element', 'geometry', 'flood_period']]
                
                all_aktsomhet.append(gdf)
                print(f"    ✓ {len(gdf)} polygoner")
                
            except Exception as e:
                print(f"    Feil: {e}")
            finally:
                if os.path.exists(temp_path):
                    os.unlink(temp_path)
    
    if all_aktsomhet:
        combined = pd.concat(all_aktsomhet, ignore_index=True)
        
        # Fjern duplikater på tvers av alle deler
        initial = len(combined)
        combined = combined.drop_duplicates(subset=['id'])
        print(f"  Fjernet {initial - len(combined)} duplikater")
        
        # Final check for Polygons only
        combined = combined[combined.geometry.geom_type.isin(['Polygon', 'MultiPolygon'])]
        
        if combined.crs is None:
            combined.crs = "EPSG:4326"
        
        print(f"  Importerer {len(combined)} aktsomhet-polygoner...")
        
        batch_size = 2000
        total_imported = 0
        
        for i in range(0, len(combined), batch_size):
            batch = combined.iloc[i:i+batch_size]
            if batch.crs is None:
                batch.crs = "EPSG:4326"
            
            try:
                batch.to_postgis('osm_buildings_flood', engine, if_exists='append', index=False)
                total_imported += len(batch)
                print(f"    ✓ {total_imported}/{len(combined)}")
            except Exception as e:
                if "duplicate key" not in str(e):
                    print(f"    Feil: {e}")
    
    print("\n✓ Import fullført!")
    
    # Statistikk
    with engine.connect() as conn:
        result = conn.execute(text("""
            SELECT flood_period, COUNT(*) as antall, COUNT(DISTINCT id) as unike
            FROM osm_buildings_flood 
            GROUP BY flood_period 
            ORDER BY flood_period
        """))
        print("\nResultat (kun Polygoner):")
        for row in result:
            period_name = "aktsomhet" if row[0] == -1 else f"{row[0]}-år"
            print(f"  {period_name}: {row[1]:,} rader ({row[2]:,} unike bygninger)")
        
        # Vis geometri-typer i databasen for bekreftelse
        result = conn.execute(text("""
            SELECT ST_GeometryType(geometry) as geom_type, COUNT(*) as antall
            FROM osm_buildings_flood 
            GROUP BY ST_GeometryType(geometry)
        """))
        print("\nGemetri-typer i database:")
        for row in result:
            print(f"  {row[0]}: {row[1]:,}")

if __name__ == "__main__":
    import_flood_data()