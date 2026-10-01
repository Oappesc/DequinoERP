import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore
import PDFParser from 'pdf2json';

async function parsePdfBuffer(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser(null, true);
    pdfParser.on("pdfParser_dataError", (errData: any) => reject(errData.parserError));
    pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
        resolve(pdfParser.getRawTextContent());
    });
    pdfParser.parseBuffer(buffer);
  });
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Parse PDF using pdf2json
    const text = await parsePdfBuffer(buffer);

    const items: any[] = [];
    const lines = text.split('\n');
    const ptRegex = /PT-?\d+/i;

    for (const line of lines) {
      const match = line.match(ptRegex);
      if (match) {
        const pt = match[0].toUpperCase().replace('PT-', 'PT');
        
        const numbers = line.match(/\b\d+\b/g);
        let qty = 1; 
        
        if (numbers) {
          qty = parseInt(numbers[numbers.length - 1], 10);
        }

        items.push({
          pt: pt,
          cantidad: qty > 0 ? qty : 1
        });
      }
    }

    return NextResponse.json({ items, text });
  } catch (error: any) {
    console.error('PDF Parse error:', error);
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}
