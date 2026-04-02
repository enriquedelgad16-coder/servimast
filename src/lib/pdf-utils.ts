import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface PDFReportOptions {
  title: string;
  subtitle?: string;
  periodo?: string;
  columns: string[];
  data: (string | number)[][];
  totals?: (string | number)[];
  orientation?: "portrait" | "landscape";
  fileName?: string;
}

export async function generatePDFReport({
  title,
  subtitle,
  periodo,
  columns,
  data,
  totals,
  orientation = "portrait",
  fileName,
}: PDFReportOptions) {
  const doc = new jsPDF({ orientation, unit: "mm", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Load logo
  let logoImg: HTMLImageElement | null = null;
  try {
    logoImg = await loadImage("/logo-servimast.jpg");
  } catch {
    // Continue without logo
  }

  // Header
  if (logoImg) {
    doc.addImage(logoImg, "JPEG", 14, 10, 18, 18);
  }

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("SERVIMAST JPM", logoImg ? 36 : 14, 18);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text("Sistema de Seguridad y Redes", logoImg ? 36 : 14, 23);
  doc.text("RNC: 000-00000-0 | Tel: (809) 000-0000", logoImg ? 36 : 14, 27);

  // Report title - right aligned
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text(title, pageWidth - 14, 18, { align: "right" });

  if (subtitle) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80);
    doc.text(subtitle, pageWidth - 14, 23, { align: "right" });
  }

  if (periodo) {
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(`Período: ${periodo}`, pageWidth - 14, subtitle ? 27 : 23, {
      align: "right",
    });
  }

  // Divider line
  doc.setDrawColor(0, 150, 200);
  doc.setLineWidth(0.8);
  doc.line(14, 32, pageWidth - 14, 32);

  // Date
  doc.setFontSize(7);
  doc.setTextColor(140);
  doc.text(
    `Generado: ${new Date().toLocaleString("es-DO")}`,
    pageWidth - 14,
    36,
    { align: "right" }
  );

  // Table
  const bodyData = totals ? [...data, totals] : data;

  autoTable(doc, {
    startY: 40,
    head: [columns],
    body: bodyData,
    theme: "grid",
    headStyles: {
      fillColor: [15, 30, 50],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      halign: "center",
    },
    bodyStyles: {
      fontSize: 7.5,
      cellPadding: 2,
    },
    alternateRowStyles: {
      fillColor: [245, 248, 250],
    },
    styles: {
      lineWidth: 0.1,
      lineColor: [200, 200, 200],
    },
    didParseCell: function (hookData) {
      // Style totals row (last row if totals provided)
      if (totals && hookData.section === "body" && hookData.row.index === data.length) {
        hookData.cell.styles.fillColor = [15, 30, 50];
        hookData.cell.styles.textColor = [255, 255, 255];
        hookData.cell.styles.fontStyle = "bold";
      }
    },
    margin: { left: 14, right: 14 },
  });

  // Footer on each page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(
      `SERVIMAST JPM - Sistema de Gestión de Nómina | Página ${i} de ${pageCount}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: "center" }
    );
  }

  const today = new Date().toISOString().split("T")[0];
  doc.save(fileName || `${title.replace(/\s+/g, "_")}_${today}.pdf`);
}

// ---------------------------------------------------------------------------
// Sectioned Nomina PDF — prints nomina in readable sections
// ---------------------------------------------------------------------------

interface NominaSectionItem {
  empleado: string;
  numero: string;
  salarioBase: number;
  heD: number;
  heN: number;
  heF: number;
  instGpon: number;
  instRed: number;
  metas: number;
  otrosIng: number;
  descOtrosIng: string;
  subtotalDevengado: number;
  afp: number;
  sfs: number;
  isr: number;
  prestamos: number;
  faltas: number;
  otrosDesc: number;
  totalDeducciones: number;
  totalNeto: number;
  afpPat: number;
  sfsPat: number;
  srlPat: number;
}

interface SectionedNominaOptions {
  title: string;
  subtitle?: string;
  periodo: string;
  items: NominaSectionItem[];
  fileName?: string;
}

export async function generateSectionedNominaPDF({
  title,
  subtitle,
  periodo,
  items,
  fileName,
}: SectionedNominaOptions) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const fc = (n: number) => `RD$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Load logo
  let logoImg: HTMLImageElement | null = null;
  try {
    logoImg = await loadImage("/logo-servimast.jpg");
  } catch { /* continue */ }

  function addHeader() {
    if (logoImg) doc.addImage(logoImg, "JPEG", 14, 10, 18, 18);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text("SERVIMAST JPM", logoImg ? 36 : 14, 18);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("Sistema de Seguridad y Redes", logoImg ? 36 : 14, 23);
    doc.text("RNC: 000-00000-0 | Tel: (809) 000-0000", logoImg ? 36 : 14, 27);

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text(title, pageWidth - 14, 18, { align: "right" });
    if (subtitle) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80);
      doc.text(subtitle, pageWidth - 14, 23, { align: "right" });
    }
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(`Período: ${periodo}`, pageWidth - 14, subtitle ? 27 : 23, { align: "right" });
    doc.setDrawColor(0, 150, 200);
    doc.setLineWidth(0.8);
    doc.line(14, 32, pageWidth - 14, 32);
    doc.setFontSize(7);
    doc.setTextColor(140);
    doc.text(`Generado: ${new Date().toLocaleString("es-DO")}`, pageWidth - 14, 36, { align: "right" });
  }

  function addSectionTitle(y: number, text: string): number {
    if (y > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      addHeader();
      y = 42;
    }
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 30, 50);
    doc.text(text, 14, y);
    doc.setDrawColor(15, 30, 50);
    doc.setLineWidth(0.3);
    doc.line(14, y + 1, pageWidth - 14, y + 1);
    return y + 4;
  }

  const headStyle = {
    fillColor: [15, 30, 50] as [number, number, number],
    textColor: [255, 255, 255] as [number, number, number],
    fontStyle: "bold" as const,
    fontSize: 8,
    halign: "center" as const,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalRowStyle = (hookData: any, dataLen: number) => {
    if (hookData.section === "body" && hookData.row.index === dataLen) {
      hookData.cell.styles.fillColor = [15, 30, 50];
      hookData.cell.styles.textColor = [255, 255, 255];
      hookData.cell.styles.fontStyle = "bold";
    }
  };

  // ── Totals ──
  const sum = (fn: (i: NominaSectionItem) => number) => items.reduce((s, i) => s + fn(i), 0);
  const tSalBase = sum(i => i.salarioBase);
  const tRemuneraciones = sum(i => i.heD + i.heN + i.heF + i.instGpon + i.instRed + i.metas + i.otrosIng);
  const tDevengado = sum(i => i.subtotalDevengado);
  const tDeducciones = sum(i => i.totalDeducciones);
  const tNeto = sum(i => i.totalNeto);

  // ═══════════════════════════════════════════════════
  // SECTION 1: Resumen General
  // ═══════════════════════════════════════════════════
  addHeader();
  let startY = addSectionTitle(42, "1. RESUMEN GENERAL DE NÓMINA");

  const resumenData = items.map(i => {
    const totalRemuneraciones = i.heD + i.heN + i.heF + i.instGpon + i.instRed + i.metas + i.otrosIng;
    return [
      i.empleado, i.numero,
      fc(i.salarioBase), fc(totalRemuneraciones),
      fc(i.subtotalDevengado), fc(i.totalDeducciones), fc(i.totalNeto),
    ];
  });
  const resumenTotals = [
    "TOTALES", `${items.length}`,
    fc(tSalBase), fc(tRemuneraciones), fc(tDevengado), fc(tDeducciones), fc(tNeto),
  ];

  autoTable(doc, {
    startY,
    head: [["Empleado", "No.", "Salario Base", "Remuneraciones", "Devengado", "Deducciones", "NETO"]],
    body: [...resumenData, resumenTotals],
    theme: "grid",
    headStyles: headStyle,
    bodyStyles: { fontSize: 8, cellPadding: 2 },
    alternateRowStyles: { fillColor: [245, 248, 250] },
    styles: { lineWidth: 0.1, lineColor: [200, 200, 200] },
    columnStyles: {
      0: { cellWidth: 45 },
      1: { cellWidth: 16 },
      2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" },
      5: { halign: "right" }, 6: { halign: "right" },
    },
    didParseCell: (h) => totalRowStyle(h, resumenData.length),
    margin: { left: 10, right: 10 },
  });

  // ═══════════════════════════════════════════════════
  // SECTION 2: Remuneraciones y Comisiones
  // ═══════════════════════════════════════════════════
  doc.addPage();
  addHeader();
  startY = addSectionTitle(42, "2. REMUNERACIONES, COMISIONES Y HORAS EXTRAS");

  const remuData = items.map(i => [
    i.empleado, i.numero,
    fc(i.heD), fc(i.heN), fc(i.heF),
    fc(i.instGpon), fc(i.instRed), fc(i.metas), fc(i.otrosIng),
    i.descOtrosIng || "—",
    fc(i.heD + i.heN + i.heF + i.instGpon + i.instRed + i.metas + i.otrosIng),
  ]);
  const remuTotals = [
    "TOTALES", "",
    fc(sum(i => i.heD)), fc(sum(i => i.heN)), fc(sum(i => i.heF)),
    fc(sum(i => i.instGpon)), fc(sum(i => i.instRed)), fc(sum(i => i.metas)), fc(sum(i => i.otrosIng)),
    "", fc(tRemuneraciones),
  ];

  autoTable(doc, {
    startY,
    head: [["Empleado", "No.", "H.E. Diur.", "H.E. Noct.", "H.E. Fer.", "Inst. GPON", "Inst. Red", "Metas", "Otros Ing.", "Concepto", "Total Rem."]],
    body: [...remuData, remuTotals],
    theme: "grid",
    headStyles: { ...headStyle, fontSize: 6.5 },
    bodyStyles: { fontSize: 6.5, cellPadding: 1.5 },
    alternateRowStyles: { fillColor: [245, 248, 250] },
    styles: { lineWidth: 0.1, lineColor: [200, 200, 200], overflow: "linebreak" },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 14 },
      9: { cellWidth: 22, fontSize: 5.5 },
      2: { halign: "right", cellWidth: 16 }, 3: { halign: "right", cellWidth: 16 }, 4: { halign: "right", cellWidth: 16 },
      5: { halign: "right", cellWidth: 18 }, 6: { halign: "right", cellWidth: 16 }, 7: { halign: "right", cellWidth: 16 },
      8: { halign: "right", cellWidth: 16 }, 10: { halign: "right", cellWidth: 20 },
    },
    didParseCell: (h) => totalRowStyle(h, remuData.length),
    margin: { left: 10, right: 10 },
  });

  // ═══════════════════════════════════════════════════
  // SECTION 3: Deducciones del Empleado
  // ═══════════════════════════════════════════════════
  doc.addPage();
  addHeader();
  startY = addSectionTitle(42, "3. DEDUCCIONES DEL EMPLEADO");

  const dedData = items.map(i => [
    i.empleado, i.numero,
    fc(i.afp), fc(i.sfs), fc(i.isr), fc(i.prestamos), fc(i.faltas), fc(i.otrosDesc),
    fc(i.totalDeducciones),
  ]);
  const dedTotals = [
    "TOTALES", "",
    fc(sum(i => i.afp)), fc(sum(i => i.sfs)), fc(sum(i => i.isr)),
    fc(sum(i => i.prestamos)), fc(sum(i => i.faltas)), fc(sum(i => i.otrosDesc)),
    fc(tDeducciones),
  ];

  autoTable(doc, {
    startY,
    head: [["Empleado", "No.", "AFP (2.87%)", "SFS (3.04%)", "ISR", "Préstamos", "Faltas", "Otros Desc.", "Total Ded."]],
    body: [...dedData, dedTotals],
    theme: "grid",
    headStyles: headStyle,
    bodyStyles: { fontSize: 8, cellPadding: 2 },
    alternateRowStyles: { fillColor: [245, 248, 250] },
    styles: { lineWidth: 0.1, lineColor: [200, 200, 200] },
    columnStyles: {
      0: { cellWidth: 45 },
      1: { cellWidth: 16 },
      2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" },
      5: { halign: "right" }, 6: { halign: "right" }, 7: { halign: "right" },
      8: { halign: "right" },
    },
    didParseCell: (h) => totalRowStyle(h, dedData.length),
    margin: { left: 10, right: 10 },
  });

  // ═══════════════════════════════════════════════════
  // SECTION 4: Aportes Patronales
  // ═══════════════════════════════════════════════════
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prevY = (doc as any).lastAutoTable?.finalY || 42;
  startY = addSectionTitle(prevY + 10, "4. APORTES PATRONALES");

  const patData = items.map(i => [
    i.empleado, i.numero,
    fc(i.afpPat), fc(i.sfsPat), fc(i.srlPat),
    fc(i.afpPat + i.sfsPat + i.srlPat),
  ]);
  const tAfpPat = sum(i => i.afpPat);
  const tSfsPat = sum(i => i.sfsPat);
  const tSrlPat = sum(i => i.srlPat);
  const patTotals = [
    "TOTALES", "",
    fc(tAfpPat), fc(tSfsPat), fc(tSrlPat), fc(tAfpPat + tSfsPat + tSrlPat),
  ];

  autoTable(doc, {
    startY,
    head: [["Empleado", "No.", "AFP Pat. (7.10%)", "SFS Pat. (7.09%)", "SRL Pat. (1.20%)", "Total Patronal"]],
    body: [...patData, patTotals],
    theme: "grid",
    headStyles: headStyle,
    bodyStyles: { fontSize: 8, cellPadding: 2 },
    alternateRowStyles: { fillColor: [245, 248, 250] },
    styles: { lineWidth: 0.1, lineColor: [200, 200, 200] },
    columnStyles: {
      0: { cellWidth: 45 },
      1: { cellWidth: 16 },
      2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" },
      5: { halign: "right" },
    },
    didParseCell: (h) => totalRowStyle(h, patData.length),
    margin: { left: 10, right: 10 },
  });

  // ── Footer on all pages ──
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(
      `SERVIMAST JPM - Sistema de Gestión de Nómina | Página ${i} de ${pageCount}`,
      pageWidth / 2, pageHeight - 8, { align: "center" }
    );
  }

  const today = new Date().toISOString().split("T")[0];
  doc.save(fileName || `Nomina_Secciones_${today}.pdf`);
}

