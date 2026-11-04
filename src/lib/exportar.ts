import { ZONA_LIMA } from "@/lib/fechas";

// Exporta a Excel y PDF reales, generados en el navegador: se descargan directo
// y salen iguales en cualquier tema o dispositivo (window.print dependía del tema,
// del tamaño de pantalla y de que el navegador abriera la ventana de impresión).
// Las librerías pesan: se cargan solo al exportar.

export type TipoColumna = "texto" | "entero" | "moneda" | "fecha" | "fechaHora";

export interface ColumnaExport<T> {
  titulo: string;
  valor: (fila: T) => string | number | null | undefined;
  tipo?: TipoColumna; // "fecha": YYYY-MM-DD · "fechaHora": timestamp ISO
  total?: boolean; // suma la columna en la última fila
  ancho?: number; // peso relativo en el PDF
}

export interface ReporteExport<T> {
  titulo: string;
  subtitulo: string;
  archivo: string; // sin extensión
  columnas: ColumnaExport<T>[];
  filas: T[];
}

const NARANJA = "E8570C";
const TINTA = "0F172A";
const GRIS = "647080";
const FILA_ALTERNA = "F5F7FA";

const rgb = (h: string): [number, number, number] => [
  parseInt(h.slice(0, 2), 16),
  parseInt(h.slice(2, 4), 16),
  parseInt(h.slice(4, 6), 16),
];

