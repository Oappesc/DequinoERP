import ExcelJS from 'exceljs';

export async function generateOrderExcelBuffer(order: any): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Pedido');

  // Column widths
  sheet.columns = [
    { key: 'codigo', width: 15 },
    { key: 'descripcion', width: 45 },
    { key: 'cantidad', width: 12 },
    { key: 'und', width: 10 },
    { key: 'cajas', width: 12 },
    { key: 'precio', width: 18 },
    { key: 'total', width: 18 },
  ];

  const isFactura = order.tipo_documento === 'factura';

  // Row 7: NOTA DE ENTREGA: [codigo_pedido]
  const titleRow = sheet.getRow(7);
  titleRow.getCell(1).value = (isFactura ? 'FACTURA: ' : 'NOTA DE ENTREGA: ') + order.correlativo;
  titleRow.getCell(1).font = { bold: true };
  sheet.mergeCells('A7:G7');

  // Row 8: Guarenas: [fecha_pedido]
  const dateRow = sheet.getRow(8);
  const formattedDate = new Date(order.created_at).toLocaleDateString('es-VE');
  dateRow.getCell(1).value = `Guarenas: ${formattedDate}`;
  sheet.mergeCells('A8:G8');

  // Row 9: Cliente: [cliente.nombre_empresa] | R.I.F: [cliente.rif]
  const clientRow = sheet.getRow(9);
  clientRow.getCell(1).value = `Cliente: ${order.cliente?.razon_social || 'N/A'} | R.I.F: ${order.cliente?.rif_cedula || 'N/A'}`;
  sheet.mergeCells('A9:G9');

  // Row 10: Dirección: [cliente.direccion] | Teléfono: [cliente.telefono]
  const contactRow = sheet.getRow(10);
  contactRow.getCell(1).value = `Dirección: ${order.cliente?.direccion || 'N/A'} | Teléfono: ${order.cliente?.telefono || 'N/A'}`;
  sheet.mergeCells('A10:G10');

  // Row 12: Vendedor: [vendedor.nombre]
  const vendorRow = sheet.getRow(12);
  vendorRow.getCell(1).value = `Vendedor: ${order.vendedor?.nombre || 'N/A'}`;
  sheet.mergeCells('A12:G12');

  // Row 14: Headers
  const headerRow = sheet.getRow(14);
  headerRow.values = {
    codigo: 'CODIGO',
    descripcion: 'DESCRIPCION',
    cantidad: 'CANTIDAD',
    und: 'UND',
    cajas: 'CAJAS',
    precio: 'PRECIO UNITARIO',
    total: 'TOTAL $',
  };
  headerRow.font = { bold: true };
  headerRow.eachCell((cell) => {
    cell.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  let startRow = 15;
  let totalUnidades = 0;
  let totalCajas = 0;
  let subTotal = 0;

  order.detalles?.forEach((item: any) => {
    const row = sheet.getRow(startRow);
    const qty = Number(item.cantidad);
    const udsPorBulto = item.producto?.unidades_por_bulto || 1;
    const cajas = qty / udsPorBulto;
    const precioU = Number(item.precio_unitario || item.producto?.precio || 0);
    const rowTotal = qty * precioU;
    
    row.values = {
      codigo: item.producto?.codigo || 'PT-',
      descripcion: item.producto?.descripcion || 'N/A',
      cantidad: qty,
      und: 'UND',
      cajas: cajas > 0 ? cajas : 0,
      precio: precioU,
      total: rowTotal,
    };

    totalUnidades += qty;
    totalCajas += cajas;
    subTotal += rowTotal;

    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    row.getCell('cantidad').alignment = { horizontal: 'center' };
    row.getCell('und').alignment = { horizontal: 'center' };
    row.getCell('cajas').alignment = { horizontal: 'center' };
    row.getCell('cajas').numFmt = '#,##0.##';
    row.getCell('precio').numFmt = '"$"#,##0.00';
    row.getCell('total').numFmt = '"$"#,##0.00';

    startRow++;
  });

  // Footer
  startRow++;
  const drawFooter = (rowObj: ExcelJS.Row, label: string, val: number, format?: string) => {
    rowObj.getCell(6).value = label;
    rowObj.getCell(6).font = { bold: true };
    rowObj.getCell(6).alignment = { horizontal: 'right' };
    rowObj.getCell(7).value = val;
    rowObj.getCell(7).font = { bold: true };
    if (format) rowObj.getCell(7).numFmt = format;
  };

  drawFooter(sheet.getRow(startRow++), 'TOTAL DE UNIDADES:', totalUnidades);
  drawFooter(sheet.getRow(startRow++), 'TOTAL DE CAJAS:', totalCajas, '#,##0.##');
  drawFooter(sheet.getRow(startRow++), 'SUB-TOTAL:', subTotal, '"$"#,##0.00');

  const ivaVal = isFactura ? subTotal * 0.16 : 0.00;
  drawFooter(sheet.getRow(startRow++), isFactura ? 'IVA (16%):' : 'IVA (0%):', ivaVal, '"$"#,##0.00');
  drawFooter(sheet.getRow(startRow++), 'TOTAL GRAL:', subTotal + ivaVal, '"$"#,##0.00');

  // Tasa BCV y equivalente en VES
  try {
    const { obtenerTasaBCVDB } = await import('./actions');
    const tasa = await Math.max(((await obtenerTasaBCVDB()) || 1) || 1, 0);
    if (tasa > 0) {
      startRow++;
      const vesRow = sheet.getRow(startRow);
      vesRow.getCell(4).value = `Tasa BCV: Bs. ${new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2 }).format(tasa)} / USD`;
      vesRow.getCell(4).font = { italic: true };
      sheet.mergeCells(vesRow.number, 4, vesRow.number, 5);

      vesRow.getCell(6).value = 'TOTAL (VES):';
      vesRow.getCell(6).font = { bold: true };
      vesRow.getCell(6).alignment = { horizontal: 'right' };

      const finalTotal = subTotal + ivaVal;
      vesRow.getCell(7).value = `Bs. ${new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2 }).format(finalTotal * tasa)}`;
      vesRow.getCell(7).font = { bold: true };
      vesRow.getCell(7).alignment = { horizontal: 'right' };
    }
  } catch (e) {
    console.error('Error adding BCV to excel', e);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as unknown as Buffer;
}
