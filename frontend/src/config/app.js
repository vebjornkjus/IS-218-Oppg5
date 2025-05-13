// frontend/src/config/app.js - Configuration constants

export const SUPABASE_CONFIG = {
  url: 'https://emefguxbwcvfxaiywmri.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtZWZndXhid2N2ZnhhaXl3bXJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4OTgxODksImV4cCI6MjA2MDQ3NDE4OX0.j5kJxREpP5kuB3XIHN382B11hVCYnpxfQaF2o4kiVRg'
};

export const WMS_URLS = {
  KARTVERKET: 'https://wms.geonorge.no/skwms1/wms.fkb?',
  NVE_AKTSOMHET: 'https://nve.geodataonline.no/arcgis/services/FlomAktsomhet/MapServer/WMSServer',
  NVE_FLOMSONER: 'https://nve.geodataonline.no/arcgis/services/Flomsoner1/MapServer/WMSServer'
};

export const WMS_COMMON_OPTIONS = {
  format: "image/png",
  transparent: true,
  version: "1.3.0"
};

export const FLOOD_YEARS = [10, 20, 50, 100, 200, 500, 1000];

export const SLIDER_VALUE_MAP = {
  '0': 10,
  '1': 20,
  '2': 50,
  '3': 100,
  '4': 200,
  '5': 500,
  '6': 1000
};

export const REVERSE_SLIDER_MAP = {
  10: '0',
  20: '1',
  50: '2',
  100: '3',
  200: '4',
  500: '5',
  1000: '6'
};