const moneda = (n: number) => `S/ ${n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function fechaHoraTexto(iso: string): string {
  return new Date(iso).toLocaleString("es-PE", {
    timeZone: ZONA_LIMA,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function fechaTexto(fecha: string): string {
  const [a, m, d] = fecha.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

function textoCelda<T>(c: ColumnaExport<T>, fila: T): string {
  const v = c.valor(fila);
  if (v === null || v === undefined || v === "") return "—";
  if (c.tipo === "moneda") return moneda(Number(v));
  if (c.tipo === "fecha") return fechaTexto(String(v));
  if (c.tipo === "fechaHora") return fechaHoraTexto(String(v));
  return String(v);
}

function totalColumna<T>(c: ColumnaExport<T>, filas: T[]): number {
  return filas.reduce((s, f) => s + Number(c.valor(f) ?? 0), 0);
}

// Excel no maneja zonas horarias: guarda la fecha tal como se debe leer en Lima.
function fechaExcel(iso: string): Date {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_LIMA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const n = (t: string) => Number(p.find((x) => x.type === t)?.value);
  return new Date(Date.UTC(n("year"), n("month") - 1, n("day"), n("hour"), n("minute"), n("second")));
}

function guardar(contenido: BlobPart, tipo: string, nombre: string) {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

const generadoEl = () => `Generado el ${fechaHoraTexto(new Date().toISOString())}`;

/* ---------------------------------------------------------------- Excel */

export async function descargarExcel<T>(r: ReporteExport<T>) {
  const { default: ExcelJS } = await import("exceljs");
  const libro = new ExcelJS.Workbook();
  libro.creator = "GYMTRACK 360";
  libro.created = new Date();
  const hoja = libro.addWorksheet(r.titulo.slice(0, 31), { views: [{ state: "frozen", ySplit: 4 }] });
  const n = r.columnas.length;

  hoja.mergeCells(1, 1, 1, n);
  hoja.getCell(1, 1).value = `GYMTRACK 360 · ${r.titulo}`;
  hoja.getCell(1, 1).font = { bold: true, size: 14, color: { argb: `FF${NARANJA}` } };
  hoja.mergeCells(2, 1, 2, n);
  hoja.getCell(2, 1).value = `${r.subtitulo} · ${generadoEl()}`;
  hoja.getCell(2, 1).font = { size: 10, color: { argb: `FF${GRIS}` } };

  const cabecera = hoja.getRow(4);
  r.columnas.forEach((c, i) => {
    const celda = cabecera.getCell(i + 1);
    celda.value = c.titulo;
    celda.font = { bold: true, color: { argb: "FFFFFFFF" } };
    celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${TINTA}` } };
    celda.alignment = { vertical: "middle", horizontal: c.tipo === "moneda" || c.tipo === "entero" ? "right" : "left" };
  });
  cabecera.height = 22;

  r.filas.forEach((fila, idx) => {
    const f = hoja.getRow(5 + idx);
    r.columnas.forEach((c, i) => {
      const celda = f.getCell(i + 1);
      const v = c.valor(fila);
      if (v === null || v === undefined || v === "") {
        celda.value = null;
      } else if (c.tipo === "moneda") {
        celda.value = Number(v);
        celda.numFmt = '"S/" #,##0.00';
      } else if (c.tipo === "entero") {
        celda.value = Number(v);
      } else if (c.tipo === "fecha") {
        celda.value = new Date(`${String(v).slice(0, 10)}T00:00:00Z`);
        celda.numFmt = "dd/mm/yyyy";
      } else if (c.tipo === "fechaHora") {
        celda.value = fechaExcel(String(v));
        celda.numFmt = "dd/mm/yyyy hh:mm";
      } else {
        celda.value = String(v);
      }
      if (idx % 2 === 1) celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${FILA_ALTERNA}` } };
    });
  });

  const hayTotales = r.columnas.some((c) => c.total);
  if (hayTotales) {
    const f = hoja.getRow(5 + r.filas.length);
    r.columnas.forEach((c, i) => {
      const celda = f.getCell(i + 1);
      if (c.total) {
        const col = hoja.getColumn(i + 1).letter;
        celda.value = { formula: `SUM(${col}5:${col}${4 + r.filas.length})`, result: totalColumna(c, r.filas) };
        if (c.tipo === "moneda") celda.numFmt = '"S/" #,##0.00';
      } else if (i === 0) {
        celda.value = "Total";
      }
      celda.font = { bold: true };
      celda.border = { top: { style: "thin", color: { argb: `FF${TINTA}` } } };
    });
  }

  r.columnas.forEach((c, i) => {
    const largos = r.filas.slice(0, 500).map((f) => textoCelda(c, f).length);
    hoja.getColumn(i + 1).width = Math.min(48, Math.max(c.titulo.length, ...largos, 8) + 3);
  });

  if (r.filas.length > 0) {
    hoja.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4 + r.filas.length, column: n } };
  }

  const buffer = await libro.xlsx.writeBuffer();
  guardar(buffer, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", `${r.archivo}.xlsx`);
}

/* ---------------------------------------------------------------- PDF */

function encabezadoPdf(doc: import("jspdf").jsPDF, titulo: string, subtitulo: string) {
  const ancho = doc.internal.pageSize.getWidth();
  doc.setFillColor(...rgb(TINTA));
  doc.rect(0, 0, ancho, 62, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...rgb(NARANJA));
  doc.text("GYMTRACK 360", 36, 24);
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text(titulo, 36, 44);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(200, 208, 218);
  doc.text(subtitulo, ancho - 36, 44, { align: "right", maxWidth: ancho * 0.5 });
}

export async function descargarPdf<T>(r: ReporteExport<T>) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const apaisado = r.columnas.length > 4;
  const doc = new jsPDF({ orientation: apaisado ? "landscape" : "portrait", unit: "pt", format: "a4", compress: true });
  const pesoTotal = r.columnas.reduce((s, c) => s + (c.ancho ?? 1), 0);
  const anchoUtil = doc.internal.pageSize.getWidth() - 72;
  const derecha = (c: ColumnaExport<T>) => c.tipo === "moneda" || c.tipo === "entero";

  const pie = r.columnas.some((c) => c.total)
    ? [
        r.columnas.map((c, i) =>
          c.total
            ? c.tipo === "moneda"
              ? moneda(totalColumna(c, r.filas))
              : String(totalColumna(c, r.filas))
            : i === 0
              ? "Total"
              : ""
        ),
      ]
    : undefined;

  autoTable(doc, {
    startY: 78,
    margin: { top: 78, left: 36, right: 36, bottom: 40 },
    head: [r.columnas.map((c) => c.titulo)],
    body: r.filas.map((f) => r.columnas.map((c) => textoCelda(c, f))),
    foot: pie,
    showFoot: "lastPage",
    theme: "plain",
    styles: { font: "helvetica", fontSize: 9, cellPadding: { top: 5, bottom: 5, left: 6, right: 6 }, textColor: rgb(TINTA), overflow: "linebreak" },
    headStyles: { fillColor: rgb("E6EAF0"), textColor: rgb(TINTA), fontStyle: "bold", fontSize: 8.5 },
    footStyles: { fillColor: rgb("E6EAF0"), textColor: rgb(TINTA), fontStyle: "bold" },
    alternateRowStyles: { fillColor: rgb(FILA_ALTERNA) },
    columnStyles: Object.fromEntries(
      r.columnas.map((c, i) => [
        i,
        { cellWidth: (anchoUtil * (c.ancho ?? 1)) / pesoTotal, halign: derecha(c) ? ("right" as const) : ("left" as const) },
      ])
    ),
    didParseCell: (d) => {
      if (d.section !== "body" && derecha(r.columnas[d.column.index])) d.cell.styles.halign = "right";
    },
    didDrawPage: () => encabezadoPdf(doc, r.titulo, r.subtitulo),
  });

  const paginas = doc.getNumberOfPages();
  const ancho = doc.internal.pageSize.getWidth();
  const alto = doc.internal.pageSize.getHeight();
  for (let p = 1; p <= paginas; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...rgb(GRIS));
    doc.text(`${generadoEl()} · ${r.filas.length} ${r.filas.length === 1 ? "registro" : "registros"}`, 36, alto - 20);
    doc.text(`Página ${p} de ${paginas}`, ancho - 36, alto - 20, { align: "right" });
  }

  guardar(doc.output("arraybuffer"), "application/pdf", `${r.archivo}.pdf`);
}

/* ---------------------------------------------------------------- comprobantes */

export interface Comprobante {
  titulo: string; // "Boleta de pago"
  numero: string;
  monto: number;
  datos: [string, string][];
  nota: string;
  archivo: string;
}

// Boleta o recibo de una página, tamaño A5.
export async function descargarComprobante(c: Comprobante) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a5", compress: true });
  const ancho = doc.internal.pageSize.getWidth();

  encabezadoPdf(doc, c.titulo, `N.° ${c.numero}`);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...rgb(GRIS));
  doc.text("Total pagado", ancho / 2, 94, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.setTextColor(...rgb(TINTA));
  doc.text(moneda(c.monto), ancho / 2, 124, { align: "center" });

  let y = 156;
  c.datos.forEach(([k, v]) => {
    doc.setDrawColor(...rgb("E6EAF0"));
    doc.line(36, y - 13, ancho - 36, y - 13);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...rgb(GRIS));
    doc.text(k, 36, y + 2);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...rgb(TINTA));
    const lineas = doc.splitTextToSize(v, ancho - 170) as string[];
    doc.text(lineas, ancho - 36, y + 2, { align: "right" });
    y += 18 + (lineas.length - 1) * 12 + 8;
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...rgb(GRIS));
  doc.text(doc.splitTextToSize(c.nota, ancho - 72) as string[], 36, y + 8);

  guardar(doc.output("arraybuffer"), "application/pdf", `${c.archivo}.pdf`);
}
