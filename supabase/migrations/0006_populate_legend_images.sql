-- =============================================================================
-- Riftbound Competitive Tracker - Migracion 0006
-- Poblar imagenes de leyendas desde riftbound.org
-- =============================================================================
-- Asigna la URL de la imagen de cada leyenda basada en su carta estandar.
-- Las URLs provienen de https://riftbound.org/storage/cards/{set}/{card}-thumb.webp
-- =============================================================================

-- Radiance
update public.legends set image_url = 'https://riftbound.org/storage/cards/rad/rad-149-167-thumb.webp?v=1792764005' where code = 'RIVEN';
update public.legends set image_url = 'https://riftbound.org/storage/cards/rad/rad-151-167-thumb.webp?v=1791246999' where code = 'SERAPHINE';
update public.legends set image_url = 'https://riftbound.org/storage/cards/rad/rad-153-167-thumb.webp?v=1792764005' where code = 'EVELYNN';
update public.legends set image_url = 'https://riftbound.org/storage/cards/rad/rad-143-167-thumb.webp?v=1791507604' where code = 'MORDEKAISER';
update public.legends set image_url = 'https://riftbound.org/storage/cards/rad/rad-145-167-thumb.webp?v=1791246999' where code = 'ORIANNA';
update public.legends set image_url = 'https://riftbound.org/storage/cards/rad/rad-147-167-thumb.webp?v=1791246999' where code = 'KSANTE';
update public.legends set image_url = 'https://riftbound.org/storage/cards/rad/rad-139-167-thumb.webp?v=1791246998' where code = 'EKKO';
update public.legends set image_url = 'https://riftbound.org/storage/cards/rad/rad-155-167-thumb.webp?v=1792764005' where code = 'JARVAN_IV';
update public.legends set image_url = 'https://riftbound.org/storage/cards/rad/rad-141-167-thumb.webp?v=1791246999' where code = 'ZIGGS';

-- Vendetta
update public.legends set image_url = 'https://riftbound.org/storage/cards/ven/ven-139-166-thumb.webp?v=1790765554' where code = 'AKALI';
update public.legends set image_url = 'https://riftbound.org/storage/cards/ven/ven-141-166-thumb.webp?v=1790765460' where code = 'RENEKTON';
update public.legends set image_url = 'https://riftbound.org/storage/cards/ven/ven-143-166-thumb.webp?v=1790765527' where code = 'ZED';
update public.legends set image_url = 'https://riftbound.org/storage/cards/ven/ven-145-166-thumb.webp?v=1790765470' where code = 'NASUS';
update public.legends set image_url = 'https://riftbound.org/storage/cards/ven/ven-147-166-thumb.webp?v=1790765487' where code = 'SHEN';
update public.legends set image_url = 'https://riftbound.org/storage/cards/ven/ven-149-166-thumb.webp?v=1790765475' where code = 'JAYCE';
update public.legends set image_url = 'https://riftbound.org/storage/cards/ven/ven-151-166-thumb.webp?v=1790765567' where code = 'MEL';
update public.legends set image_url = 'https://riftbound.org/storage/cards/ven/ven-153-166-thumb.webp?v=1790765527' where code = 'AMBESSA';
update public.legends set image_url = 'https://riftbound.org/storage/cards/ven/ven-155-166-thumb.webp?v=1790765502' where code = 'KENNEN';

-- Unleashed
update public.legends set image_url = 'https://riftbound.org/storage/cards/unl/unl-181-219-thumb.webp?v=1790765585' where code = 'JHIN';
update public.legends set image_url = 'https://riftbound.org/storage/cards/unl/unl-183-219-thumb.webp?v=1790765543' where code = 'RENGAR';
update public.legends set image_url = 'https://riftbound.org/storage/cards/unl/unl-185-219-thumb.webp?v=1790765454' where code = 'PYKE';
update public.legends set image_url = 'https://riftbound.org/storage/cards/unl/unl-187-219-thumb.webp?v=1790765540' where code = 'VI';
update public.legends set image_url = 'https://riftbound.org/storage/cards/unl/unl-189-219-thumb.webp?v=1790765449' where code = 'LILLIA';
update public.legends set image_url = 'https://riftbound.org/storage/cards/unl/unl-191-219-thumb.webp?v=1790765589' where code = 'MASTER_YI_MASTER';
update public.legends set image_url = 'https://riftbound.org/storage/cards/unl/unl-193-219-thumb.webp?v=1790765498' where code = 'VEX';
update public.legends set image_url = 'https://riftbound.org/storage/cards/unl/unl-195-219-thumb.webp?v=1790765499' where code = 'IVERN';
update public.legends set image_url = 'https://riftbound.org/storage/cards/unl/unl-197-219-thumb.webp?v=1790765558' where code = 'DIANA';
update public.legends set image_url = 'https://riftbound.org/storage/cards/unl/unl-199-219-thumb.webp?v=1791877518' where code = 'LEBLANC';
update public.legends set image_url = 'https://riftbound.org/storage/cards/unl/unl-201-219-thumb.webp?v=1790765586' where code = 'KHAZIX';
update public.legends set image_url = 'https://riftbound.org/storage/cards/unl/unl-203-219-thumb.webp?v=1790765515' where code = 'POPPY';

