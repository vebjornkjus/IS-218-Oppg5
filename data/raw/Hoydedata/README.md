# 1. Convert back to real elevations
We scaled the original −10 … +1720 m range into 0 … 65535. To recover meters:

``
real_m = elevation.astype(float) * (max_elev - min_elev) / 65535 + min_elev``

(Use the min/max, e.g. min_elev = -10, max_elev = 1719.)

# 2. Feed into your renderer
``
	•	Three.js: wrap the Uint16Array in a DataTexture using UnsignedShortType and assign it to your displacement map.
	•	Unity/Unreal: either import the GeoTIFF directly (with a plugin), or convert to a raw .r16/.raw and load as a heightmap asset.
	•	Custom C++/OpenGL: upload the Uint16Array as a 16-bit texture, sample in your shader, remap to your unit scale, and displace vertices. 
``
# 3. Example in Javascript using geotiff
``
import GeoTIFF from 'geotiff';

async function loadHeightmap(url) {
  const tiff = await GeoTIFF.fromUrl(url);
  const img  = await tiff.getImage();
  const data = await img.readRasters({ interleave: true });
  // data is a Uint16Array of size width*height
  return { width: img.getWidth(), height: img.getHeight(), data };
}``
