-- =====================================================
-- SCHEMA PARA SUPABASE
-- Ejecuta este SQL en: Supabase Dashboard → SQL Editor
-- =====================================================

-- Tabla de clientes
CREATE TABLE clientes (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nombre      TEXT NOT NULL,
  telefono    TEXT,
  cedula      TEXT,
  direccion   TEXT,
  numero_pedido TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de recibos
CREATE TABLE recibos (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  cliente_id          UUID REFERENCES clientes(id) ON DELETE SET NULL,
  serial              TEXT NOT NULL,
  empresa             TEXT,
  fecha_emision       DATE,
  saldo_anterior      TEXT,
  abono               TEXT,
  saldo_actual        TEXT,
  proximo_cobro       TEXT,
  numero_cuotas       TEXT,
  obra                TEXT,
  banco               TEXT,
  numero_transaccion  TEXT,
  fecha_pago          DATE,
  cobrador            TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- Cada usuario solo ve sus propios datos
-- =====================================================

ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recibos  ENABLE ROW LEVEL SECURITY;

-- Políticas para clientes
CREATE POLICY "usuarios ven sus clientes"
  ON clientes FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "usuarios crean sus clientes"
  ON clientes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "usuarios editan sus clientes"
  ON clientes FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "usuarios eliminan sus clientes"
  ON clientes FOR DELETE USING (auth.uid() = user_id);

-- Políticas para recibos
CREATE POLICY "usuarios ven sus recibos"
  ON recibos FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "usuarios crean sus recibos"
  ON recibos FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "usuarios eliminan sus recibos"
  ON recibos FOR DELETE USING (auth.uid() = user_id);