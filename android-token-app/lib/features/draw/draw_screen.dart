import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/app_database.dart';
import '../../data/providers.dart';
import '../../shared/async_value_view.dart';

class DrawScreen extends ConsumerStatefulWidget {
  const DrawScreen({super.key, required this.projectId});

  final int projectId;

  @override
  ConsumerState<DrawScreen> createState() => _DrawScreenState();
}

class _DrawScreenState extends ConsumerState<DrawScreen> {
  List<DrawAssignment> _preview = const [];
  bool _busy = false;

  @override
  Widget build(BuildContext context) {
    final plots = ref.watch(plotsProvider(widget.projectId));
    final tokens = ref.watch(tokensProvider(widget.projectId));
    return Scaffold(
      appBar: AppBar(title: const Text('Draw')),
      body: ListView(
        padding: const EdgeInsets.only(bottom: 24),
        children: [
          AsyncValueView(
            value: plots,
            builder: (plotRows) => AsyncValueView(
              value: tokens,
              builder: (tokenRows) {
                final emptyPlots = plotRows.where((plot) => plot.status == PlotStatus.empty).length;
                final activeTokens = tokenRows.where((token) => token.status == TokenStatus.active).length;
                return Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Ready for draw', style: Theme.of(context).textTheme.titleMedium),
                        const SizedBox(height: 8),
                        Text('Available plots: $emptyPlots'),
                        Text('Active tokens: $activeTokens'),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            FilledButton.icon(
                              onPressed: _busy ? null : _generatePreview,
                              icon: const Icon(Icons.shuffle),
                              label: const Text('Generate Preview'),
                            ),
                            const SizedBox(width: 8),
                            OutlinedButton.icon(
                              onPressed: _busy || _preview.isEmpty ? null : _confirm,
                              icon: const Icon(Icons.check),
                              label: const Text('Confirm'),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
          if (_preview.isEmpty)
            const Padding(
              padding: EdgeInsets.all(24),
              child: Text('Generate a preview to see token-to-plot assignment before saving.'),
            )
          else
            ..._preview.map(
              (item) => Card(
                child: ListTile(
                  leading: const Icon(Icons.compare_arrows),
                  title: Text('Token ${item.tokenCode}'),
                  subtitle: Text('Assigned to plot ${item.plotNumber}'),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Future<void> _generatePreview() async {
    setState(() => _busy = true);
    try {
      final preview = await ref.read(databaseProvider).previewDraw(widget.projectId);
      setState(() => _preview = preview);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _confirm() async {
    setState(() => _busy = true);
    try {
      await ref.read(databaseProvider).confirmDraw(widget.projectId, _preview);
      setState(() => _preview = const []);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Draw assignment saved.')));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }
}
