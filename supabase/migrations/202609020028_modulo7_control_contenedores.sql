-- Migration: 202609020028_modulo7_control_contenedores.sql
-- Módulo 7: Control de Contenedores y Patio (Tiempos de camión, cuadrilla y evidencias fotográficas)

CREATE TABLE IF NOT EXISTS public.control_contenedor (
    id_contenedor BIGSERIAL PRIMARY KEY,
    numero_contenedor VARCHAR(50) NOT NULL,
    placa_camion VARCHAR(20) NOT NULL,
    empresa_transporte VARCHAR(150),
    nombre_conductor VARCHAR(150),
    telefono_conductor VARCHAR(50),
    hora_llegada_contenedor TIMESTAMPTZ NOT NULL DEFAULT now(),
    hora_salida_contenedor TIMESTAMPTZ,
    tipo_personal VARCHAR(30) NOT NULL DEFAULT 'PROPIO' CHECK (tipo_personal IN ('PROPIO', 'CUADRILLA_EXTERNA')),
    nombre_cuadrilla VARCHAR(150),
    num_estibadores INTEGER DEFAULT 0,
    hora_llegada_cuadrilla TIMESTAMPTZ,
    hora_salida_cuadrilla TIMESTAMPTZ,
    fotos JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array de objetos: [{ id, url, tipo, caption, timestamp }] máx 10
    estado VARCHAR(30) NOT NULL DEFAULT 'EN_PATIO' CHECK (estado IN ('EN_PATIO', 'EN_DESCARGA', 'DESCARGADO', 'DESPACHADO')),
    observaciones TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para búsqueda rápida y filtrado de activos en patio
CREATE INDEX IF NOT EXISTS idx_contenedor_activo ON public.control_contenedor (hora_salida_contenedor) WHERE hora_salida_contenedor IS NULL;
CREATE INDEX IF NOT EXISTS idx_contenedor_numero ON public.control_contenedor (numero_contenedor);
CREATE INDEX IF NOT EXISTS idx_contenedor_placa ON public.control_contenedor (placa_camion);

-- Vincular en sesion_recepcion y recepcion_lectura si existen
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sesion_recepcion') THEN
        ALTER TABLE public.sesion_recepcion 
        ADD COLUMN IF NOT EXISTS id_contenedor BIGINT REFERENCES public.control_contenedor(id_contenedor) ON DELETE SET NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'recepcion_lectura') THEN
        ALTER TABLE public.recepcion_lectura 
        ADD COLUMN IF NOT EXISTS id_contenedor BIGINT REFERENCES public.control_contenedor(id_contenedor) ON DELETE SET NULL;
    END IF;
END $$;

-- Políticas RLS
ALTER TABLE public.control_contenedor ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Lectura permitida a usuarios autenticados control_contenedor" ON public.control_contenedor;
    DROP POLICY IF EXISTS "Gestion permitida a usuarios autenticados control_contenedor" ON public.control_contenedor;

    CREATE POLICY "Lectura permitida a usuarios autenticados control_contenedor" 
    ON public.control_contenedor FOR SELECT TO authenticated USING (true);

    CREATE POLICY "Gestion permitida a usuarios autenticados control_contenedor" 
    ON public.control_contenedor FOR ALL TO authenticated 
    USING (true)
    WITH CHECK (true);
END $$;
