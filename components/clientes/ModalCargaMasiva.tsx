'use client';
import { useState, useRef } from 'react';
import { X, Upload, FileSpreadsheet, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { bulkImportClientes } from '@/lib/actions_clientes';
import ExcelJS from 'exceljs';

export default function ModalCargaMasiva({ 
  onClose, 
  onSuccess 
}: { 
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccess(null);
    setParsedData([]);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      
      if (file.name.endsWith('.csv')) {
        // Read CSV
        const uint8 = new Uint8Array(arrayBuffer);
        const text = new TextDecoder().decode(uint8);
        const rows = text.split('\n').map(row => row.split(','));
        const headers = rows[0].map(h => h.trim().toLowerCase());
        
        const data = rows.slice(1).filter(r => r.length > 1).map(row => {
          const obj: any = {};
          headers.forEach((h, i) => {
            obj[h] = row[i]?.trim();
          });
          return mapHeaders(obj);
        });
        setParsedData(data);
      } else {
        // Read XLSX
        await workbook.xlsx.load(arrayBuffer);
        const worksheet = workbook.worksheets[0];
        
        const data: any[] = [];
        let headers: string[] = [];
        
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) {
            row.eachCell((cell, colNumber) => {
              headers[colNumber] = cell.text.trim().toLowerCase();
            });
          } else {
            const rowData: any = {};
            row.eachCell((cell, colNumber) => {
              const header = headers[colNumber];
              if (header) {
                rowData[header] = cell.text.trim();
              }
            });
            data.push(mapHeaders(rowData));
          }
        });
        setParsedData(data);
      }
    } catch (err: any) {
      setError('Error al procesar el archivo: ' + err.message);
    }
  };

  const mapHeaders = (raw: any) => {
    // Fuzzy matching for common column names
    const getVal = (patterns: string[]) => {
      const key = Object.keys(raw).find(k => patterns.some(p => k.includes(p)));
      return key ? raw[key] : '';
    };

    return {
      razon_social: getVal(['nombre', 'cliente', 'razon', 'empresa']),
      rif_cedula: getVal(['rif', 'cedula', 'identificacion', 'documento']),
      direccion: getVal(['direccion', 'ubicacion', 'fiscal']),
      telefono: getVal(['telefono', 'celular', 'tlf', 'movil']),
      email: getVal(['email', 'correo', 'mail']),
    };
  };

  const handleImport = async () => {
    if (parsedData.length === 0) return;
    setLoading(true);
    setError(null);

    const validData = parsedData.filter(d => d.razon_social && d.rif_cedula);
    if (validData.length === 0) {
      setError('No se encontraron registros válidos (Deben tener Nombre/Razón Social y RIF)');
      setLoading(false);
      return;
    }

    const res = await bulkImportClientes(validData);
    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      setSuccess(`Se importaron ${res.count} clientes exitosamente.`);
      setTimeout(() => {
        onSuccess();
      }, 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col border border-dequino-tertiary/40">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-[#FAF8F5]">
          <div>
            <span className="text-[10px] font-semibold tracking-widest text-[#B38E5D] uppercase mb-0.5 block">IMPORTACIÓN</span>
            <h2 className="text-xl font-bold text-dequino-secondary">Carga Masiva de Clientes</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}
          
          {success && (
            <div className="p-4 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
              <p>{success}</p>
            </div>
          )}

          {!success && (
            <>
              <div 
                className="border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:bg-[#FAF8F5] hover:border-dequino-primary transition-all cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  accept=".xlsx, .csv" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                />
                <div className="w-12 h-12 bg-[#EEF3EC] text-dequino-secondary rounded-2xl flex items-center justify-center mb-3">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-dequino-secondary mb-1">
                  Sube tu archivo Excel o CSV
                </h3>
                <p className="text-xs text-slate-400 mb-4 max-w-xs">
                  El archivo debe contener columnas como: Nombre, RIF, Dirección, Teléfono, Email
                </p>
                <button className="px-4 py-2 bg-dequino-secondary hover:bg-[#2F3C2C] text-white rounded-xl text-xs font-medium shadow-sm transition-all">
                  Seleccionar Archivo
                </button>
              </div>

              {parsedData.length > 0 && (
                <div className="bg-[#FAF8F5] rounded-2xl p-4 border border-slate-100">
                  <p className="text-xs font-bold text-slate-700 mb-2">
                    Vista previa de datos ({parsedData.length} encontrados)
                  </p>
                  <div className="max-h-32 overflow-y-auto space-y-1.5">
                    {parsedData.slice(0, 3).map((c, i) => (
                      <div key={i} className="text-xs bg-white p-2.5 rounded-xl border border-slate-100 flex justify-between">
                        <span className="font-semibold text-dequino-secondary">{c.razon_social || 'SIN NOMBRE'}</span>
                        <span className="text-slate-400">{c.rif_cedula || 'SIN RIF'}</span>
                      </div>
                    ))}
                    {parsedData.length > 3 && (
                      <p className="text-[10px] text-center text-slate-400 pt-1">... y {parsedData.length - 3} más</p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          <div className="pt-2 flex justify-end gap-3 border-t border-slate-100">
            <button 
              type="button" 
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-medium text-slate-500 hover:bg-slate-100 rounded-2xl transition-colors"
            >
              Cancelar
            </button>
            <button 
              onClick={handleImport}
              disabled={loading || parsedData.length === 0 || !!success}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-medium text-white bg-dequino-primary hover:bg-[#6C8264] rounded-2xl shadow-md shadow-dequino-primary/20 transition-all disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              {loading ? 'Importando...' : 'Importar a Base de Datos'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
