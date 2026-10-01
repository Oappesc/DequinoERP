-- ====================================================
-- Sistema de Pedidos y Cobranza
-- ====================================================

CREATE TABLE IF NOT EXISTS vendedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cedula VARCHAR(20) NOT NULL UNIQUE,
  pin VARCHAR(255) NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  email VARCHAR(150),
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rif_cedula VARCHAR(20) NOT NULL UNIQUE,
  razon_social VARCHAR(200) NOT NULL,
  email VARCHAR(150),
  direccion TEXT,
  telefono VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS productos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(50) NOT NULL UNIQUE,
  descripcion VARCHAR(255) NOT NULL,
  precio NUMERIC(12,2) NOT NULL CHECK (precio >= 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TYPE documento_tipo AS ENUM ('factura', 'nota_entrega');
CREATE TYPE pedido_estado AS ENUM (
  'registrado',
  'por_procesar',
  'procesado',
  'pedido_entregado',
  'pago_en_revision',
  'pagado'
);

CREATE TABLE IF NOT EXISTS pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  correlativo VARCHAR(50) NOT NULL UNIQUE,
  vendedor_id UUID NOT NULL REFERENCES vendedores(id) ON DELETE RESTRICT,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
  tipo_documento documento_tipo NOT NULL,
  total NUMERIC(12,2) NOT NULL CHECK (total >= 0),
  estado pedido_estado NOT NULL DEFAULT 'registrado',
  comprobante_url TEXT,
  comprobante_pago_url TEXT,
  fecha_registrado TIMESTAMPTZ DEFAULT NOW(),
  fecha_por_procesar TIMESTAMPTZ,
  fecha_procesado TIMESTAMPTZ,
  fecha_pedido_entregado TIMESTAMPTZ,
  fecha_pago_en_revision TIMESTAMPTZ,
  fecha_pagado TIMESTAMPTZ,
  observacion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pedido_detalles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  precio_unitario NUMERIC(12,2) NOT NULL CHECK (precio_unitario >= 0),
  subtotal NUMERIC(12,2) NOT NULL CHECK (subtotal >= 0)
);

-- Optional indexes for dashboard/report queries
CREATE INDEX IF NOT EXISTS idx_pedidos_vendedor_id ON pedidos(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente_id ON pedidos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_estado ON pedidos(estado);
CREATE INDEX IF NOT EXISTS idx_pedidos_created_at ON pedidos(created_at);
CREATE INDEX IF NOT EXISTS idx_pedido_detalles_pedido_id ON pedido_detalles(pedido_id);

-- ====================================================
-- Storage bucket: comprobantes
-- ====================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('comprobantes', 'comprobantes', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Storage bucket: RIF images for temporary new customers

INSERT INTO storage.buckets (id, name, public)
VALUES ('rifs_clientes', 'rifs_clientes', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

INSERT INTO storage.buckets (id, name, public)
VALUES ('comprobantes_pago', 'comprobantes_pago', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

CREATE POLICY "Allow public upload to comprobantes bucket"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'comprobantes');

CREATE POLICY "Allow public read access to comprobantes bucket"
ON storage.objects FOR SELECT
USING (bucket_id = 'comprobantes');

CREATE POLICY "Allow public update of comprobantes"
ON storage.objects FOR UPDATE
USING (bucket_id = 'comprobantes');

CREATE POLICY "Allow public delete from comprobantes"
ON storage.objects FOR DELETE
USING (bucket_id = 'comprobantes');

CREATE POLICY "Allow public upload to rifs_clientes bucket"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'rifs_clientes');

CREATE POLICY "Allow public read access to rifs_clientes bucket"
ON storage.objects FOR SELECT
USING (bucket_id = 'rifs_clientes');

CREATE POLICY "Allow public upload to comprobantes_pago bucket"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'comprobantes_pago');

CREATE POLICY "Allow public read access to comprobantes_pago bucket"
ON storage.objects FOR SELECT
USING (bucket_id = 'comprobantes_pago');
