-- Limpiar reglas actuales
DELETE FROM public.categoria_reglas_2026;

-- Insertar reglas reales 2026
INSERT INTO public.categoria_reglas_2026 (categoria_id, anio_nacimiento_desde, anio_nacimiento_hasta)
SELECT id, 1988, 1992 FROM public.categorias WHERE nombre_categoria = 'Única';

INSERT INTO public.categoria_reglas_2026 (categoria_id, anio_nacimiento_desde, anio_nacimiento_hasta)
SELECT id, 1982, 1987 FROM public.categorias WHERE nombre_categoria = 'Maxi';

INSERT INTO public.categoria_reglas_2026 (categoria_id, anio_nacimiento_desde, anio_nacimiento_hasta)
SELECT id, 1979, 1981 FROM public.categorias WHERE nombre_categoria = 'Super Maxi';

INSERT INTO public.categoria_reglas_2026 (categoria_id, anio_nacimiento_desde, anio_nacimiento_hasta)
SELECT id, 1975, 1978 FROM public.categorias WHERE nombre_categoria = 'Senior';

INSERT INTO public.categoria_reglas_2026 (categoria_id, anio_nacimiento_desde, anio_nacimiento_hasta)
SELECT id, 1970, 1974 FROM public.categorias WHERE nombre_categoria = 'Super Senior';

INSERT INTO public.categoria_reglas_2026 (categoria_id, anio_nacimiento_desde, anio_nacimiento_hasta)
SELECT id, 1964, 1969 FROM public.categorias WHERE nombre_categoria = 'Master';

INSERT INTO public.categoria_reglas_2026 (categoria_id, anio_nacimiento_desde, anio_nacimiento_hasta)
SELECT id, 1961, 1963 FROM public.categorias WHERE nombre_categoria = 'Super Master';

INSERT INTO public.categoria_reglas_2026 (categoria_id, anio_nacimiento_desde, anio_nacimiento_hasta)
SELECT id, 1957, 1960 FROM public.categorias WHERE nombre_categoria = 'Graduados';