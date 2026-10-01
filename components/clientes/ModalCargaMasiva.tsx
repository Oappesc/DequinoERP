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
            const obj: any = {};
            row.eachCell((cell, colNumber) => {
              if (headers[colNumber]) {
                obj[headers[colNumber]] = cell.text.trim();
              }
            });
            data.push(mapHeaders(obj));
          }
        });
        setParsedData(data);
      }
    } catch (err: any) {
      setError('Error leyendo el archivo: ' + err.message);
    }
  };

  const mapHeaders = (rawObj: any) => {
    return {
      razon_social: rawObj['nombre'] || rawObj['razon_social'] || rawObj['razon social'] || '',
      rif_cedula: rawObj['rif'] || rawObj['cedula'] || rawObj['rif_cedula'] || rawObj['identificacion'] || '',
      direccion: rawObj['direccion'] || rawObj['dir'] || '',
      telefono: rawObj['telefono'] || rawObj['tlf'] || rawObj['celular'] || '',
      email: rawObj['email'] || rawObj['correo'] || ''
    };
  };

  const handleImport = async () => {
    if (parsedData.length === 0) return;
    setLoading(true);
    setError(null);
    
    // validate
    const valids = parsedData.filter(c => c.razon_social && c.rif_cedula);
    if (valids.length === 0) {
      setError('Ningún cliente tiene Nombre y RIF (Campos obligatorios).');
      setLoading(false);
      return;
    }

    const res = await bulkImportClientes(valids);
    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      setSuccess(`Se importaron ${res.count} clientes exitosamente.`);
      setTimeout(() => {
        onSuccess();
      }, 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-xl font-bold text-slate-800">Carga Masiva de Clientes</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="p-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}
          
          {success && (
            <div className="p-4 text-sm text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <p>{success}</p>
            </div>
          )}

          {!success && (
            <>
              <div 
                className="border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:bg-slate-50 hover:border-blue-400 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  accept=".xlsx, .csv" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                />
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <h3 className="text-base font-semibold text-slate-800 mb-1">
                  Sube tu archivo Excel o CSV
                </h3>
                <p className="text-sm text-slate-500 mb-4">
                  El archivo debe contener columnas como: Nombre, RIF, Direccion, Telefono, Email
                </p>
                <button className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium">
                  Seleccionar Archivo
                </button>
              </div>

              {parsedData.length > 0 && (
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <p className="text-sm font-medium text-slate-700 mb-2">
                    Vista previa de datos ({parsedData.length} encontrados)
                  </p>
                  <div className="max-h-32 overflow-y-auto space-y-2">
                    {parsedData.slice(0, 3).map((c, i) => (
                      <div key={i} className="text-xs bg-white p-2 rounded border border-slate-100 flex justify-between">
                        <span className="font-semibold">{c.razon_social || 'SIN NOMBRE'}</span>
                        <span className="text-slate-500">{c.rif_cedula || 'SIN RIF'}</span>
                      </div>
                    ))}
                    {parsedData.length > 3 && (
                      <p className="text-xs text-center text-slate-500 pt-2">... y {parsedData.length - 3} más</p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          <div className="pt-2 flex justify-end gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button 
              onClick={handleImport}
              disabled={loading || parsedData.length === 0 || !!success}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors disabled:opacity-50"
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
