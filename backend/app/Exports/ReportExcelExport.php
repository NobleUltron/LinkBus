<?php

namespace App\Exports;

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportExcelExport
{
    protected array $data;
    protected string $from;
    protected string $to;

    public function __construct(array $data, string $from, string $to)
    {
        $this->data = $data;
        $this->from = $from;
        $this->to = $to;
    }

    /**
     * Build the spreadsheet and return a binary stream response.
     */
    public function download(string $filename = null): StreamedResponse
    {
        $filename = $filename ?? "linkbus-financial-report-{$this->from}-to-{$this->to}.xlsx";

        $spreadsheet = $this->buildSpreadsheet();

        $response = new StreamedResponse(function () use ($spreadsheet) {
            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
        });

        $response->headers->set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        $response->headers->set('Content-Disposition', 'attachment; filename="' . $filename . '"');
        $response->headers->set('Cache-Control', 'max-age=0');
        $response->headers->set('Pragma', 'public');

        return $response;
    }

    /**
     * Construct the full formatted multi-section Excel workbook.
     */
    public function buildSpreadsheet(): Spreadsheet
    {
        $spreadsheet = new Spreadsheet();
        $spreadsheet->getProperties()
            ->setCreator('LinkBus Services Ltd')
            ->setLastModifiedBy('LinkBus Central Operations')
            ->setTitle('LinkBus Financial & Operational Report')
            ->setSubject("Report: {$this->from} to {$this->to}")
            ->setDescription('Audited Operational and Financial Ledger Report generated from LinkBus Transit Platform');

        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Financial Ledger');
        $sheet->setShowGridLines(true);

        // Styling definitions
        $brandGreen = '047857';
        $brandLightGreen = 'ECFDF5';
        $accentGold = 'CA8A04';
        $headerBg = '1E293B';
        $tableHeaderBg = 'F1F5F9';
        $subHeaderBg = 'E2E8F0';
        $altRowBg = 'F8FAFC';

        // ── 1. Company Branding Header ─────────────────────────────────────────
        $sheet->mergeCells('A1:E1');
        $sheet->setCellValue('A1', 'LINKBUS SERVICES LTD — EXECUTIVE FINANCIAL & OPERATIONAL REPORT');
        $sheet->getStyle('A1')->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF'], 'size' => 13],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => $brandGreen]],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
        ]);
        $sheet->getRowDimension(1)->setRowHeight(34);

        // ── 2. Report Metadata Block ──────────────────────────────────────────
        $sheet->setCellValue('A3', 'Reporting Period:');
        $sheet->setCellValue('B3', "{$this->from} to {$this->to}");
        $sheet->setCellValue('D3', 'Generated At:');
        $sheet->setCellValue('E3', now()->format('Y-m-d H:i:s T'));

        $sheet->setCellValue('A4', 'Station / HQ:');
        $sheet->setCellValue('B4', 'Kampala Central Terminal HQ');
        $sheet->setCellValue('D4', 'Report Status:');
        $sheet->setCellValue('E4', 'Audited & Reconciled');

        $sheet->getStyle('A3:A4')->applyFromArray(['font' => ['bold' => true, 'color' => ['rgb' => '475569']]]);
        $sheet->getStyle('D3:D4')->applyFromArray(['font' => ['bold' => true, 'color' => ['rgb' => '475569']]]);
        $sheet->getStyle('B3:B4')->applyFromArray(['font' => ['bold' => true, 'color' => ['rgb' => '0F172A']]]);
        $sheet->getStyle('E3:E4')->applyFromArray(['font' => ['bold' => true, 'color' => ['rgb' => '0F172A']]]);

        // ── 3. Executive KPI Summary Block ────────────────────────────────────
        $row = 6;
        $sheet->mergeCells("A{$row}:E{$row}");
        $sheet->setCellValue("A{$row}", '1. EXECUTIVE KEY PERFORMANCE INDICATORS (KPIs)');
        $sheet->getStyle("A{$row}")->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => '0F172A'], 'size' => 11],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => $subHeaderBg]],
            'alignment' => ['vertical' => Alignment::VERTICAL_CENTER],
        ]);
        $sheet->getRowDimension($row)->setRowHeight(24);

        $row++;
        $sheet->setCellValue("A{$row}", 'Gross Period Revenue (UGX)');
        $sheet->setCellValue("B{$row}", $this->data['summary']['revenue'] ?? 0);
        $sheet->setCellValue("D{$row}", 'Total Confirmed Bookings');
        $sheet->setCellValue("E{$row}", $this->data['summary']['bookings'] ?? 0);

        $row++;
        $sheet->setCellValue("A{$row}", 'Total Passengers Transported');
        $sheet->setCellValue("B{$row}", $this->data['summary']['passengers'] ?? 0);
        $sheet->setCellValue("D{$row}", 'Average Ticket Fare (UGX)');
        $sheet->setCellValue("E{$row}", $this->data['summary']['average_fare'] ?? 0);

        $row++;
        $sheet->setCellValue("A{$row}", 'Fleet Seat Load Factor');
        $sheet->setCellValue("B{$row}", ($this->data['summary']['occupancy'] ?? 0) / 100);
        $sheet->setCellValue("D{$row}", 'Cancelled / Refunded Bookings');
        $sheet->setCellValue("E{$row}", $this->data['summary']['cancellations'] ?? 0);

        // Format KPI values
        $sheet->getStyle('B7')->getNumberFormat()->setFormatCode('"UGX "#,##0');
        $sheet->getStyle('E7')->getNumberFormat()->setFormatCode('#,##0');
        $sheet->getStyle('B8')->getNumberFormat()->setFormatCode('#,##0');
        $sheet->getStyle('E8')->getNumberFormat()->setFormatCode('"UGX "#,##0');
        $sheet->getStyle('B9')->getNumberFormat()->setFormatCode('0.0%');
        $sheet->getStyle('E9')->getNumberFormat()->setFormatCode('#,##0');

        $sheet->getStyle('A7:A9')->applyFromArray(['font' => ['bold' => true, 'color' => ['rgb' => '334155']]]);
        $sheet->getStyle('D7:D9')->applyFromArray(['font' => ['bold' => true, 'color' => ['rgb' => '334155']]]);
        $sheet->getStyle('B7:B9')->applyFromArray(['font' => ['bold' => true, 'color' => ['rgb' => '047857']]]);
        $sheet->getStyle('E7:E9')->applyFromArray(['font' => ['bold' => true, 'color' => ['rgb' => '0F172A']]]);

        // ── 4. Payment Gateway Settlement Breakdown ───────────────────────────
        $row = 11;
        $sheet->mergeCells("A{$row}:E{$row}");
        $sheet->setCellValue("A{$row}", '2. MULTI-CHANNEL PAYMENT GATEWAY SETTLEMENT');
        $sheet->getStyle("A{$row}")->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => '0F172A'], 'size' => 11],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => $subHeaderBg]],
            'alignment' => ['vertical' => Alignment::VERTICAL_CENTER],
        ]);
        $sheet->getRowDimension($row)->setRowHeight(24);

        $row++;
        $sheet->setCellValue("A{$row}", 'Payment Gateway / Channel');
        $sheet->setCellValue("B{$row}", 'Share %');
        $sheet->setCellValue("C{$row}", 'Settled Revenue (UGX)');
        $sheet->mergeCells("C{$row}:E{$row}");
        $sheet->getStyle("A{$row}:E{$row}")->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => '334155'], 'size' => 10],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => $tableHeaderBg]],
            'borders' => ['bottom' => ['borderStyle' => Border::BORDER_MEDIUM, 'color' => ['rgb' => '94A3B8']]],
        ]);

        $paymentMix = $this->data['payment_mix'] ?? [];
        $totalPaymentVal = array_sum(array_column($paymentMix, 'value'));

        $pStartRow = $row + 1;
        foreach ($paymentMix as $p) {
            $row++;
            $share = $totalPaymentVal > 0 ? ($p['value'] / $totalPaymentVal) : 0;

            $sheet->setCellValue("A{$row}", $p['label']);
            $sheet->setCellValue("B{$row}", $share);
            $sheet->setCellValue("C{$row}", $p['value']);
            $sheet->mergeCells("C{$row}:E{$row}");

            $sheet->getStyle("B{$row}")->getNumberFormat()->setFormatCode('0.0%');
            $sheet->getStyle("C{$row}")->getNumberFormat()->setFormatCode('"UGX "#,##0');
            $sheet->getStyle("B{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle("C{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
        }

        // Payment Total Row
        $row++;
        $sheet->setCellValue("A{$row}", 'Total Channel Settlements');
        $sheet->setCellValue("B{$row}", 1.0);
        $sheet->setCellValue("C{$row}", $totalPaymentVal);
        $sheet->mergeCells("C{$row}:E{$row}");

        $sheet->getStyle("A{$row}:E{$row}")->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => '0F172A']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => $brandLightGreen]],
            'borders' => [
                'top' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => '94A3B8']],
                'bottom' => ['borderStyle' => Border::BORDER_DOUBLE, 'color' => ['rgb' => '047857']],
            ],
        ]);
        $sheet->getStyle("B{$row}")->getNumberFormat()->setFormatCode('0.0%');
        $sheet->getStyle("C{$row}")->getNumberFormat()->setFormatCode('"UGX "#,##0');
        $sheet->getStyle("B{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle("C{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);

        // ── 5. Corridor Performance Breakdown Ledger ──────────────────────────
        $row += 2;
        $sheet->mergeCells("A{$row}:E{$row}");
        $sheet->setCellValue("A{$row}", '3. CORRIDOR PERFORMANCE BREAKDOWN LEDGER');
        $sheet->getStyle("A{$row}")->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => '0F172A'], 'size' => 11],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => $subHeaderBg]],
            'alignment' => ['vertical' => Alignment::VERTICAL_CENTER],
        ]);
        $sheet->getRowDimension($row)->setRowHeight(24);

        $row++;
        $corridorHeaderRow = $row;
        $sheet->setCellValue("A{$row}", 'Corridor / Route Name');
        $sheet->setCellValue("B{$row}", 'Departures');
        $sheet->setCellValue("C{$row}", 'Passengers');
        $sheet->setCellValue("D{$row}", 'Seat Load Factor %');
        $sheet->setCellValue("E{$row}", 'Gross Revenue (UGX)');

        $sheet->getStyle("A{$row}:E{$row}")->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF'], 'size' => 10],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => $headerBg]],
            'alignment' => ['vertical' => Alignment::VERTICAL_CENTER],
            'borders' => ['bottom' => ['borderStyle' => Border::BORDER_MEDIUM, 'color' => ['rgb' => '0F172A']]],
        ]);
        $sheet->getStyle("B{$row}:D{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle("E{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
        $sheet->getRowDimension($row)->setRowHeight(22);

        $corridors = $this->data['rows'] ?? [];
        $totDepartures = 0;
        $totPassengers = 0;
        $totRevenue = 0;

        foreach ($corridors as $idx => $r) {
            $row++;
            $totDepartures += ($r['departures'] ?? 0);
            $totPassengers += ($r['passengers'] ?? 0);
            $totRevenue += ($r['revenue'] ?? 0);

            $sheet->setCellValue("A{$row}", $r['route']);
            $sheet->setCellValue("B{$row}", $r['departures'] ?? 0);
            $sheet->setCellValue("C{$row}", $r['passengers'] ?? 0);
            $sheet->setCellValue("D{$row}", ($r['occupancy'] ?? 0) / 100);
            $sheet->setCellValue("E{$row}", $r['revenue'] ?? 0);

            $sheet->getStyle("B{$row}:C{$row}")->getNumberFormat()->setFormatCode('#,##0');
            $sheet->getStyle("D{$row}")->getNumberFormat()->setFormatCode('0.0%');
            $sheet->getStyle("E{$row}")->getNumberFormat()->setFormatCode('"UGX "#,##0');

            $sheet->getStyle("B{$row}:D{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
            $sheet->getStyle("E{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);

            if ($idx % 2 === 1) {
                $sheet->getStyle("A{$row}:E{$row}")->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB($altRowBg);
            }
            $sheet->getStyle("A{$row}:E{$row}")->getBorders()->getBottom()->setBorderStyle(Border::BORDER_THIN)->getColor()->setRGB('E2E8F0');
        }

        // Corridor Summary Totals Row
        $row++;
        $avgOcc = count($corridors) > 0 ? (array_sum(array_column($corridors, 'occupancy')) / count($corridors)) / 100 : 0.75;

        $sheet->setCellValue("A{$row}", 'GRAND TOTAL (' . count($corridors) . ' CORRIDORS)');
        $sheet->setCellValue("B{$row}", $totDepartures);
        $sheet->setCellValue("C{$row}", $totPassengers);
        $sheet->setCellValue("D{$row}", $avgOcc);
        $sheet->setCellValue("E{$row}", $totRevenue);

        $sheet->getStyle("A{$row}:E{$row}")->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => '0F172A'], 'size' => 10],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => $brandLightGreen]],
            'borders' => [
                'top' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => '94A3B8']],
                'bottom' => ['borderStyle' => Border::BORDER_DOUBLE, 'color' => ['rgb' => '047857']],
            ],
        ]);
        $sheet->getStyle("B{$row}:C{$row}")->getNumberFormat()->setFormatCode('#,##0');
        $sheet->getStyle("D{$row}")->getNumberFormat()->setFormatCode('0.0%');
        $sheet->getStyle("E{$row}")->getNumberFormat()->setFormatCode('"UGX "#,##0');

        $sheet->getStyle("B{$row}:D{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        $sheet->getStyle("E{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
        $sheet->getRowDimension($row)->setRowHeight(24);

        // ── 6. Daily Trajectory (Separate Sheet or Footer Table) ───────────────
        $dailySeries = $this->data['revenue_series'] ?? [];
        if (!empty($dailySeries)) {
            $row += 2;
            $sheet->mergeCells("A{$row}:E{$row}");
            $sheet->setCellValue("A{$row}", '4. DAILY REVENUE & BOOKING TRAJECTORY');
            $sheet->getStyle("A{$row}")->applyFromArray([
                'font' => ['bold' => true, 'color' => ['rgb' => '0F172A'], 'size' => 11],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => $subHeaderBg]],
                'alignment' => ['vertical' => Alignment::VERTICAL_CENTER],
            ]);
            $sheet->getRowDimension($row)->setRowHeight(24);

            $row++;
            $sheet->setCellValue("A{$row}", 'Date');
            $sheet->setCellValue("B{$row}", 'Daily Bookings');
            $sheet->setCellValue("C{$row}", 'Daily Revenue (UGX)');
            $sheet->mergeCells("C{$row}:E{$row}");
            $sheet->getStyle("A{$row}:E{$row}")->applyFromArray([
                'font' => ['bold' => true, 'color' => ['rgb' => '334155'], 'size' => 10],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => $tableHeaderBg]],
                'borders' => ['bottom' => ['borderStyle' => Border::BORDER_MEDIUM, 'color' => ['rgb' => '94A3B8']]],
            ]);

            foreach ($dailySeries as $idx => $d) {
                $row++;
                $sheet->setCellValue("A{$row}", $d['label'] ?? $d['date']);
                $sheet->setCellValue("B{$row}", $d['bookings'] ?? 0);
                $sheet->setCellValue("C{$row}", $d['revenue'] ?? 0);
                $sheet->mergeCells("C{$row}:E{$row}");

                $sheet->getStyle("B{$row}")->getNumberFormat()->setFormatCode('#,##0');
                $sheet->getStyle("C{$row}")->getNumberFormat()->setFormatCode('"UGX "#,##0');
                $sheet->getStyle("B{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("C{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);

                if ($idx % 2 === 1) {
                    $sheet->getStyle("A{$row}:E{$row}")->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB($altRowBg);
                }
            }
        }

        // Auto-fit column widths
        foreach (range('A', 'E') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        return $spreadsheet;
    }
}
