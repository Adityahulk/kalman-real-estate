import 'dart:io';
import 'dart:typed_data';

import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;

import '../../data/app_database.dart';
import '../../shared/formatters.dart';

class DocumentService {
  Future<File> writeEoiPdf({
    required Project project,
    required Plot plot,
    required EoiForm form,
    required List<PaymentSchedule> schedules,
  }) async {
    final pdf = pw.Document();
    pdf.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(28),
        build: (context) => [
          _header('RECEIPT', plot.plotNumber),
          _sectionTitle('1. PLOT BUYER DETAIL'),
          _fieldTable([
            ['NAME', form.buyerName ?? ''],
            ['S/O,D/O,W/O', form.guardianName ?? ''],
            ['ADDRESS', form.address ?? ''],
            ['CONTACT NO.', form.contactNo ?? ''],
            ['C/O (CP/BROKER/PROPERTY DEALER)', form.channelPartner ?? ''],
          ]),
          pw.SizedBox(height: 12),
          _sectionTitle('2. PLOT/SCO DETAIL'),
          _fieldTable([
            ['PLOT NO.', form.plotNumber ?? plot.plotNumber],
            ['AREA', form.areaSqYards?.toStringAsFixed(2) ?? ''],
            ['RATE PER SQ YD', form.ratePerSqYard == null ? '' : money(form.ratePerSqYard!)],
            ['TOTAL AMOUNT', form.totalAmount == null ? '' : money(form.totalAmount!)],
            ['IFMS CHARGES', form.ifmsCharges == null ? '' : money(form.ifmsCharges!)],
            ['IDC CHARGES', form.idcCharges == null ? '' : money(form.idcCharges!)],
            ['CLUB MEMBERSHIP', form.clubMembership ?? 'NA'],
          ]),
          pw.SizedBox(height: 12),
          _notes(form.notes),
          pw.SizedBox(height: 12),
          _sectionTitle('PAYMENT SCHEDULE'),
          _scheduleTable(schedules),
          pw.SizedBox(height: 42),
          _signatureRow(),
        ],
      ),
    );
    return _writePdf(project.name, 'eoi_plot_${plot.plotNumber}.pdf', await pdf.save());
  }

  Future<File> writePaymentPdf({
    required Project project,
    required Plot plot,
    required PaymentEntry payment,
  }) async {
    final holderSignature = await _imageProvider(payment.holderSignaturePath);
    final authorizedSignature = await _imageProvider(payment.authorizedSignaturePath);
    final pdf = pw.Document();
    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(36),
        build: (context) => pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          children: [
            pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              children: [
                pw.Text('PLOT/SCO/UNIT NO. ${plot.plotNumber}', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                pw.Text('1ST', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 18)),
              ],
            ),
            pw.SizedBox(height: 18),
            pw.Text('PAYMENT ACKNOWLEDGEMENT', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
            pw.SizedBox(height: 12),
            pw.Table(
              border: pw.TableBorder.all(color: PdfColors.grey700),
              columnWidths: const {
                0: pw.FlexColumnWidth(1.1),
                1: pw.FlexColumnWidth(3),
                2: pw.FlexColumnWidth(1.4),
                3: pw.FlexColumnWidth(1.4),
              },
              children: [
                pw.TableRow(
                  decoration: const pw.BoxDecoration(color: PdfColors.grey200),
                  children: [
                    _cell('DATE', bold: true),
                    _cell('AMOUNT (RS)& In Words', bold: true),
                    _cell('Plot Holder/CP Signature', bold: true),
                    _cell('Authorized Signature', bold: true),
                  ],
                ),
                pw.TableRow(
                  children: [
                    _cell(shortDate(payment.date)),
                    _cell('${money(payment.amount)}\n${payment.amountInWords ?? ''}'),
                    _signatureCell(holderSignature),
                    _signatureCell(authorizedSignature),
                  ],
                ),
                for (var i = 0; i < 12; i++)
                  pw.TableRow(children: [_cell(''), _cell(''), _cell(''), _cell('')]),
              ],
            ),
          ],
        ),
      ),
    );
    return _writePdf(project.name, 'payment_plot_${plot.plotNumber}_${payment.id}.pdf', await pdf.save());
  }

  pw.Widget _header(String title, String plotNumber) {
    return pw.Column(
      children: [
        pw.Row(
          mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
          children: [
            pw.Text('Unit No./Plot No. $plotNumber'),
            pw.Text('Date: ${shortDate(DateTime.now())}'),
          ],
        ),
        pw.SizedBox(height: 10),
        pw.Center(child: pw.Text(title, style: pw.TextStyle(fontWeight: pw.FontWeight.bold, decoration: pw.TextDecoration.underline))),
        pw.SizedBox(height: 14),
      ],
    );
  }

  pw.Widget _sectionTitle(String title) => pw.Padding(
        padding: const pw.EdgeInsets.only(bottom: 6),
        child: pw.Text(title, style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
      );

  pw.Widget _fieldTable(List<List<String>> rows) {
    return pw.Table(
      border: pw.TableBorder.all(color: PdfColors.grey700),
      columnWidths: const {0: pw.FlexColumnWidth(1.4), 1: pw.FlexColumnWidth(3.6)},
      children: rows.map((row) => pw.TableRow(children: [_cell(row[0], bold: true), _cell(row[1])])).toList(),
    );
  }

  pw.Widget _notes(String text) {
    return pw.Table(
      border: pw.TableBorder.all(color: PdfColors.grey700),
      children: text
          .split('\n')
          .where((line) => line.trim().isNotEmpty)
          .map((line) => pw.TableRow(children: [_cell(line.trim())]))
          .toList(),
    );
  }

  pw.Widget _scheduleTable(List<PaymentSchedule> schedules) {
    final rows = schedules.isEmpty
        ? [
            ['1', 'BOOKING - 1st INSTALLMENT', '25%', ''],
            ['2', 'IInd INSTALLMENT', '25%', ''],
            ['3', 'IIIrd INSTALLMENT', '25%', ''],
            ['4', 'IVth INSTALLMENT', '25%', ''],
          ]
        : schedules
            .asMap()
            .entries
            .map((entry) => [
                  '${entry.key + 1}',
                  entry.value.scheduleName,
                  '${entry.value.percentage.toStringAsFixed(0)}%',
                  entry.value.dueDate == null ? '' : shortDate(entry.value.dueDate!),
                ])
            .toList();
    return pw.Table(
      border: pw.TableBorder.all(color: PdfColors.grey700),
      columnWidths: const {
        0: pw.FlexColumnWidth(.6),
        1: pw.FlexColumnWidth(3.2),
        2: pw.FlexColumnWidth(1.2),
        3: pw.FlexColumnWidth(1.4),
      },
      children: [
        pw.TableRow(
          decoration: const pw.BoxDecoration(color: PdfColors.grey200),
          children: [_cell('SR.', bold: true), _cell('SCHEDULE', bold: true), _cell('PERCENTAGE', bold: true), _cell('DUE DATE', bold: true)],
        ),
        ...rows.map((row) => pw.TableRow(children: row.map(_cell).toList())),
      ],
    );
  }

  pw.Widget _signatureRow() {
    return pw.Row(
      mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
      children: [
        pw.Text('Signature of Plot Holder/CP'),
        pw.Text('Authorized Signatory'),
      ],
    );
  }

  pw.Widget _cell(String text, {bool bold = false}) {
    return pw.Padding(
      padding: const pw.EdgeInsets.all(6),
      child: pw.Text(text, style: pw.TextStyle(fontWeight: bold ? pw.FontWeight.bold : pw.FontWeight.normal)),
    );
  }

  pw.Widget _signatureCell(pw.MemoryImage? image) {
    return pw.Container(
      height: 54,
      padding: const pw.EdgeInsets.all(4),
      child: image == null ? pw.SizedBox() : pw.Image(image, fit: pw.BoxFit.contain),
    );
  }

  Future<pw.MemoryImage?> _imageProvider(String? path) async {
    if (path == null || path.isEmpty) return null;
    final file = File(path);
    if (!await file.exists()) return null;
    return pw.MemoryImage(await file.readAsBytes());
  }

  Future<File> _writePdf(String projectName, String fileName, Uint8List bytes) async {
    final base = await getApplicationDocumentsDirectory();
    final dir = Directory(p.join(base.path, 'exports', _safeName(projectName)));
    if (!await dir.exists()) await dir.create(recursive: true);
    final file = File(p.join(dir.path, fileName));
    await file.writeAsBytes(bytes, flush: true);
    return file;
  }

  String _safeName(String input) => input.replaceAll(RegExp(r'[^a-zA-Z0-9_-]+'), '_');
}
