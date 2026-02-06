import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface MonthlyReportData {
    period: {
        month: number;
        year: number;
        startDate: string;
        endDate: string;
    };
    incomeByMethod: { method: string; total: number }[];
    totals: {
        income: number;
        expenses: number;
        balance: number;
    };
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-AR", {
        style: "currency",
        currency: "ARS",
        maximumFractionDigits: 0,
    }).format(amount);
};

// MODIFICACIÓN: Agregamos el parámetro opcional 'customFilename' al final
export const generateMonthlyReportPDF = (
    data: MonthlyReportData,
    businessName: string = "Mi Taller",
    customFilename?: string
) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    let finalY = 30;

    // --- ENCABEZADO ---
    doc.setFontSize(18);
    doc.text(businessName, pageWidth / 2, 15, { align: 'center' });

    doc.setFontSize(14);
    // Pequeño detalle: si hay nombre personalizado, asumimos que es un reporte específico (ej: Diario)
    const reportTitle = customFilename ? "Reporte de Caja" : "Reporte Mensual de Caja";
    doc.text(reportTitle, pageWidth / 2, 22, { align: 'center' });

    doc.setFontSize(10);
    doc.text(`Desde: ${format(new Date(data.period.startDate), 'dd/MM/yyyy', { locale: es })}`, 14, finalY);
    doc.text(`Hasta: ${format(new Date(data.period.endDate), 'dd/MM/yyyy', { locale: es })}`, pageWidth - 14, finalY, { align: 'right' });
    finalY += 15;

    // --- SECCIÓN 1: TOTALES POR FORMA DE PAGO ---
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Ingresos por Forma de Pago", 14, finalY);
    finalY += 5;

    const paymentMethodsData = data.incomeByMethod.map(item => [
        item.method.toUpperCase(),
        formatCurrency(item.total)
    ]);

    autoTable(doc, {
        startY: finalY,
        head: [['Forma de Pago', 'Monto']],
        body: paymentMethodsData,
        theme: 'plain',
        headStyles: { fillColor: [220, 220, 220], textColor: 20, fontStyle: 'bold' },
        columnStyles: {
            0: { cellWidth: 'auto' },
            1: { cellWidth: 60, halign: 'right' }
        },
        foot: [['Total Ingresos', formatCurrency(data.totals.income)]],
        footStyles: { fillColor: [240, 240, 240], textColor: 20, fontStyle: 'bold', halign: 'right' }
    });

    // @ts-ignore 
    finalY = doc.lastAutoTable.finalY + 20;


    // --- SECCIÓN 2: TOTALES GENERALES (Resumen estilo ticket) ---
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Resumen Financiero", 14, finalY);
    finalY += 5;

    autoTable(doc, {
        startY: finalY,
        body: [
            ['Total Cobrado (Ingresos):', formatCurrency(data.totals.income)],
            ['Total en Gastos (Egresos):', formatCurrency(data.totals.expenses)],
            ['Balance Neto en Caja:', formatCurrency(data.totals.balance)]
        ],
        theme: 'plain',
        styles: { fontSize: 11, cellPadding: 3 },
        columnStyles: {
            0: { fontStyle: 'bold' },
            1: { halign: 'right', fontStyle: 'bold' }
        },
        didParseCell: function (data) {
            if (data.row.index === 2) {
                data.cell.styles.fillColor = [230, 230, 230];
                data.cell.styles.fontSize = 12;
            }
        }
    });


    // --- PIE DE PÁGINA ---
    const today = format(new Date(), "dd/MM/yyyy HH:mm", { locale: es });
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Generado el: ${today}`, 14, doc.internal.pageSize.height - 10);

    // --- GUARDADO DEL ARCHIVO ---
    if (customFilename) {
        // Lógica para nombre personalizado (Ej: Reporte Diario)
        const name = customFilename.endsWith('.pdf') ? customFilename : `${customFilename}.pdf`;
        doc.save(name);
    } else {
        // Lógica por defecto (Mensual)
        const monthName = format(new Date(data.period.startDate), 'MMMM_yyyy', { locale: es });
        doc.save(`Reporte_Caja_${monthName}.pdf`);
    }
};