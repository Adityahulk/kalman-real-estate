import 'dart:convert';
import 'dart:io';

import 'package:csv/csv.dart';
import 'package:file_picker/file_picker.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

import '../../data/app_database.dart';

class ExportService {
  ExportService(this.db);

  final AppDatabase db;

  Future<File> writeProjectBackup(int projectId) async {
    final data = await _projectSnapshot(projectId);
    final project = await (db.select(db.projects)..where((tbl) => tbl.id.equals(projectId))).getSingle();
    final file = await _file(project.name, 'backup_project_$projectId.json');
    await file.writeAsString(const JsonEncoder.withIndent('  ').convert(data), flush: true);
    return file;
  }

  Future<File> writeCsvBundle(int projectId) async {
    final data = await _projectSnapshot(projectId);
    final project = await (db.select(db.projects)..where((tbl) => tbl.id.equals(projectId))).getSingle();
    final file = await _file(project.name, 'project_$projectId.csv');
    final rows = <List<Object?>>[
      ['TYPE', 'ID', 'NAME/CODE', 'STATUS', 'AMOUNT', 'DETAIL'],
      for (final buyer in data['buyers'] as List) ['BUYER', buyer['id'], buyer['name'], '', '', buyer['channelPartner']],
      for (final token in data['tokens'] as List) ['TOKEN', token['id'], token['tokenCode'], token['status'], token['amount'], 'buyer ${token['buyerId']}'],
      for (final plot in data['plots'] as List) ['PLOT', plot['id'], plot['plotNumber'], plot['status'], '', 'buyer ${plot['holderBuyerId'] ?? ''}'],
      for (final payment in data['payments'] as List) ['PAYMENT', payment['id'], payment['paymentType'], '', payment['amount'], 'plot ${payment['plotId'] ?? ''}'],
      for (final history in data['history'] as List) ['HISTORY', history['id'], history['actionType'], '', history['amount'] ?? '', history['note'] ?? ''],
    ];
    await file.writeAsString(const ListToCsvConverter().convert(rows), flush: true);
    return file;
  }

  Future<BackupValidationResult?> pickAndValidateBackup() async {
    final picked = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['json'],
      allowMultiple: false,
    );
    final path = picked?.files.single.path;
    if (path == null) return null;
    return validateBackupFile(File(path));
  }

  Future<BackupValidationResult> validateBackupFile(File file) async {
    final decoded = jsonDecode(await file.readAsString());
    if (decoded is! Map<String, Object?>) {
      return const BackupValidationResult(isValid: false, message: 'Backup file is not a valid project backup.');
    }
    if (decoded['schemaVersion'] != db.schemaVersion) {
      return BackupValidationResult(
        isValid: false,
        message: 'Backup schema ${decoded['schemaVersion']} does not match app schema ${db.schemaVersion}.',
      );
    }
    final project = decoded['project'];
    final projectName = project is Map ? project['name'] : null;
    if (projectName is! String || projectName.trim().isEmpty) {
      return const BackupValidationResult(isValid: false, message: 'Backup is missing project name.');
    }
    final missingSignatures = <String>[];
    final payments = decoded['payments'];
    if (payments is List) {
      for (final payment in payments.whereType<Map>()) {
        for (final key in ['holderSignaturePath', 'authorizedSignaturePath']) {
          final signaturePath = payment[key];
          if (signaturePath is String && signaturePath.isNotEmpty && !await File(signaturePath).exists()) {
            missingSignatures.add(signaturePath);
          }
        }
      }
    }
    if (missingSignatures.isNotEmpty) {
      return BackupValidationResult(
        isValid: false,
        message: 'Backup is readable, but ${missingSignatures.length} signature file(s) are missing on this device.',
      );
    }
    return BackupValidationResult(isValid: true, message: 'Backup for $projectName is valid.', file: file);
  }

  Future<Map<String, Object?>> _projectSnapshot(int projectId) async {
    final project = await (db.select(db.projects)..where((tbl) => tbl.id.equals(projectId))).getSingle();
    final buyers = await (db.select(db.buyers)..where((tbl) => tbl.projectId.equals(projectId))).get();
    final tokens = await (db.select(db.tokens)..where((tbl) => tbl.projectId.equals(projectId))).get();
    final plots = await (db.select(db.plots)..where((tbl) => tbl.projectId.equals(projectId))).get();
    final eoi = await (db.select(db.eoiForms)..where((tbl) => tbl.projectId.equals(projectId))).get();
    final payments = await (db.select(db.paymentEntries)..where((tbl) => tbl.projectId.equals(projectId))).get();
    final history = await (db.select(db.plotHistory)..where((tbl) => tbl.projectId.equals(projectId))).get();
    return {
      'schemaVersion': db.schemaVersion,
      'exportedAt': DateTime.now().toIso8601String(),
      'project': project.toJson(),
      'buyers': buyers.map((row) => row.toJson()).toList(),
      'tokens': tokens.map((row) => row.toJson()).toList(),
      'plots': plots.map((row) => row.toJson()).toList(),
      'eoiForms': eoi.map((row) => row.toJson()).toList(),
      'payments': payments.map((row) => row.toJson()).toList(),
      'history': history.map((row) => row.toJson()).toList(),
    };
  }

  Future<File> _file(String projectName, String fileName) async {
    final base = await getApplicationDocumentsDirectory();
    final dir = Directory(p.join(base.path, 'exports', projectName.replaceAll(RegExp(r'[^a-zA-Z0-9_-]+'), '_')));
    if (!await dir.exists()) await dir.create(recursive: true);
    return File(p.join(dir.path, fileName));
  }
}

class BackupValidationResult {
  const BackupValidationResult({required this.isValid, required this.message, this.file});

  final bool isValid;
  final String message;
  final File? file;
}
