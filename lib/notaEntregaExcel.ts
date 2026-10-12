import ExcelJS from 'exceljs';
import { formatProductName } from './productUtils';

export interface NotaEntregaData {
  correlativo: string;
  created_at: string;
  tipo_documento?: string;
  cliente?: {
    razon_social?: string | null;
    rif_cedula?: string | null;
    direccion?: string | null;
    telefono?: string | null;
  } | null;
  vendedor?: {
    nombre?: string | null;
  } | null;
  detalles: Array<{
    cantidad: number;
    precio_unitario?: number | null;
    producto?: {
      codigo?: string | null;
      nombre?: string | null;
      descripcion?: string | null;
      tamano_valor?: number | null;
      unidad_medida?: string | null;
      precio?: number | null;
      unidades_por_caja?: number | null;
      unidades_por_bulto?: number | null;
    } | null;
  }>;
}

export function buildNotaEntregaWorkbook(ExcelLib: typeof ExcelJS, order: any): ExcelJS.Workbook {
  const workbook = new ExcelLib.Workbook();
  workbook.creator = 'Dequino ERP';
  workbook.created = new Date();

  const ws = workbook.addWorksheet('Nota de Entrega', {
    pageSetup: {
      paperSize: 1 as any, // Letter
      orientation: 'portrait',
      fitToWidth: 1,
      fitToHeight: 1,
      margins: {
        left: 0.21,
        right: 0.1,
        top: 1.47,
        bottom: 0.4,
        header: 0,
        footer: 0
      }
    }
  });

  // Configuración de visualización y márgenes
  ws.views = [{ showGridLines: false }];
  (ws as any).pageMargins = {
    left: 0.21,
    right: 0.1,
    top: 1.47,
    bottom: 0.4,
    header: 0,
    footer: 0
  };

  // Anchos de Columna Obligatorios:
  // A: 3.0, B: 2.0, C: 8.0, D: 23.5, E: 9.5, F: 28.5, G: 3.0, H: 5.5, I: 9.0, J: 7.0, K: 7.0, L: 17.5, M: 12.0
  const colWidths = [3.0, 2.0, 8.0, 23.5, 9.5, 28.5, 3.0, 5.5, 9.0, 7.0, 7.0, 17.5, 12.0];
  colWidths.forEach((width, index) => {
    ws.getColumn(index + 1).width = width;
  });

  const fontName = 'Arial';

  const dateObj = new Date(order.created_at || Date.now());
  const fechaStr = dateObj.toLocaleDateString('es-VE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  // Filas 1 a 6: Estrictamente vacías (espacio de membrete físico)
  for (let r = 1; r <= 6; r++) {
    ws.getRow(r).values = [];
  }

  // Fila 7: Merge B7:K7 -> "NOTA DE ENTREGA:" | Merge L7:M7 -> "[correlativo]"
  ws.mergeCells('B7:K7');
  const b7 = ws.getCell('B7');
  b7.value = 'NOTA DE ENTREGA:';
  b7.font = { name: fontName, size: 20, bold: true };
  b7.alignment = { horizontal: 'right', vertical: 'middle' };

  ws.mergeCells('L7:M7');
  const l7 = ws.getCell('L7');
  l7.value = order.correlativo || '';
  l7.font = { name: fontName, size: 20, bold: true };
  l7.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(7).height = 28;

  // Fila 8: Merge B8:K8 -> "Guarenas:" | Merge L8:M8 -> "[Fecha DD/MM/AAAA]"
  ws.mergeCells('B8:K8');
  const b8 = ws.getCell('B8');
  b8.value = 'Guarenas:';
  b8.font = { name: fontName, size: 14, bold: true };
  b8.alignment = { horizontal: 'right', vertical: 'middle' };

  ws.mergeCells('L8:M8');
  const l8 = ws.getCell('L8');
  l8.value = fechaStr;
  l8.font = { name: fontName, size: 14 };
  l8.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(8).height = 20;

  // Fila 9: Merge B9:C9 -> "Cliente:" | Merge D9:H9 -> "[Nombre del Cliente]" | Merge I9:K9 -> "R.I.F:" | Merge L9:M9 -> "[RIF]"
  ws.mergeCells('B9:C9');
  const b9 = ws.getCell('B9');
  b9.value = 'Cliente:';
  b9.font = { name: fontName, size: 11, bold: true };
  b9.alignment = { horizontal: 'left', vertical: 'middle' };

  ws.mergeCells('D9:H9');
  const d9 = ws.getCell('D9');
  d9.value = order.cliente?.razon_social || '';
  d9.font = { name: fontName, size: 11, bold: true };
  d9.alignment = { horizontal: 'left', vertical: 'middle' };

  ws.mergeCells('I9:K9');
  const i9 = ws.getCell('I9');
  i9.value = 'R.I.F:';
  i9.font = { name: fontName, size: 13, bold: true };
  i9.alignment = { horizontal: 'right', vertical: 'middle' };

  ws.mergeCells('L9:M9');
  const l9 = ws.getCell('L9');
  l9.value = order.cliente?.rif_cedula || '';
  l9.font = { name: fontName, size: 13, bold: true };
  l9.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(9).height = 18;

  // Fila 10: Merge B10:C10 -> "Dirección:" | Merge D10:H11 -> "[Dirección]" | Merge I10:K10 -> "Teléfono:" | Merge L10:M10 -> "[Teléfono]"
  ws.mergeCells('B10:C10');
  const b10 = ws.getCell('B10');
  b10.value = 'Dirección:';
  b10.font = { name: fontName, size: 11, bold: true };
  b10.alignment = { horizontal: 'left', vertical: 'top' };

  ws.mergeCells('D10:H11');
  const d10 = ws.getCell('D10');
  d10.value = order.cliente?.direccion || '';
  d10.font = { name: fontName, size: 10, bold: true };
  d10.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };

  ws.mergeCells('I10:K10');
  const i10 = ws.getCell('I10');
  i10.value = 'Teléfono:';
  i10.font = { name: fontName, size: 13, bold: true };
  i10.alignment = { horizontal: 'right', vertical: 'middle' };

  ws.mergeCells('L10:M10');
  const l10 = ws.getCell('L10');
  l10.value = order.cliente?.telefono || '';
  l10.font = { name: fontName, size: 13 };
  l10.alignment = { horizontal: 'center', vertical: 'middle' };

  // Fila 12: Merge I12:K12 -> "Vendedor:" | Merge L12:M12 -> "[Vendedor]"
  ws.mergeCells('I12:K12');
  const i12 = ws.getCell('I12');
  i12.value = 'Vendedor:';
  i12.font = { name: fontName, size: 12, bold: true };
  i12.alignment = { horizontal: 'right', vertical: 'middle' };

  ws.mergeCells('L12:M12');
  const l12 = ws.getCell('L12');
  l12.value = order.vendedor?.nombre || '';
  l12.font = { name: fontName, size: 12 };
  l12.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(12).height = 18;

  // Fila 14: Cabecera de la tabla
  // B14:C14 "CODIGO", D14:H14 "DESCRIPCION", I14:J14 "CANTIDAD", K14 "CAJAS", L14 "PRECIO UNITARIO", M14 "TOTAL $"
  ws.mergeCells('B14:C14');
  ws.getCell('B14').value = 'CODIGO';
  ws.getCell('B14').alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('D14:H14');
  ws.getCell('D14').value = 'DESCRIPCION';
  ws.getCell('D14').alignment = { horizontal: 'left', vertical: 'middle' };

  ws.mergeCells('I14:J14');
  ws.getCell('I14').value = 'CANTIDAD';
  ws.getCell('I14').alignment = { horizontal: 'center', vertical: 'middle' };

  ws.getCell('K14').value = 'CAJAS';
  ws.getCell('K14').alignment = { horizontal: 'center', vertical: 'middle' };

  ws.getCell('L14').value = 'PRECIO UNITARIO';
  ws.getCell('L14').alignment = { horizontal: 'right', vertical: 'middle' };

  ws.getCell('M14').value = 'TOTAL $';
  ws.getCell('M14').alignment = { horizontal: 'right', vertical: 'middle' };

  const borderHorizontalOnly: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FF000000' } },
    bottom: { style: 'thin', color: { argb: 'FF000000' } }
  };

  // Aplicar fuente negrita y borde superior/inferior delgado en fila 14 (columnas B a M)
  for (let c = 2; c <= 13; c++) {
    const cell = ws.getRow(14).getCell(c);
    cell.font = { name: fontName, size: 10, bold: true };
    cell.border = borderHorizontalOnly;
  }
  ws.getRow(14).height = 20;

  // Fila 15: Espacio entre cabecera y productos
  ws.getRow(15).height = 6;

  // Filas 16 a 46 (Cuerpo de Productos)
  const items = order.detalles || [];
  let totalUnidades = 0;
  let totalCajas = 0;
  let subtotalCalculado = 0;

  for (let rowIdx = 16; rowIdx <= 46; rowIdx++) {
    const itemIndex = rowIdx - 16;
    const item = items[itemIndex];

    ws.mergeCells(`B${rowIdx}:C${rowIdx}`);
    ws.mergeCells(`D${rowIdx}:H${rowIdx}`);

    const cellB = ws.getCell(`B${rowIdx}`);
    const cellD = ws.getCell(`D${rowIdx}`);
    const cellI = ws.getCell(`I${rowIdx}`);
    const cellJ = ws.getCell(`J${rowIdx}`);
    const cellK = ws.getCell(`K${rowIdx}`);
    const cellL = ws.getCell(`L${rowIdx}`);
    const cellM = ws.getCell(`M${rowIdx}`);

    cellB.font = { name: fontName, size: 9 };
    cellB.alignment = { horizontal: 'center', vertical: 'middle' };

    cellD.font = { name: fontName, size: 9 };
    cellD.alignment = { horizontal: 'left', vertical: 'middle' };

    cellI.font = { name: fontName, size: 9 };
    cellI.alignment = { horizontal: 'center', vertical: 'middle' };
    cellI.numFmt = '#,##0';

    cellJ.font = { name: fontName, size: 8 };
    cellJ.alignment = { horizontal: 'center', vertical: 'middle' };

    cellK.font = { name: fontName, size: 9 };
    cellK.alignment = { horizontal: 'center', vertical: 'middle' };
    cellK.numFmt = '#,##0.00';

    cellL.font = { name: fontName, size: 9 };
    cellL.alignment = { horizontal: 'right', vertical: 'middle' };
    cellL.numFmt = '"$"#,##0.00';

    cellM.font = { name: fontName, size: 9 };
    cellM.alignment = { horizontal: 'right', vertical: 'middle' };
    cellM.numFmt = '"$"#,##0.00';

    if (item) {
      const qty = Number(item.cantidad) || 0;
      const udsPorCaja = Number(item.producto?.unidades_por_caja || item.producto?.unidades_por_bulto || 1) || 1;
      const cajas = udsPorCaja > 0 ? (qty / udsPorCaja) : 0;
      const precioU = Number(item.precio_unitario ?? item.producto?.precio ?? 0);
      const rowTotal = qty * precioU;

      totalUnidades += qty;
      totalCajas += cajas;
      subtotalCalculado += rowTotal;

      cellB.value = item.producto?.codigo || 'PT-';
      cellD.value = formatProductName(item.producto);
      cellI.value = qty;
      cellJ.value = 'UND';
      cellK.value = Number(cajas.toFixed(2));
      cellL.value = precioU;
      cellM.value = rowTotal;
    }
  }

  // Fila 50:
  // Merge C50:D50 -> "TOTAL DE UNIDADES" (11pt, negrita, con borde superior thin).
  // E50 -> Suma de unidades.
  // Merge I50:K50 -> "SUB-TOTAL" (11pt, negrita, con borde superior thin).
  // M50 -> Suma total $ (12pt, negrita, con bordes superior e inferior thin).
  ws.mergeCells('C50:D50');
  const c50 = ws.getCell('C50');
  c50.value = 'TOTAL DE UNIDADES';
  c50.font = { name: fontName, size: 11, bold: true };
  c50.alignment = { horizontal: 'left', vertical: 'middle' };
  c50.border = { top: { style: 'thin', color: { argb: 'FF000000' } } };
  ws.getCell('D50').border = { top: { style: 'thin', color: { argb: 'FF000000' } } };

  const e50 = ws.getCell('E50');
  e50.value = totalUnidades;
  e50.font = { name: fontName, size: 11, bold: true };
  e50.alignment = { horizontal: 'center', vertical: 'middle' };
  e50.numFmt = '#,##0';
  e50.border = { top: { style: 'thin', color: { argb: 'FF000000' } } };

  ws.mergeCells('I50:K50');
  const i50 = ws.getCell('I50');
  i50.value = 'SUB-TOTAL';
  i50.font = { name: fontName, size: 11, bold: true };
  i50.alignment = { horizontal: 'right', vertical: 'middle' };
  i50.border = { top: { style: 'thin', color: { argb: 'FF000000' } } };
  ws.getCell('J50').border = { top: { style: 'thin', color: { argb: 'FF000000' } } };
  ws.getCell('K50').border = { top: { style: 'thin', color: { argb: 'FF000000' } } };

  // Columna L50 borde superior para continuidad visual
  ws.getCell('L50').border = { top: { style: 'thin', color: { argb: 'FF000000' } } };

  const m50 = ws.getCell('M50');
  m50.value = subtotalCalculado;
  m50.font = { name: fontName, size: 12, bold: true };
  m50.alignment = { horizontal: 'right', vertical: 'middle' };
  m50.numFmt = '"$"#,##0.00';
  m50.border = {
    top: { style: 'thin', color: { argb: 'FF000000' } },
    bottom: { style: 'thin', color: { argb: 'FF000000' } }
  };

  // Fila 51:
  // Merge C51:D51 -> "TOTAL DE CAJAS" (11pt, negrita).
  // E51 -> Suma de cajas.
  ws.mergeCells('C51:D51');
  const c51 = ws.getCell('C51');
  c51.value = 'TOTAL DE CAJAS';
  c51.font = { name: fontName, size: 11, bold: true };
  c51.alignment = { horizontal: 'left', vertical: 'middle' };

  const e51 = ws.getCell('E51');
  e51.value = Number(totalCajas.toFixed(2));
  e51.font = { name: fontName, size: 11, bold: true };
  e51.alignment = { horizontal: 'center', vertical: 'middle' };
  e51.numFmt = '#,##0.00';

  // Si el documento es factura o tiene IVA, se puede colocar en Fila 52 o 51
  if (order.tipo_documento === 'factura') {
    const iva = subtotalCalculado * 0.16;
    const totalGral = subtotalCalculado + iva;

    ws.mergeCells('I51:K51');
    const i51 = ws.getCell('I51');
    i51.value = 'IVA (16%):';
    i51.font = { name: fontName, size: 11, bold: true };
    i51.alignment = { horizontal: 'right', vertical: 'middle' };

    const m51 = ws.getCell('M51');
    m51.value = iva;
    m51.font = { name: fontName, size: 11, bold: true };
    m51.alignment = { horizontal: 'right', vertical: 'middle' };
    m51.numFmt = '"$"#,##0.00';

    ws.mergeCells('I52:K52');
    const i52 = ws.getCell('I52');
    i52.value = 'TOTAL $';
    i52.font = { name: fontName, size: 12, bold: true };
    i52.alignment = { horizontal: 'right', vertical: 'middle' };

    const m52 = ws.getCell('M52');
    m52.value = totalGral;
    m52.font = { name: fontName, size: 12, bold: true };
    m52.alignment = { horizontal: 'right', vertical: 'middle' };
    m52.numFmt = '"$"#,##0.00';
    m52.border = {
      bottom: { style: 'double', color: { argb: 'FF000000' } }
    };
  }

  return workbook;
}

export async function generarNotaEntregaExcel(pedido: NotaEntregaData): Promise<void> {
  const workbook = buildNotaEntregaWorkbook(ExcelJS, pedido);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  const clienteSanitized = (pedido.cliente?.razon_social || 'Cliente')
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .substring(0, 30);
  const correlativoSanitized = (pedido.correlativo || 'Pedido').replace(/[^a-zA-Z0-9_\-]/g, '_');

  const fileName = `Nota_Entrega_${correlativoSanitized}_${clienteSanitized}.xlsx`;

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