// ---------------------------------------------------------------------------
// Compact Bulk Payslips — 2 per page
// ---------------------------------------------------------------------------

export interface CompactPayslipItem {
  empleadoNombre: string;
  empleadoCedula: string;
  empleadoCargo: string;
  empleadoDepartamento: string;
  empleadoNumero: string;
  empleadoBanco?: string;
  empleadoCuenta?: string;
  salarioBase: number;
  montoExtrasDiurnas: number;
  montoExtrasNocturnas: number;
  montoExtrasFeriados: number;
  montoInstalacionesGpon: number;
  montoInstalacionesRed: number;
  metasCumplimiento: number;
  otrosIngresos: number;
  descripcionOtrosIngresos?: string;
  subtotalDevengado: number;
  deduccionFaltas: number;
  afpMonto: number;
  sfsMonto: number;
  isrMonto: number;
  deduccionPrestamos: number;
  otrosDescuentos: number;
  totalDeducciones: number;
  totalNeto: number;
}

interface CompactBulkOptions {
  periodo: string;
  periodoDescripcion?: string;
  items: CompactPayslipItem[];
  fileName?: string;
}

export async function generateCompactBulkPayslipsPDF({
  periodo,
  periodoDescripcion,
  items,
  fileName,
}: CompactBulkOptions) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const halfH = ph / 2;
  const fc = (n: number) => `RD$ ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  let logoImg: HTMLImageElement | null = null;
  try {
    logoImg = await loadImage("/logo-servimast.jpg");
  } catch { /* continue */ }

  function drawPayslip(item: CompactPayslipItem, offsetY: number) {
    const mx = 12; // left margin
    const mr = pw - 12; // right edge

    // ── Dashed separator at the top (except first slip on page) ──
    if (offsetY > 10) {
      doc.setDrawColor(180);
      doc.setLineWidth(0.2);
      // dashed line
      const dashLen = 3;
      for (let x = mx; x < mr; x += dashLen * 2) {
        doc.line(x, offsetY - 2, Math.min(x + dashLen, mr), offsetY - 2);
      }
    }

    let y = offsetY;

    // ── Company header (compact) ──
    if (logoImg) doc.addImage(logoImg, "JPEG", mx, y, 10, 10);
    const lx = logoImg ? mx + 12 : mx;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text("SERVIMAST JPM", lx, y + 4);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("Sistema de Seguridad y Redes", lx, y + 8);

    // Period + title on right
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text("RECIBO DE PAGO", mr, y + 4, { align: "right" });
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80);
    doc.text(`Período: ${periodo}`, mr, y + 8, { align: "right" });
    if (periodoDescripcion) {
      doc.text(periodoDescripcion, mr, y + 11.5, { align: "right" });
    }

    y += 13;
    doc.setDrawColor(0, 150, 200);
    doc.setLineWidth(0.5);
    doc.line(mx, y, mr, y);
    y += 3;

    // ── Employee info (2 lines) ──
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text(`${item.empleadoNombre}`, mx, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60);
    doc.text(`No. ${item.empleadoNumero}  |  Cédula: ${item.empleadoCedula}  |  ${item.empleadoCargo}  |  ${item.empleadoDepartamento}`, mx, y + 4);
    if (item.empleadoBanco) {
      doc.text(`Banco: ${item.empleadoBanco}${item.empleadoCuenta ? ` | Cta: ${item.empleadoCuenta}` : ""}`, mr, y + 4, { align: "right" });
    }
    y += 8;

    // ── Two-column layout: Ingresos | Deducciones ──
    const colW = (mr - mx - 4) / 2;
    const col1X = mx;
    const col2X = mx + colW + 4;

    // -- INGRESOS (left) --
    const ingRows: string[][] = [];
    ingRows.push(["Salario Base", fc(item.salarioBase)]);
    const totalExtras = item.montoExtrasDiurnas + item.montoExtrasNocturnas + item.montoExtrasFeriados;
    if (totalExtras > 0) ingRows.push(["Horas Extras", fc(totalExtras)]);
    const totalInst = item.montoInstalacionesGpon + item.montoInstalacionesRed;
    if (totalInst > 0) ingRows.push(["Instalaciones", fc(totalInst)]);
    if (item.metasCumplimiento > 0) ingRows.push(["Metas", fc(item.metasCumplimiento)]);
    if (item.otrosIngresos > 0) ingRows.push([item.descripcionOtrosIngresos ? `Otros (${item.descripcionOtrosIngresos})` : "Otros Ingresos", fc(item.otrosIngresos)]);

    autoTable(doc, {
      startY: y,
      head: [["INGRESOS", "Monto"]],
      body: ingRows,
      foot: [["DEVENGADO", fc(item.subtotalDevengado)]],
      theme: "grid",
      headStyles: { fillColor: [15, 30, 50], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 6.5, halign: "center" },
      bodyStyles: { fontSize: 6.5, cellPadding: 1.2 },
      footStyles: { fillColor: [230, 247, 255], textColor: [0, 0, 0], fontStyle: "bold", fontSize: 6.5 },
      columnStyles: { 1: { halign: "right" } },
      styles: { lineWidth: 0.1, lineColor: [200, 200, 200] },
      tableWidth: colW,
      margin: { left: col1X, right: pw - col1X - colW },
    });

    // -- DEDUCCIONES (right) --
    const dedRows: string[][] = [];
    if (item.deduccionFaltas > 0) dedRows.push(["Faltas", fc(item.deduccionFaltas)]);
    dedRows.push(["AFP (2.87%)", fc(item.afpMonto)]);
    dedRows.push(["SFS (3.04%)", fc(item.sfsMonto)]);
    if (item.isrMonto > 0) dedRows.push(["ISR", fc(item.isrMonto)]);
    if (item.deduccionPrestamos > 0) dedRows.push(["Préstamos", fc(item.deduccionPrestamos)]);
    if (item.otrosDescuentos > 0) dedRows.push(["Otros Desc.", fc(item.otrosDescuentos)]);

    autoTable(doc, {
      startY: y,
      head: [["DEDUCCIONES", "Monto"]],
      body: dedRows,
      foot: [["TOTAL DED.", fc(item.totalDeducciones)]],
      theme: "grid",
      headStyles: { fillColor: [120, 30, 30], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 6.5, halign: "center" },
      bodyStyles: { fontSize: 6.5, cellPadding: 1.2 },
      footStyles: { fillColor: [255, 230, 230], textColor: [0, 0, 0], fontStyle: "bold", fontSize: 6.5 },
      columnStyles: { 1: { halign: "right" } },
      styles: { lineWidth: 0.1, lineColor: [200, 200, 200] },
      tableWidth: colW,
      margin: { left: col2X, right: pw - col2X - colW },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tableEndY = (doc as any).lastAutoTable?.finalY || (y + 30);
    y = tableEndY + 3;

    // ── NET PAY box ──
    doc.setFillColor(15, 30, 50);
    doc.roundedRect(mx, y, mr - mx, 10, 1.5, 1.5, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("TOTAL NETO A RECIBIR:", mx + 6, y + 6.5);
    doc.setFontSize(11);
    doc.text(fc(item.totalNeto), mr - 6, y + 6.5, { align: "right" });
    y += 14;

    // ── Signature lines (compact) ──
    const sigW = (mr - mx - 30) / 2;
    doc.setDrawColor(0);
    doc.setLineWidth(0.2);
    doc.line(mx, y + 8, mx + sigW, y + 8);
    doc.line(mr - sigW, y + 8, mr, y + 8);
    doc.setFontSize(6.5);
    doc.setTextColor(80);
    doc.text("Firma del Empleado", mx + sigW / 2, y + 11, { align: "center" });
    doc.text("Firma Autorizada", mr - sigW / 2, y + 11, { align: "center" });
    doc.setFontSize(6);
    doc.setTextColor(120);
    doc.text(item.empleadoNombre, mx + sigW / 2, y + 14, { align: "center" });
    doc.text("SERVIMAST JPM", mr - sigW / 2, y + 14, { align: "center" });
  }

  // ── Render 2 payslips per page ──
  for (let i = 0; i < items.length; i++) {
    const isSecondOnPage = i % 2 === 1;
    if (i > 0 && !isSecondOnPage) doc.addPage();
    const offsetY = isSecondOnPage ? halfH + 3 : 8;
    drawPayslip(items[i], offsetY);
  }

  // ── Page numbers ──
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(6);
    doc.setTextColor(150);
    doc.text(
      `SERVIMAST JPM - Recibos de Pago | Página ${i} de ${pageCount} | ${new Date().toLocaleString("es-DO")}`,
      pw / 2, ph - 4, { align: "center" }
    );
  }

  doc.save(fileName || `Recibos_Compactos_${new Date().toISOString().split("T")[0]}.pdf`);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// ---------------------------------------------------------------------------
// Individual Payslip (Recibo de Pago) PDF
// ---------------------------------------------------------------------------

interface PayslipData {
  // Company
  companyName?: string;
  companySubtitle?: string;
  companyRNC?: string;
  companyPhone?: string;
  // Employee
  empleadoNombre: string;
  empleadoCedula: string;
  empleadoCargo: string;
  empleadoDepartamento: string;
  empleadoNumero: string;
  empleadoBanco?: string;
  empleadoCuenta?: string;
  // Period
  periodoInicio: string;
  periodoFin: string;
  periodoDescripcion?: string;
  // Earnings
  salarioBase: number;
  horasBase: number;
  tarifaHora: number;
  horasExtrasDiurnas: number;
  montoExtrasDiurnas: number;
  horasExtrasNocturnas: number;
  montoExtrasNocturnas: number;
  horasExtrasFeriados: number;
  montoExtrasFeriados: number;
  instalacionesGpon: number;
  montoInstalacionesGpon: number;
  instalacionesRed: number;
  montoInstalacionesRed: number;
  metasCumplimiento: number;
  otrosIngresos: number;
  descripcionOtrosIngresos?: string;
  subtotalDevengado: number;
  // Deductions
  faltasDias: number;
  deduccionFaltas: number;
  afpPorcentaje: number;
  afpMonto: number;
  sfsPorcentaje: number;
  sfsMonto: number;
  isrMonto: number;
  deduccionPrestamos: number;
  otrosDescuentos: number;
  descripcionOtrosDescuentos?: string;
  totalDeducciones: number;
  totalNeto: number;
  // Patronal (informational)
  afpPatronal: number;
  sfsPatronal: number;
  srlPatronal: number;
  // Loan balance
  balancePrestamo?: number;
  // Meta
  numeroComprobante?: string;
  tipo?: "quincenal" | "regalia";
}

export async function generatePayslipPDF(data: PayslipData, existingDoc?: jsPDF): Promise<jsPDF> {
  const doc = existingDoc || new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  if (existingDoc) doc.addPage();
  const pw = doc.internal.pageSize.getWidth();
  const isRegalia = data.tipo === "regalia";

  let logoImg: HTMLImageElement | null = null;
  try {
    logoImg = await loadImage("/logo-servimast.jpg");
  } catch { /* continue without logo */ }

  // ── Header ──
  if (logoImg) doc.addImage(logoImg, "JPEG", 14, 10, 16, 16);
  const lx = logoImg ? 34 : 14;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(data.companyName || "SERVIMAST JPM", lx, 17);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(data.companySubtitle || "Sistema de Seguridad y Redes", lx, 22);
  doc.text(`RNC: ${data.companyRNC || "000-00000-0"} | Tel: ${data.companyPhone || "(809) 000-0000"}`, lx, 26);

  // Title
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  const title = isRegalia ? "RECIBO DE REGALÍA PASCUAL" : "RECIBO DE PAGO";
  doc.text(title, pw - 14, 17, { align: "right" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80);
  doc.text(`Período: ${data.periodoInicio} — ${data.periodoFin}`, pw - 14, 22, { align: "right" });
  if (data.periodoDescripcion) {
    doc.text(data.periodoDescripcion, pw - 14, 26, { align: "right" });
  }
  if (data.numeroComprobante) {
    doc.setFontSize(7);
    doc.setTextColor(120);
    doc.text(`Comprobante: ${data.numeroComprobante}`, pw - 14, 30, { align: "right" });
  }

  // Divider
  doc.setDrawColor(0, 150, 200);
  doc.setLineWidth(0.8);
  doc.line(14, 32, pw - 14, 32);

  // ── Employee Info ──
  let y = 38;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text("DATOS DEL EMPLEADO", 14, y);
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const empInfo = [
    [`Nombre: ${data.empleadoNombre}`, `No. Empleado: ${data.empleadoNumero}`],
    [`Cédula: ${data.empleadoCedula}`, `Departamento: ${data.empleadoDepartamento}`],
    [`Cargo: ${data.empleadoCargo}`, data.empleadoBanco ? `Banco: ${data.empleadoBanco} | Cta: ${data.empleadoCuenta || "—"}` : ""],
  ];
  for (const row of empInfo) {
    doc.setTextColor(60);
    doc.text(row[0], 14, y);
    if (row[1]) doc.text(row[1], pw / 2 + 10, y);
    y += 4.5;
  }

  y += 3;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(14, y, pw - 14, y);
  y += 5;

  // ── Earnings Table ──
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text("INGRESOS / DEVENGADO", 14, y);
  y += 2;

  const fmtC = (n: number) => `RD$ ${n.toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const earningsRows: (string | number)[][] = [];
  earningsRows.push(["Salario Base", `${data.horasBase}h × ${fmtC(data.tarifaHora)}`, fmtC(data.salarioBase)]);
  if (data.horasExtrasDiurnas > 0) earningsRows.push(["Horas Extras Diurnas", `${data.horasExtrasDiurnas}h`, fmtC(data.montoExtrasDiurnas)]);
  if (data.horasExtrasNocturnas > 0) earningsRows.push(["Horas Extras Nocturnas", `${data.horasExtrasNocturnas}h`, fmtC(data.montoExtrasNocturnas)]);
  if (data.horasExtrasFeriados > 0) earningsRows.push(["Horas Extras Feriados", `${data.horasExtrasFeriados}h`, fmtC(data.montoExtrasFeriados)]);
  if (data.instalacionesGpon > 0) earningsRows.push(["Instalaciones GPON", `${data.instalacionesGpon} inst.`, fmtC(data.montoInstalacionesGpon)]);
  if (data.instalacionesRed > 0) earningsRows.push(["Instalaciones Red", `${data.instalacionesRed} inst.`, fmtC(data.montoInstalacionesRed)]);
  if (data.metasCumplimiento > 0) earningsRows.push(["Metas / Cumplimiento", "", fmtC(data.metasCumplimiento)]);
  if (data.otrosIngresos > 0) earningsRows.push([`Comisiones / Otros Ingresos${data.descripcionOtrosIngresos ? ` (${data.descripcionOtrosIngresos})` : ""}`, "", fmtC(data.otrosIngresos)]);
  earningsRows.push(["SUBTOTAL DEVENGADO", "", fmtC(data.subtotalDevengado)]);

  autoTable(doc, {
    startY: y,
    head: [["Concepto", "Detalle", "Monto"]],
    body: earningsRows,
    theme: "grid",
    headStyles: { fillColor: [15, 30, 50], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7.5, halign: "center" },
    bodyStyles: { fontSize: 7.5, cellPadding: 1.8 },
    columnStyles: { 0: { cellWidth: 70 }, 2: { halign: "right", fontStyle: "bold" } },
    styles: { lineWidth: 0.1, lineColor: [200, 200, 200] },
    alternateRowStyles: { fillColor: [245, 248, 250] },
    didParseCell: function (hookData) {
      if (hookData.section === "body" && hookData.row.index === earningsRows.length - 1) {
        hookData.cell.styles.fillColor = [230, 247, 255];
        hookData.cell.styles.fontStyle = "bold";
      }
    },
    margin: { left: 14, right: 14 },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 5;

  // ── Deductions Table ──
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text("DEDUCCIONES", 14, y);
  y += 2;

  const deductionRows: (string | number)[][] = [];
  if (data.faltasDias > 0) deductionRows.push(["Faltas", `${data.faltasDias} día(s)`, fmtC(data.deduccionFaltas)]);
  deductionRows.push(["AFP (Empleado)", `${(data.afpPorcentaje * 100).toFixed(2)}%`, fmtC(data.afpMonto)]);
  deductionRows.push(["SFS (Empleado)", `${(data.sfsPorcentaje * 100).toFixed(2)}%`, fmtC(data.sfsMonto)]);
  if (data.isrMonto > 0) deductionRows.push(["ISR", "Retención quincenal", fmtC(data.isrMonto)]);
  if (data.deduccionPrestamos > 0) deductionRows.push(["Préstamos", "Cuota quincenal", fmtC(data.deduccionPrestamos)]);
  if (data.otrosDescuentos > 0) deductionRows.push([`Otros Descuentos${data.descripcionOtrosDescuentos ? ` (${data.descripcionOtrosDescuentos})` : ""}`, "", fmtC(data.otrosDescuentos)]);
  deductionRows.push(["TOTAL DEDUCCIONES", "", fmtC(data.totalDeducciones)]);

  autoTable(doc, {
    startY: y,
    head: [["Concepto", "Detalle", "Monto"]],
    body: deductionRows,
    theme: "grid",
    headStyles: { fillColor: [120, 30, 30], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7.5, halign: "center" },
    bodyStyles: { fontSize: 7.5, cellPadding: 1.8 },
    columnStyles: { 0: { cellWidth: 70 }, 2: { halign: "right", fontStyle: "bold" } },
    styles: { lineWidth: 0.1, lineColor: [200, 200, 200] },
    alternateRowStyles: { fillColor: [255, 245, 245] },
    didParseCell: function (hookData) {
      if (hookData.section === "body" && hookData.row.index === deductionRows.length - 1) {
        hookData.cell.styles.fillColor = [255, 230, 230];
        hookData.cell.styles.fontStyle = "bold";
      }
    },
    margin: { left: 14, right: 14 },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 6;

  // ── Net Pay Box ──
  doc.setFillColor(15, 30, 50);
  doc.roundedRect(14, y, pw - 28, 14, 2, 2, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("TOTAL NETO A RECIBIR:", 20, y + 9);
  doc.setFontSize(14);
  doc.text(fmtC(data.totalNeto), pw - 20, y + 9, { align: "right" });

  y += 20;

  // ── Employer Contributions (informational) ──
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120);
  doc.text(
    `Aportes Patronales (info.): AFP ${fmtC(data.afpPatronal)} | SFS ${fmtC(data.sfsPatronal)} | SRL ${fmtC(data.srlPatronal)} | Total: ${fmtC(data.afpPatronal + data.sfsPatronal + data.srlPatronal)}`,
    14, y
  );
  y += 6;

  // ── Loan Balance ──
  if (data.balancePrestamo !== undefined && data.balancePrestamo > 0) {
    doc.setFillColor(255, 248, 230);
    doc.roundedRect(14, y, pw - 28, 10, 1.5, 1.5, "F");
    doc.setDrawColor(217, 169, 56);
    doc.setLineWidth(0.3);
    doc.roundedRect(14, y, pw - 28, 10, 1.5, 1.5, "S");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(120, 80, 0);
    doc.text("Balance de Préstamo después de esta quincena:", 20, y + 6.5);
    doc.setFontSize(9);
    doc.text(fmtC(data.balancePrestamo), pw - 20, y + 6.5, { align: "right" });
    y += 14;
  } else {
    y += 4;
  }

  // ── Signature Lines ──
  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  const sigWidth = (pw - 28 - 20) / 2;
  doc.line(14, y + 15, 14 + sigWidth, y + 15);
  doc.line(pw - 14 - sigWidth, y + 15, pw - 14, y + 15);

  doc.setFontSize(8);
  doc.setTextColor(60);
  doc.text("Firma del Empleado", 14 + sigWidth / 2, y + 20, { align: "center" });
  doc.text(data.empleadoNombre, 14 + sigWidth / 2, y + 24, { align: "center" });
  doc.text("Firma Autorizada", pw - 14 - sigWidth / 2, y + 20, { align: "center" });
  doc.text(data.companyName || "SERVIMAST JPM", pw - 14 - sigWidth / 2, y + 24, { align: "center" });

  doc.setFontSize(7);
  doc.setTextColor(140);
  doc.text(`Cédula: ${data.empleadoCedula}`, 14 + sigWidth / 2, y + 28, { align: "center" });

  // ── Footer ──
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(6.5);
  doc.setTextColor(150);
  doc.text(
    `SERVIMAST JPM - ${isRegalia ? "Recibo de Regalía Pascual" : "Recibo de Pago"} | Generado: ${new Date().toLocaleString("es-DO")}`,
    pw / 2, pageHeight - 8,
    { align: "center" }
  );
  doc.text(
    "Este documento es un comprobante de pago. Conserve para sus registros.",
    pw / 2, pageHeight - 5,
    { align: "center" }
  );

  if (!existingDoc) {
    const fname = isRegalia
      ? `Recibo_Regalia_${data.empleadoNumero}_${data.periodoInicio}.pdf`
      : `Recibo_Pago_${data.empleadoNumero}_${data.periodoInicio}_${data.periodoFin}.pdf`;
    doc.save(fname);
  }
  return doc;
}

export function printElement(elementId: string) {
  const element = document.getElementById(elementId);
  if (!element) return;

  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>SERVIMAST JPM - Imprimir</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; font-size: 11px; }
        th { background: #0f1e32; color: white; font-weight: bold; }
        tr:nth-child(even) { background: #f5f8fa; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f1e32; padding-bottom: 12px; margin-bottom: 16px; }
        .logo-section { display: flex; align-items: center; gap: 12px; }
        .logo-section img { width: 50px; height: 50px; border-radius: 8px; }
        .company-name { font-size: 20px; font-weight: bold; }
        .company-sub { font-size: 11px; color: #666; }
        .report-title { font-size: 16px; font-weight: bold; text-align: right; }
        .report-sub { font-size: 10px; color: #666; text-align: right; }
        .totals-row { background: #0f1e32 !important; color: white !important; font-weight: bold; }
        .totals-row td { color: white !important; }
        .stat-card { display: inline-block; border: 1px solid #ddd; border-radius: 8px; padding: 12px 16px; margin: 4px; min-width: 150px; }
        .stat-label { font-size: 10px; color: #666; }
        .stat-value { font-size: 18px; font-weight: bold; }
        .footer { margin-top: 20px; text-align: center; font-size: 9px; color: #999; border-top: 1px solid #ddd; padding-top: 8px; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      ${element.innerHTML}
      <div class="footer">SERVIMAST JPM - Sistema de Gestión de Nómina | Impreso: ${new Date().toLocaleString("es-DO")}</div>
    </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 500);
}
