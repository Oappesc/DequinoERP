export type DocumentoTipo = 'factura' | 'nota_entrega';

export type PedidoEstado =
  | 'registrado'
  | 'por_procesar'
  | 'procesado'
  | 'pedido_entregado'
  | 'pago_en_revision'
  | 'pagado';

type SupabaseTable = {
  Row: Record<string, unknown>;
  Insert: Record<string, unknown>;
  Update: Record<string, unknown>;
  Relationships: SupabaseRelationship[];
};

type SupabaseRelationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne?: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

type SupabaseView = SupabaseTable;
type SupabaseFunction = { Args: Record<string, unknown> | never; Returns: unknown };

export type Vendedor = {
  id: string;
  cedula: string;
  pin: string;
  nombre: string;
  email?: string | null;
  activo: boolean;
  created_at: string;
}

export type Cliente = {
  id: string;
  rif_cedula: string;
  razon_social: string;
  email?: string | null;
  direccion?: string | null;
  telefono?: string | null;
    activo?: boolean;
  created_at: string;
}


export type ClienteNota = {
  id: string;
  cliente_id: string;
  contenido: string;
  created_at: string;
};

export type Producto = {
  id: string;
  codigo: string;
  nombre?: string | null;
  descripcion: string;
  tamano_valor?: number | null;
  precio: number;
  costo?: number;
  stock: number;
  activo: boolean;
  created_at: string;
  tipo?: 'producto' | 'servicio' | 'materia_prima';
  unidad_medida?: string;
  unidades_por_caja?: number;
  precio_mayorista?: number;
  stock_minimo?: number;
  bajo_pedido?: boolean;
}

export type ProductoReceta = {
  id: string;
  producto_id: string;
  materia_prima_id: string;
  cantidad_requerida: number;
  unidad_medida: string;
  created_at: string;
  // Join extensions
  materia_prima?: Producto;
}

export type Pedido = {
  id: string;
  correlativo: string;
  vendedor_id: string;
  cliente_id: string;
  tipo_documento: DocumentoTipo;
  estado: PedidoEstado;
  total: number;
  observacion?: string | null;
  fecha_por_procesar?: string | null;
  fecha_procesado?: string | null;
  fecha_pedido_entregado?: string | null;
  fecha_pagado?: string | null;
  fecha_pago_en_revision?: string | null;
  comprobante_pago_url?: string | null;
  fecha_limite_cobro?: string | null;
  dias_credito?: number | null;
  porcentaje_comision?: number;
  inventario_descontado?: boolean;
  created_at: string;
}

export type PedidoDetalle = {
  id: string;
  pedido_id: string;
  producto_id: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface PedidoConRelaciones extends Pedido {
  cliente?: Cliente | null;
  vendedor?: Vendedor | null;
  detalles?: PedidoDetalle[];
}

export type ConfiguracionTasa = {
  id: string;
  moneda: string;
  tasa: number;
  actualizado_en: string;
}

export type Database = {
  public: {
    Tables: {
      [table: string]: SupabaseTable;
      configuracion_tasas: {
        Row: ConfiguracionTasa;
        Insert: Omit<ConfiguracionTasa, 'id'> & { id?: string };
        Update: Partial<Omit<ConfiguracionTasa, 'id'>> & { id?: string };
        Relationships: [];
      };
      vendedores: {
        Row: Vendedor;
        Insert: Omit<Vendedor, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<Vendedor, 'id' | 'created_at'>> & { id?: string; created_at?: string };
        Relationships: [];
      };
      clientes: {
        Row: Cliente;
        Insert: Omit<Cliente, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<Cliente, 'id' | 'created_at'>> & { id?: string; created_at?: string };
        Relationships: [];
      };
      productos: {
        Row: Producto;
        Insert: Omit<Producto, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<Producto, 'id' | 'created_at'>> & { id?: string; created_at?: string };
        Relationships: [];
      };
      politicas_credito: {
        Row: { id: string; monto_minimo: number; monto_maximo?: number | null; dias: number; created_at: string };
        Insert: any;
        Update: any;
        Relationships: [];
      };
      pedidos: {
        Row: Pedido;
        Insert: Omit<Pedido, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Omit<Pedido, 'id' | 'created_at'>> & { id?: string; created_at?: string };
        Relationships: [];
      };
      pedido_detalles: {
        Row: PedidoDetalle;
        Insert: Omit<PedidoDetalle, 'id'> & { id?: string };
        Update: Partial<Omit<PedidoDetalle, 'id'>> & { id?: string };
        Relationships: [];
      };
    };
    Views: { [view: string]: SupabaseView };
    Functions: { [functionName: string]: SupabaseFunction };
    Enums: {
      documento_tipo: DocumentoTipo;
      pedido_estado: PedidoEstado;
    };
  };
};
