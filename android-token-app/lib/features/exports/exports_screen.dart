import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';

import '../../data/providers.dart';
import 'export_service.dart';

class ExportsScreen extends ConsumerStatefulWidget {
  const ExportsScreen({super.key, required this.projectId});

  final int projectId;

  @override
  ConsumerState<ExportsScreen> createState() => _ExportsScreenState();
}

class _ExportsScreenState extends ConsumerState<ExportsScreen> {
  bool _busy = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Backup & Export')),
      body: ListView(
        children: [
          Card(
            child: ListTile(
              leading: const Icon(Icons.backup),
              title: const Text('JSON Backup'),
              subtitle: const Text('Complete project data for restore or safekeeping'),
              trailing: const Icon(Icons.ios_share),
              enabled: !_busy,
              onTap: _backup,
            ),
          ),
          Card(
            child: ListTile(
              leading: const Icon(Icons.table_view),
              title: const Text('CSV Export'),
              subtitle: const Text('Spreadsheet-friendly buyers, tokens, plots, payments, and history'),
              trailing: const Icon(Icons.ios_share),
              enabled: !_busy,
              onTap: _csv,
            ),
          ),
          Card(
            child: ListTile(
              leading: const Icon(Icons.restore_page),
              title: const Text('Validate Backup'),
              subtitle: const Text('Check schema, project name, and signature file references before restore'),
              trailing: const Icon(Icons.rule),
              enabled: !_busy,
              onTap: _validateBackup,
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _backup() async {
    await _run(() => ExportService(ref.read(databaseProvider)).writeProjectBackup(widget.projectId));
  }

  Future<void> _csv() async {
    await _run(() => ExportService(ref.read(databaseProvider)).writeCsvBundle(widget.projectId));
  }

  Future<void> _validateBackup() async {
    setState(() => _busy = true);
    try {
      final result = await ExportService(ref.read(databaseProvider)).pickAndValidateBackup();
      if (!mounted || result == null) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(result.message)));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _run(Future<dynamic> Function() action) async {
    setState(() => _busy = true);
    try {
      final file = await action();
      await Share.shareXFiles([XFile(file.path)]);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }
}
