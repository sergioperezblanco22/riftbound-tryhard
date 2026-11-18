-- =============================================================================
-- Riftbound Competitive Tracker - Migracion 0005
-- Imagenes de leyendas
-- =============================================================================
-- Añade una columna opcional image_url a la tabla legends para poder mostrar
-- el retrato/carta de cada leyenda en desplegables, tablas y matriz de matchups.
-- Las URLs se pueden ir rellenando poco a poco desde una fuente oficial.
-- =============================================================================

alter table public.legends add column if not exists image_url text;
