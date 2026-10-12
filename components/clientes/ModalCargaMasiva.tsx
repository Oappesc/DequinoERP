'use client';
import { useState, useRef } from 'react';
import { X, Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, Download } from 'lucide-react';
import { bulkImportClientes } from '@/lib/actions_clientes';
import ExcelJS from 'exceljs';

interface ParsedCliente {
  razon_social: string;
  rif_cedula: string;
  direccion: string;
  telefono: string;
  email: string;
  isValid: boolean;
}

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
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedCliente[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Normalizador de cabeceras para máxima tolerancia
  const normalizeHeader = (h: string): string => {
    return h
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Quita acentos (dirección -> direccion, cédula -> cedula)
      .replace(/[^a-z0-9]/g, ''); // Quita puntos, guiones, espacios (r.i.f -> rif, razon_social -> razonsocial)
  };

  // Mapeo tolerante de campos según especificación Dequino
  const matchField = (header: string): 'razon_social' | 'rif_cedula' | 'direccion' | 'telefono' | 'email' | null => {
    const norm = normalizeHeader(header);
    if (!norm) return null;

    // 1. Mapeo exacto prioritario
    const exactMap: Record<string, 'razon_social' | 'rif_cedula' | 'direccion' | 'telefono' | 'email'> = {
      nombre: 'razon_social',
      razonsocial: 'razon_social',
      cliente: 'razon_social',
      name: 'razon_social',
      empresa: 'razon_social',
      rif: 'rif_cedula',
      cedula: 'rif_cedula',
      doc: 'rif_cedula',
      documento: 'rif_cedula',
      identificacion: 'rif_cedula',
      direccion: 'direccion',
      address: 'direccion',
      dir: 'direccion',
      telefono: 'telefono',
      phone: 'telefono',
      celular: 'telefono',
      tlf: 'telefono',
      movil: 'telefono',
      email: 'email',
      correo: 'email',
      mail: 'email'
    };

    if (exactMap[norm]) return exactMap[norm];

    // 2. Mapeo por coincidencia parcial segura
    if (['rif', 'cedula', 'doc'].some(p => norm.includes(p))) return 'rif_cedula';
    if (['nombre', 'razonsocial', 'cliente', 'name'].some(p => norm.includes(p))) return 'razon_social';
    if (['direccion', 'address', 'dir'].some(p => norm.includes(p))) return 'direccion';
    if (['telefono', 'phone', 'celular', 'tlf', 'movil'].some(p => norm.includes(p))) return 'telefono';
    if (['email', 'correo', 'mail'].some(p => norm.includes(p))) return 'email';

    return null;
  };

  // Parser simple y seguro para CSV con soporte de comillas
  const parseCSVLine = (line: string, delimiter: string): string[] => {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === delimiter && !inQuotes) {
        result.push(cur);
        cur = '';
      } else {
        cur += c;
      }
    }
    result.push(cur);
    return result;
  };

  const processFile = async (file: File) => {
    setError(null);
    setSuccess(null);
    setParsedData([]);
    setFileName(file.name);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const items: ParsedCliente[] = [];

      if (file.name.toLowerCase().endsWith('.csv')) {
        // Procesar CSV
        const uint8 = new Uint8Array(arrayBuffer);
        const text = new TextDecoder('utf-8').decode(uint8);
        const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);

        if (lines.length === 0) {
          setError('El archivo CSV seleccionado está vacío');
          return;
        }

        const firstLine = lines[0];
        const delimiter = (firstLine.split(';').length > firstLine.split(',').length) ? ';' : ',';
        const headers = parseCSVLine(firstLine, delimiter).map(h => h.trim());

        const colMap: Record<number, 'razon_social' | 'rif_cedula' | 'direccion' | 'telefono' | 'email'> = {};
        headers.forEach((h, idx) => {
          const matched = matchField(h);
          if (matched) colMap[idx] = matched;
        });

        for (let r = 1; r < lines.length; r++) {
          const cells = parseCSVLine(lines[r], delimiter);
          const rowObj: any = {};
          cells.forEach((val, idx) => {
            const field = colMap[idx];
            if (field) {
              rowObj[field] = val.trim();
            }
          });

          const razon_social = rowObj.razon_social || '';
          const rif_cedula = rowObj.rif_cedula || '';
          const direccion = rowObj.direccion || '';
          const telefono = rowObj.telefono || '';
          const email = rowObj.email || '';

          // Ignorar filas totalmente vacías
          if (!razon_social && !rif_cedula && !direccion && !telefono && !email) {
            continue;
          }

          items.push({
            razon_social,
            rif_cedula,
            direccion,
            telefono,
            email,
            isValid: Boolean(razon_social && rif_cedula)
          });
        }
      } else {
        // Procesar Excel (.xlsx, .xls)
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(arrayBuffer);
        const worksheet = workbook.worksheets[0];

        if (!worksheet) {
          setError('El archivo Excel no contiene hojas válidas');
          return;
        }

        const colMap: Record<number, 'razon_social' | 'rif_cedula' | 'direccion' | 'telefono' | 'email'> = {};

        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) {
            row.eachCell((cell, colNumber) => {
              const headerText = cell.text ? String(cell.text).trim() : '';
              const matched = matchField(headerText);
              if (matched) colMap[colNumber] = matched;
            });
          } else {
            const rowObj: any = {};
            row.eachCell((cell, colNumber) => {
              const field = colMap[colNumber];
              if (field) {
                const textVal = cell.text ? String(cell.text).trim() : (cell.value ? String(cell.value).trim() : '');
                rowObj[field] = textVal;
              }
            });

            const razon_social = rowObj.razon_social || '';
            const rif_cedula = rowObj.rif_cedula || '';
            const direccion = rowObj.direccion || '';
            const telefono = rowObj.telefono || '';
            const email = rowObj.email || '';

            // Ignorar filas totalmente vacías
            if (!razon_social && !rif_cedula && !direccion && !telefono && !email) {
              return;
            }

            items.push({
              razon_social,
              rif_cedula,
              direccion,
              telefono,
              email,
              isValid: Boolean(razon_social && rif_cedula)
            });
          }
        });
      }

      if (items.length === 0) {
        setError('No se encontraron registros en el archivo');
        return;
      }

      setParsedData(items);
    } catch (err: any) {
      setError('Error al procesar el archivo: ' + (err?.message || 'Formato no reconocido'));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Descarga de la plantilla oficial de ejemplo en Excel (.xlsx)
  const handleDescargarPlantilla = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Dequino';
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet('Clientes', {
        views: [{ showGridLines: true }]
      });

      // Definición de columnas exactas
      worksheet.columns = [
        { header: 'nombre', key: 'nombre', width: 34 },
        { header: 'rif', key: 'rif', width: 18 },
        { header: 'direccion', key: 'direccion', width: 38 },
        { header: 'telefono', key: 'telefono', width: 18 },
        { header: 'email', key: 'email', width: 28 },
      ];

      // Estilo de la fila de cabecera (verde salvia Dequino con texto oscuro)
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FF1C281B' }, size: 11 };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6ECE5' }
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'left' };
      headerRow.height = 24;

      // Fila 1 de ejemplo
      worksheet.addRow({
        nombre: 'Agrotienda La Esmeralda, C.A.',
        rif: 'J-12345678-9',
        direccion: 'Av. Intercomunal Guarenas Guatire',
        telefono: '0414-1234567',
        email: 'ventas@laesmeralda.com'
      });

      // Fila 2 de ejemplo
      worksheet.addRow({
        nombre: 'Comercializadora San Miguel',
        rif: 'J-98765432-1',
        direccion: 'Calle Comercio Local 4',
        telefono: '0424-7654321',
        email: ''
      });

      // Bordes y alineación de todas las celdas
      worksheet.eachRow((row, rowNumber) => {
        row.height = rowNumber === 1 ? 24 : 20;
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          };
          if (rowNumber > 1) {
            cell.alignment = { vertical: 'middle', horizontal: 'left' };
          }
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Plantilla_Clientes_Dequino.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError('Error al generar la plantilla de ejemplo: ' + (err?.message || 'Error desconocido'));
    }
  };

  const handleImport = async () => {
    const validData = parsedData.filter(d => d.isValid);
    if (validData.length === 0) {
      setError('No se encontraron registros válidos (Deben tener Nombre/Razón Social y RIF)');
      return;
    }

    setLoading(true);
    setError(null);

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

  const validCount = parsedData.filter(d => d.isValid).length;
  const invalidCount = parsedData.length - validCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col border border-dequino-tertiary/40">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-[#FAF8F5]">
          <div>
            <span className="text-[10px] font-semibold tracking-widest text-[#B38E5D] uppercase mb-0.5 block">IMPORTACIÓN</span>
            <h2 className="text-xl font-bold text-dequino-secondary">Carga Masiva de Clientes</h2>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
          >
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
              {/* Botón Descargar Plantilla de Ejemplo */}
              <button 
                type="button"
                onClick={handleDescargarPlantilla}
                className="text-xs font-semibold text-dequino-primary hover:text-dequino-secondary flex items-center gap-1.5 underline underline-offset-4 cursor-pointer mb-3 mx-auto w-fit transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Descargar plantilla de ejemplo
              </button>

              {/* Caja de Instrucciones del Formato */}
              <div className="bg-[#FAF8F5] border border-dequino-tertiary/30 rounded-2xl p-4 text-xs space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
                  <span className="font-semibold text-dequino-secondary min-w-[130px]">Columnas obligatorias:</span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <code className="font-mono text-[11px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">nombre</code>
                    <code className="font-mono text-[11px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">rif</code>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
                  <span className="font-semibold text-dequino-secondary min-w-[130px]">Columnas opcionales:</span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <code className="font-mono text-[11px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">direccion</code>
                    <code className="font-mono text-[11px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">telefono</code>
                    <code className="font-mono text-[11px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">email</code>
                  </div>
                </div>
              </div>

              {/* Zona Dropzone para Carga de Archivo */}
              <div 
                className={`border-2 border-dashed rounded-2xl p-7 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                  isDragging 
                    ? 'border-dequino-primary bg-[#FAF8F5]' 
                    : 'border-slate-200 hover:bg-[#FAF8F5] hover:border-dequino-primary'
                }`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                <input 
                  type="file" 
                  accept=".xlsx, .xls, .csv" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                />
                <div className="w-12 h-12 bg-[#EEF3EC] text-dequino-secondary rounded-2xl flex items-center justify-center mb-3">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-dequino-secondary mb-1">
                  {fileName ? fileName : 'Sube tu archivo Excel o CSV'}
                </h3>
                <p className="text-xs text-slate-400 mb-4 max-w-xs">
                  Formatos compatibles: .xlsx o .csv
                </p>
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="px-4 py-2 bg-dequino-secondary hover:bg-[#2F3C2C] text-white rounded-xl text-xs font-medium shadow-sm transition-all"
                >
                  {fileName ? 'Cambiar Archivo' : 'Seleccionar Archivo'}
                </button>
              </div>

              {/* Vista previa de datos procesados */}
              {parsedData.length > 0 && (
                <div className="bg-[#FAF8F5] rounded-2xl p-4 border border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-700">
                      Vista previa ({validCount} válidos de {parsedData.length})
                    </p>
                    {invalidCount > 0 && (
                      <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-full font-medium">
                        {invalidCount} fila(s) omitidas (falta Nombre o RIF)
                      </span>
                    )}
                  </div>
                  
                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                    {parsedData.slice(0, 4).map((c, i) => (
                      <div 
                        key={i} 
                        className={`text-xs p-2.5 rounded-xl border flex items-center justify-between gap-3 ${
                          c.isValid 
                            ? 'bg-white border-slate-100' 
                            : 'bg-rose-50/50 border-rose-200'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <span className={`font-semibold block truncate ${c.razon_social ? 'text-dequino-secondary' : 'text-rose-500 italic'}`}>
                            {c.razon_social || 'Falta Nombre / Razón Social'}
                          </span>
                          {c.direccion && (
                            <span className="text-[10px] text-slate-400 block truncate">{c.direccion}</span>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className={`text-[11px] font-mono font-medium block ${c.rif_cedula ? 'text-slate-600' : 'text-rose-500 italic'}`}>
                            {c.rif_cedula || 'Falta RIF'}
                          </span>
                          {c.telefono && (
                            <span className="text-[10px] text-slate-400 block">{c.telefono}</span>
                          )}
                        </div>
                      </div>
                    ))}
                    {parsedData.length > 4 && (
                      <p className="text-[10px] text-center text-slate-400 pt-1">
                        ... y {parsedData.length - 4} más
                      </p>
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
              type="button"
              onClick={handleImport}
              disabled={loading || validCount === 0 || !!success}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-medium text-white bg-dequino-primary hover:bg-[#6C8264] rounded-2xl shadow-md shadow-dequino-primary/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              {loading ? 'Importando...' : `Importar ${validCount > 0 ? `(${validCount})` : ''} a Base de Datos`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
