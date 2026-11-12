-- =============================================================================
-- Riftbound Competitive Tracker - Migracion 0003
-- Catalogo de sets y leyendas
-- =============================================================================
-- Fuente de las leyendas: https://riftdecks.com/legends (metagame Radiance,
-- noviembre 2026). Fechas de lanzamiento: release oficial en ingles.
--
-- `code` es el identificador estable y UNIQUE de cada fila. Volver a ejecutar
-- esta migracion actualiza nombres y fechas sin duplicar nada, asi que tambien
-- sirve para corregir erratas o retocar un titulo.
--
-- Como anadir cosas nuevas:
--   * Set o leyenda nuevos -> crear una migracion `000X_catalog.sql` con el
--     mismo patron `insert ... on conflict (code) do update`.
--   * Nunca borres un set o una leyenda que ya aparezca en partidas: pon
--     `active = false` y deja de ofrecerse en los formularios.
--   * Ojo con las comillas simples en SQL: se escapan duplicandolas (Kai''Sa).
-- =============================================================================

insert into public.sets (code, name, release_date, active) values
  ('OGN', 'Origins',      date '2025-10-31', true),
  ('SFD', 'Spiritforged', date '2026-02-13', true),
  ('UNL', 'Unleashed',    date '2026-05-08', true),
  ('VEN', 'Vendetta',     date '2026-07-31', true),
  ('RAD', 'Radiance',     date '2026-10-23', true)
on conflict (code) do update
  set name = excluded.name,
      release_date = excluded.release_date,
      active = excluded.active;

-- `name` es el nombre corto (el que se muestra en tablas y matrices) y `title`
-- el nombre completo de la carta. Hay dos "Master Yi" distintos, asi que el
-- titulo es imprescindible para distinguirlos en un desplegable.
insert into public.legends (code, name, title, active) values
  ('RIVEN',               'Riven',        'Riven, The Exile',                 true),
  ('KAISA',               'Kai''Sa',      'Kai''Sa, Daughter of the Void',    true),
  ('KENNEN',              'Kennen',       'Kennen, Heart of the Tempest',     true),
  ('MASTER_YI_BLADESMAN', 'Master Yi (Wuju Bladesman)', 'Master Yi, Wuju Bladesman', true),
  ('RENGAR',              'Rengar',       'Rengar, Pridestalker',             true),
  ('REKSAI',              'Rek''Sai',     'Rek''Sai, Void Burrower',          true),
  ('VEX',                 'Vex',          'Vex, Gloomist',                    true),
  ('JAYCE',               'Jayce',        'Jayce, Defender of Tomorrow',      true),
  ('IRELIA',              'Irelia',       'Irelia, Blade Dancer',             true),
  ('AKALI',               'Akali',        'Akali, Rogue Assassin',            true),
  ('LEBLANC',             'LeBlanc',      'LeBlanc, Deceiver',                true),
  ('LILLIA',              'Lillia',       'Lillia, Bashful Bloom',            true),
  ('VIKTOR',              'Viktor',       'Viktor, Herald of the Arcane',     true),
  ('AZIR',                'Azir',         'Azir, Emperor of the Sands',       true),
  ('EVELYNN',             'Evelynn',      'Evelynn, Agony''s Embrace',        true),
  ('KHAZIX',              'Kha''Zix',     'Kha''Zix, Voidreaver',             true),
  ('MORDEKAISER',         'Mordekaiser',  'Mordekaiser, Iron Revenant',       true),
  ('DIANA',               'Diana',        'Diana, Scorn of the Moon',         true),
  ('ORNN',                'Ornn',         'Ornn, Fire Below the Mountain',    true),
  ('ORIANNA',             'Orianna',      'Orianna, Lady of Clockwork',       true),
  ('NASUS',               'Nasus',        'Nasus, Curator of the Sands',      true),
  ('EKKO',                'Ekko',         'Ekko, Boy Who Shattered Time',     true),
  ('SETT',                'Sett',         'Sett, The Boss',                   true),
  ('SERAPHINE',           'Seraphine',    'Seraphine, Starry-Eyed Songstress', true),
  ('FIORA',               'Fiora',        'Fiora, Grand Duelist',             true),
  ('VOLIBEAR',            'Volibear',     'Volibear, Relentless Storm',       true),
  ('JARVAN_IV',           'Jarvan IV',    'Jarvan IV, Exemplar of Demacia',   true),
  ('ZIGGS',               'Ziggs',        'Ziggs, Hexplosives Expert',        true),
  ('EZREAL',              'Ezreal',       'Ezreal, Prodigal Explorer',        true),
  ('PYKE',                'Pyke',         'Pyke, Bloodharbor Ripper',         true),
  ('TEEMO',               'Teemo',        'Teemo, Swift Scout',               true),
  ('MASTER_YI_MASTER',    'Master Yi (Wuju Master)',    'Master Yi, Wuju Master',           true),
  ('KSANTE',              'K''Sante',     'K''Sante, Pride of Nazumah',       true),
  ('JHIN',                'Jhin',         'Jhin, Virtuoso',                   true),
  ('IVERN',               'Ivern',        'Ivern, Green Father',              true),
  ('VI',                  'Vi',           'Vi, Piltover Enforcer',            true),
  ('DRAVEN',              'Draven',       'Draven, Glorious Executioner',     true),
  ('LUCIAN',              'Lucian',       'Lucian, Purifier',                 true),
  ('MEL',                 'Mel',          'Mel, Soul''s Reflection',          true),
  ('LEONA',               'Leona',        'Leona, Radiant Dawn',              true),
  ('ZED',                 'Zed',          'Zed, Master of Shadows',           true),
  ('RENEKTON',            'Renekton',     'Renekton, Butcher of the Sands',   true),
  ('POPPY',               'Poppy',        'Poppy, Keeper of the Hammer',      true),
  ('RUMBLE',              'Rumble',       'Rumble, Mechanized Menace',        true),
  ('SHEN',                'Shen',         'Shen, Eye of Twilight',            true),
  ('AMBESSA',             'Ambessa',      'Ambessa, Matriarch of War',        true),
  ('DARIUS',              'Darius',       'Darius, Hand of Noxus',            true),
  ('YASUO',               'Yasuo',        'Yasuo, Unforgiven',                true),
  ('MISS_FORTUNE',        'Miss Fortune', 'Miss Fortune, Bounty Hunter',      true),
  ('ANNIE',               'Annie',        'Annie, Dark Child',                true),
  ('LEE_SIN',             'Lee Sin',      'Lee Sin, Blind Monk',              true),
  ('AHRI',                'Ahri',         'Ahri, Nine-Tailed Fox',            true),
  ('JAX',                 'Jax',          'Jax, Grandmaster at Arms',         true),
  ('JINX',                'Jinx',         'Jinx, Loose Cannon',               true),
  ('LUX',                 'Lux',          'Lux, Lady of Luminosity',          true),
  ('SIVIR',               'Sivir',        'Sivir, Battle Mistress',           true),
  ('GAREN',               'Garen',        'Garen, Might of Demacia',          true),
  ('RENATA_GLASC',        'Renata Glasc', 'Renata Glasc, Chem-Baroness',      true)
on conflict (code) do update
  set name = excluded.name,
      title = excluded.title,
      active = excluded.active;
