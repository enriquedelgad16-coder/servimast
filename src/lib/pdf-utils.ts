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
  doc.text("SERVIMAST", logoImg ? 36 : 14, 18);
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
      `SERVIMAST - Sistema de Gestión de Nómina | Página ${i} de ${pageCount}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: "center" }
    );
  }

  const today = new Date().toISOString().split("T")[0];
  doc.save(fileName || `${title.replace(/\s+/g, "_")}_${today}.pdf`);
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

export function printElement(elementId: string) {
  const element = document.getElementById(elementId);
  if (!element) return;

  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>SERVIMAST - Imprimir</title>
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
      <div class="footer">SERVIMAST - Sistema de Gestión de Nómina | Impreso: ${new Date().toLocaleString("es-DO")}</div>
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
