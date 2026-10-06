'use client';

import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, X } from 'lucide-react';
import Papa from 'papaparse';
import { bulkInsertProducts } from '@/lib/actions_inventario';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ModalCargaMasivaInventario({ isOpen, onClose, onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setSuccessCount(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data as any[];
          const productsToInsert = rows.map(row => ({
            codigo: row.pt?.trim() || '',
            nombre: row.nombre?.trim() || '',
            descripcion: row.descripcion?.trim() || '',
            tamano_valor: parseFloat(row.tamano_valor) || 0,
            unidad_medida: row.tamano_unidad?.trim() || 'unidad',
            precio: parseFloat(row.precio_cadena) || 0,
            precio_mayorista: parseFloat(row.precio_distribuidor) || 0,
            tipo: 'producto',
            stock: 0,
            bajo_pedido: true,
            activo: true
          }));

          if (productsToInsert.length === 0) {
            throw new Error("El archivo CSV está vacío o no tiene el formato correcto.");
          }

          const res = await bulkInsertProducts(productsToInsert);
          if (res.error) throw new Error(res.error);

          setSuccessCount(productsToInsert.length);
          setTimeout(() => {
            onSuccess();
            setFile(null);
            setSuccessCount(null);
          }, 2000);
        } catch (err: any) {
          setError(err.message || 'Error procesando el archivo CSV');
        } finally {
          setLoading(false);
        }
      },
      error: (err: any) => {
        setError('Error leyendo el CSV: ' + err.message);
        setLoading(false);
      }
    });
  };

  const downloadTemplate = () => {
    const csvContent = "pt,nombre,descripcion,tamano_valor,tamano_unidad,precio_cadena,precio_distribuidor\nPT-001,Champu Mascotas,Pelaje Blanco,240,mL,10.50,8.00";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "plantilla_inventario.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-dequino-tertiary/40 flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-[#FAF8F5]">
          <div>
            <span className="text-[10px] font-semibold tracking-widest text-[#B38E5D] uppercase mb-0.5 block">CATÁLOGO</span>
            <h2 className="text-xl font-bold text-dequino-secondary">Carga Masiva de Inventario</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-500">
            Sube un archivo CSV con tus productos. El sistema los registrará automáticamente como productos bajo pedido.
          </p>

          <button 
            onClick={downloadTemplate}
            className="text-xs font-semibold text-dequino-primary hover:text-dequino-secondary hover:underline flex items-center gap-1.5 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" /> Descargar plantilla CSV de ejemplo
          </button>

          <div 
            className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:bg-[#FAF8F5] hover:border-dequino-primary transition-all cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              accept=".csv" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileChange}
            />
            
            {successCount !== null ? (
              <div className="flex flex-col items-center text-emerald-700">
                <CheckCircle2 className="w-10 h-10 mb-2 text-emerald-600" />
                <p className="font-bold text-sm">¡{successCount} productos cargados con éxito!</p>
              </div>
            ) : file ? (
              <div className="flex flex-col items-center text-dequino-primary">
                <FileSpreadsheet className="w-10 h-10 mb-2" />
                <p className="font-bold text-sm text-dequino-secondary">{file.name}</p>
                <p className="text-xs text-slate-400 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <div className="flex flex-col items-center text-slate-500">
                <div className="w-12 h-12 bg-[#EEF3EC] text-dequino-secondary rounded-2xl flex items-center justify-center mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="font-bold text-xs text-slate-700">Haz clic para subir tu CSV</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Formato requerido: .csv</p>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-rose-50 text-rose-700 border border-rose-100 p-3 rounded-2xl text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}
        </div>

        <div className="p-6 pt-0 flex justify-end gap-3 border-t border-slate-100 mt-2">
          <button onClick={onClose} disabled={loading} className="px-5 py-2.5 rounded-2xl text-xs font-medium text-slate-500 hover:bg-slate-100 transition-colors">
            Cancelar
          </button>
          <button 
            onClick={handleUpload} 
            disabled={!file || loading || successCount !== null} 
            className="px-5 py-2.5 rounded-2xl text-xs font-medium text-white bg-dequino-primary hover:bg-[#6C8264] shadow-md shadow-dequino-primary/20 transition-all disabled:opacity-50"
          >
            {loading ? 'Procesando...' : 'Subir e Importar'}
          </button>
        </div>
      </div>
    </div>
  );
}
