#!/usr/bin/env python3
"""
GeoJSON Splitter for Large Flood Building Files
----------------------------------------------
Script to split large GeoJSON files (>45MB) into smaller chunks
for easier management and loading in web applications.

Usage:
  python split_large_geojson.py --file path/to/large/file.geojson --max-size 45
"""
import os
import sys
import json
import math
import argparse
import geopandas as gpd
from pathlib import Path

def parse_args():
    parser = argparse.ArgumentParser(description="Split large GeoJSON files into smaller chunks")
    parser.add_argument("--file", type=str, required=True, help="Path to the large GeoJSON file")
    parser.add_argument("--max-size", type=int, default=45, 
                      help="Maximum file size in MB for each chunk (default: 45)")
    parser.add_argument("--outdir", type=str, default=None,
                      help="Output directory (default: same as input file)")
    return parser.parse_args()

def get_file_size_mb(file_path):
    """Get file size in megabytes"""
    return os.path.getsize(file_path) / (1024 * 1024)

def estimate_features_per_chunk(file_size_mb, feature_count, max_size_mb):
    """Estimate how many features should go in each chunk"""
    if file_size_mb <= max_size_mb:
        return feature_count  # No need to split
    
    # Calculate features per chunk + add 10% margin for safety
    avg_feature_size_mb = file_size_mb / feature_count
    features_per_chunk = int(max_size_mb / avg_feature_size_mb * 0.9)
    
    # Ensure at least 1 feature per chunk
    return max(1, features_per_chunk)

def split_geojson(file_path, max_size_mb, outdir=None):
    """Split a large GeoJSON file into smaller chunks"""
    # Set output directory
    if outdir:
        output_dir = Path(outdir)
    else:
        output_dir = Path(file_path).parent
    
    output_dir.mkdir(exist_ok=True)
    
    # Get base filename without extension
    base_name = Path(file_path).stem
    
    print(f"Processing: {file_path}")
    file_size = get_file_size_mb(file_path)
    print(f"File size: {file_size:.2f} MB")
    
    if file_size <= max_size_mb:
        print(f"File is already smaller than {max_size_mb}MB. No need to split.")
        return
    
    # Read the GeoJSON file
    print("Reading GeoJSON file...")
    try:
        gdf = gpd.read_file(file_path)
    except Exception as e:
        print(f"Error reading GeoJSON file: {e}")
        return
    
    feature_count = len(gdf)
    print(f"Found {feature_count} features")
    
    # Calculate number of chunks needed
    features_per_chunk = estimate_features_per_chunk(file_size, feature_count, max_size_mb)
    chunk_count = math.ceil(feature_count / features_per_chunk)
    
    print(f"Splitting into {chunk_count} chunks (approx. {features_per_chunk} features per chunk)")
    
    # Create info file to document the split
    info_file = output_dir / f"{base_name}_split_info.json"
    info_data = {
        "original_file": str(file_path),
        "original_size_mb": file_size,
        "feature_count": feature_count,
        "chunk_count": chunk_count,
        "max_size_mb": max_size_mb,
        "chunks": []
    }
    
    # Split the file
    for i in range(chunk_count):
        start_idx = i * features_per_chunk
        end_idx = min((i + 1) * features_per_chunk, feature_count)
        
        # Extract chunk
        chunk = gdf.iloc[start_idx:end_idx].copy()
        
        # Create chunk filename
        chunk_filename = f"{base_name}_part{i+1}of{chunk_count}.geojson"
        chunk_path = output_dir / chunk_filename
        
        # Save chunk
        print(f"Saving chunk {i+1}/{chunk_count}: {chunk_filename}")
        chunk.to_file(chunk_path, driver="GeoJSON")
        
        # Get actual file size
        chunk_size = get_file_size_mb(chunk_path)
        print(f"  Chunk size: {chunk_size:.2f} MB, Features: {len(chunk)}")
        
        # Add to info
        info_data["chunks"].append({
            "filename": chunk_filename,
            "size_mb": chunk_size,
            "feature_count": len(chunk),
            "index_range": [start_idx, end_idx]
        })
    
    # Save info file
    with open(info_file, 'w') as f:
        json.dump(info_data, f, indent=2)
    
    print(f"\nSplitting complete! Created {chunk_count} files.")
    print(f"Split info saved to {info_file}")
    
    # Check if original file should be removed
    return True

def main():
    args = parse_args()
    
    # Validate input file
    file_path = Path(args.file)
    if not file_path.exists():
        print(f"Error: File not found: {file_path}")
        return 1
    
    # Split the file
    success = split_geojson(file_path, args.max_size, args.outdir)
    
    if success:
        # Ask if original file should be deleted
        response = input("\nDo you want to delete the original large file? (y/n): ")
        if response.lower() == 'y':
            os.remove(file_path)
            print(f"Original file deleted: {file_path}")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())