-- Spiritforged
update public.legends set image_url = 'https://riftbound.org/storage/cards/sfd/sfd-181-221-thumb.webp?v=1790765527' where code = 'RUMBLE';
update public.legends set image_url = 'https://riftbound.org/storage/cards/sfd/sfd-183-221-thumb.webp?v=1790765544' where code = 'LUCIAN';
update public.legends set image_url = 'https://riftbound.org/storage/cards/sfd/sfd-185-221-thumb.webp?v=1790765498' where code = 'DRAVEN';
update public.legends set image_url = 'https://riftbound.org/storage/cards/sfd/sfd-187-221-thumb.webp?v=1791877519' where code = 'REKSAI';
update public.legends set image_url = 'https://riftbound.org/storage/cards/sfd/sfd-189-221-thumb.webp?v=1790765491' where code = 'ORNN';
update public.legends set image_url = 'https://riftbound.org/storage/cards/sfd/sfd-193-221-thumb.webp?v=1790765498' where code = 'JAX';
update public.legends set image_url = 'https://riftbound.org/storage/cards/sfd/sfd-195-221-thumb.webp?v=1790765451' where code = 'IRELIA';
update public.legends set image_url = 'https://riftbound.org/storage/cards/sfd/sfd-197-221-thumb.webp?v=1790765484' where code = 'AZIR';
update public.legends set image_url = 'https://riftbound.org/storage/cards/sfd/sfd-199-221-thumb.webp?v=1790765543' where code = 'EZREAL';
update public.legends set image_url = 'https://riftbound.org/storage/cards/sfd/sfd-201-221-thumb.webp?v=1790765463' where code = 'RENATA_GLASC';
update public.legends set image_url = 'https://riftbound.org/storage/cards/sfd/sfd-203-221-thumb.webp?v=1790765449' where code = 'SIVIR';
update public.legends set image_url = 'https://riftbound.org/storage/cards/sfd/sfd-205-221-thumb.webp?v=1790765498' where code = 'FIORA';

-- Origins
update public.legends set image_url = 'https://riftbound.org/storage/cards/ogn/ogn-247-298-thumb.webp?v=1790765471' where code = 'KAISA';
update public.legends set image_url = 'https://riftbound.org/storage/cards/ogn/ogn-249-298-thumb.webp?v=1790765549' where code = 'VOLIBEAR';
update public.legends set image_url = 'https://riftbound.org/storage/cards/ogn/ogn-251-298-thumb.webp?v=1790765523' where code = 'JINX';
update public.legends set image_url = 'https://riftbound.org/storage/cards/ogn/ogn-253-298-thumb.webp?v=1790765501' where code = 'DARIUS';
update public.legends set image_url = 'https://riftbound.org/storage/cards/ogn/ogn-255-298-thumb.webp?v=1790765534' where code = 'AHRI';
update public.legends set image_url = 'https://riftbound.org/storage/cards/ogn/ogn-257-298-thumb.webp?v=1790765452' where code = 'LEE_SIN';
update public.legends set image_url = 'https://riftbound.org/storage/cards/ogn/ogn-259-298-thumb.webp?v=1791877519' where code = 'YASUO';
update public.legends set image_url = 'https://riftbound.org/storage/cards/ogn/ogn-261-298-thumb.webp?v=1790765545' where code = 'LEONA';
update public.legends set image_url = 'https://riftbound.org/storage/cards/ogn/ogn-263-298-thumb.webp?v=1790765574' where code = 'TEEMO';
update public.legends set image_url = 'https://riftbound.org/storage/cards/ogn/ogn-265-298-thumb.webp?v=1790765503' where code = 'VIKTOR';
update public.legends set image_url = 'https://riftbound.org/storage/cards/ogn/ogn-267-298-thumb.webp?v=1790765456' where code = 'MISS_FORTUNE';
update public.legends set image_url = 'https://riftbound.org/storage/cards/ogn/ogn-269-298-thumb.webp?v=1791877519' where code = 'SETT';

-- Proving Grounds
update public.legends set image_url = 'https://riftbound.org/storage/cards/ogs/ogs-017-024-thumb.webp?v=1793160002' where code = 'ANNIE';
update public.legends set image_url = 'https://riftbound.org/storage/cards/ogs/ogs-019-024-thumb.webp?v=1793160003' where code = 'MASTER_YI_BLADESMAN';
update public.legends set image_url = 'https://riftbound.org/storage/cards/ogs/ogs-021-024-thumb.webp?v=1793160002' where code = 'LUX';
update public.legends set image_url = 'https://riftbound.org/storage/cards/ogs/ogs-023-024-thumb.webp?v=1793160003' where code = 'GAREN';
