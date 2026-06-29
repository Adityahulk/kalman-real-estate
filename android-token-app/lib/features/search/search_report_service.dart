import 'dart:io';

import 'package:csv/csv.dart';
import 'package:excel/excel.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;

import '../../data/app_database.dart';
import '../../shared/formatters.dart';
import 'search_models.dart';

class SearchReportService {
  Future<File> writeXlsx({
    required Project project,
    required SearchFilters filters,
    required List<SearchResult> results,
    Directory? outputDirectory,
  }) async {
    final excel = Excel.createExcel();
    const sheetName = 'Search Results';
    final sheet = excel[sheetName];
    excel.setDefaultSheet(sheetName);
    if (excel.sheets.containsKey('Sheet1')) excel.delete('Sheet1');

    const headers = _headers;
    sheet.appendRow(headers.map((item) => TextCellValue(item)).toList());
    for (var i = 0; i < headers.length; i++) {
      sheet.cell(CellIndex.indexByColumnRow(columnIndex: i, rowIndex: 0)).cellStyle = CellStyle(bold: true);
    }
    for (final result in results) {
      sheet.appendRow([
        TextCellValue(result.plotNumber),
        TextCellValue(result.customerName),
        TextCellValue(result.channelPartner),
        _numberCell(result.areaSqYards),
        _numberCell(result.ratePerSqYard),
        _numberCell(result.totalAmount),
        DoubleCellValue(result.totalReceived),
        _numberCell(result.totalPending),
        TextCellValue(result.stageSummary()),
      ]);
    }
    if (results.isEmpty) {
      sheet.appendRow([TextCellValue('No results')]);
    }

    final bytes = excel.save(fileName: _fileName(project.name, 'xlsx'));
    if (bytes == null) throw StateError('Could not generate XLSX.');
    final file = await _outputFile(project.name, _fileName(project.name, 'xlsx'), outputDirectory);
    await file.writeAsBytes(bytes, flush: true);
    return file;
  }

  Future<File> writeCsv({
    required Project project,
    required SearchFilters filters,
    required List<SearchResult> results,
    Directory? outputDirectory,
  }) async {
    final rows = <List<Object?>>[
      _headers,
      for (final result in results)
        [
          result.plotNumber,
          result.customerName,
          result.channelPartner,
          result.areaSqYards,
          result.ratePerSqYard,
          result.totalAmount,
          result.totalReceived,
          result.totalPending,
          result.stageSummary(),
        ],
      if (results.isEmpty) ['No results'],
    ];
    final file = await _outputFile(project.name, _fileName(project.name, 'csv'), outputDirectory);
    await file.writeAsString(const ListToCsvConverter().convert(rows), flush: true);
    return file;
  }

  Future<File> writePdf({
    required Project project,
    required SearchFilters filters,
    required List<SearchResult> results,
    Directory? outputDirectory,
  }) async {
    final pdf = pw.Document();
    pdf.addPage(
      pw.MultiPage(
        pageFormat: PdfPageFormat.a4.landscape,
        margin: const pw.EdgeInsets.all(20),
        build: (context) => [
          pw.Text('Search Results - ${project.name}', style: pw.TextStyle(fontSize: 16, fontWeight: pw.FontWeight.bold)),
          pw.SizedBox(height: 4),
          pw.Text('Generated: ${shortDate(DateTime.now())}'),
          pw.Text('Filters: ${filters.describe()}'),
          pw.SizedBox(height: 12),
          if (results.isEmpty)
            pw.Text('No results')
          else
            pw.Table(
              border: pw.TableBorder.all(color: PdfColors.grey600),
              columnWidths: const {
                0: pw.FlexColumnWidth(.8),
                1: pw.FlexColumnWidth(1.5),
                2: pw.FlexColumnWidth(1.5),
                3: pw.FlexColumnWidth(.8),
                4: pw.FlexColumnWidth(.9),
                5: pw.FlexColumnWidth(1),
                6: pw.FlexColumnWidth(1),
                7: pw.FlexColumnWidth(1),
                8: pw.FlexColumnWidth(2.6),
              },
              children: [
                pw.TableRow(
                  decoration: const pw.BoxDecoration(color: PdfColors.grey200),
                  children: _headers.map((header) => _cell(header, bold: true)).toList(),
                ),
                for (final result in results)
                  pw.TableRow(
                    children: [
                      _cell(result.plotNumber),
                      _cell(result.customerName),
                      _cell(result.channelPartner),
                      _cell(_number(result.areaSqYards)),
                      _cell(_moneyPdfOrDash(result.ratePerSqYard)),
                      _cell(_moneyPdfOrDash(result.totalAmount)),
                      _cell(_moneyPdfOrDash(result.totalReceived)),
                      _cell(_moneyPdfOrDash(result.totalPending)),
                      _cell(result.stageSummary()),
                    ],
                  ),
              ],
            ),
        ],
      ),
    );
    final file = await _outputFile(project.name, _fileName(project.name, 'pdf'), outputDirectory);
    await file.writeAsBytes(await pdf.save(), flush: true);
    return file;
  }

  static const _headers = [
    'Plot',
    'Customer',
    'Channel Partner',
    'Area',
    'Rate',
    'Total',
    'Received',
    'Pending',
    'Stage Details',
  ];

  CellValue _numberCell(double? value) {
    return value == null ? TextCellValue('-') : DoubleCellValue(value);
  }

  pw.Widget _cell(String text, {bool bold = false}) {
    return pw.Padding(
      padding: const pw.EdgeInsets.all(4),
      child: pw.Text(
        text,
        style: pw.TextStyle(fontSize: 8, fontWeight: bold ? pw.FontWeight.bold : pw.FontWeight.normal),
      ),
    );
  }

  String _number(double? value) => value == null ? '-' : value.toStringAsFixed(2);

  String _moneyPdfOrDash(double? value) => value == null ? '-' : 'Rs. ${value.toStringAsFixed(0)}';

  Future<File> _outputFile(String projectName, String fileName, Directory? outputDirectory) async {
    final base = outputDirectory ?? await getApplicationDocumentsDirectory();
    final dir = Directory(p.join(base.path, 'exports', _safeName(projectName)));
    if (!await dir.exists()) await dir.create(recursive: true);
    return File(p.join(dir.path, fileName));
  }

  String _fileName(String projectName, String extension) {
    final date = DateTime.now().toIso8601String().substring(0, 10);
    return 'search_results_${_safeName(projectName)}_$date.$extension';
  }

  String _safeName(String input) => input.replaceAll(RegExp(r'[^a-zA-Z0-9_-]+'), '_');
}
