
DROP VIEW IF EXISTS public.deuda_jugador;
DROP VIEW IF EXISTS public.deuda_equipo;

CREATE VIEW public.deuda_jugador WITH (security_invoker = true) AS
SELECT
  c.jugador_id,
  j.apellido,
  j.nombre,
  j.dni,
  SUM(c.monto) AS total_cargos,
  COALESCE(SUM(pi_sum.total_pagado), 0) AS total_pagado,
  SUM(c.monto) - COALESCE(SUM(pi_sum.total_pagado), 0) AS deuda_pendiente,
  COUNT(c.id) AS cantidad_cargos
FROM public.cargos c
JOIN public.jugadores j ON j.id = c.jugador_id
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(pi.monto_aplicado), 0) AS total_pagado
  FROM public.pago_items pi WHERE pi.cargo_id = c.id
) pi_sum ON true
WHERE c.estado_pago IN ('pendiente','vencido')
  AND c.jugador_id IS NOT NULL
GROUP BY c.jugador_id, j.apellido, j.nombre, j.dni;

CREATE VIEW public.deuda_equipo WITH (security_invoker = true) AS
SELECT
  c.equipo_id,
  e.nombre_equipo,
  SUM(c.monto) AS total_cargos,
  COALESCE(SUM(pi_sum.total_pagado), 0) AS total_pagado,
  SUM(c.monto) - COALESCE(SUM(pi_sum.total_pagado), 0) AS deuda_pendiente,
  COUNT(c.id) AS cantidad_cargos
FROM public.cargos c
JOIN public.equipos e ON e.id = c.equipo_id
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(pi.monto_aplicado), 0) AS total_pagado
  FROM public.pago_items pi WHERE pi.cargo_id = c.id
) pi_sum ON true
WHERE c.estado_pago IN ('pendiente','vencido')
  AND c.equipo_id IS NOT NULL
GROUP BY c.equipo_id, e.nombre_equipo;
