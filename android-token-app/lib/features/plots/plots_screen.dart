import 'package:collection/collection.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../data/providers.dart';
import '../../shared/async_value_view.dart';

class PlotsScreen extends ConsumerStatefulWidget {
  const PlotsScreen({super.key, required this.projectId});

  final int projectId;

  @override
  ConsumerState<PlotsScreen> createState() => _PlotsScreenState();
}

class _PlotsScreenState extends ConsumerState<PlotsScreen> {
  final _search = TextEditingController();

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final plots = ref.watch(plotsProvider(widget.projectId));
    final buyers = ref.watch(buyersProvider(widget.projectId));
    return Scaffold(
      appBar: AppBar(title: const Text('Plots')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showGenerateDialog(context),
        icon: const Icon(Icons.grid_on),
        label: const Text('Generate'),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: TextField(
              controller: _search,
              decoration: const InputDecoration(prefixIcon: Icon(Icons.search), labelText: 'Search plot or holder'),
              onChanged: (_) => setState(() {}),
            ),
          ),
          Expanded(
            child: AsyncValueView(
              value: plots,
              builder: (plotRows) => AsyncValueView(
                value: buyers,
                builder: (buyerRows) {
                  if (plotRows.isEmpty) return const Center(child: Text('Generate plots for this project.'));
                  final query = _search.text.trim().toLowerCase();
                  final visible = plotRows.where((plot) {
                    final buyer = buyerRows.where((item) => item.id == plot.holderBuyerId).firstOrNull;
                    final haystack = '${plot.plotNumber} ${buyer?.name ?? ''} ${plot.channelPartner ?? ''}'.toLowerCase();
                    return query.isEmpty || haystack.contains(query);
                  }).toList();
                  return ListView.builder(
                    itemCount: visible.length,
                    itemBuilder: (context, index) {
                      final plot = visible[index];
                      final buyer = buyerRows.where((item) => item.id == plot.holderBuyerId).firstOrNull;
                      return Card(
                        child: ListTile(
                          title: Text('Plot ${plot.plotNumber}'),
                          subtitle: Text(
                            '${plot.areaSqYards == null ? 'Area not set' : '${plot.areaSqYards} sq yd'} · ${plot.status}\n'
                            '${buyer?.name ?? 'No holder'}${plot.channelPartner == null ? '' : ' · ${plot.channelPartner}'}',
                          ),
                          isThreeLine: true,
                          trailing: const Icon(Icons.chevron_right),
                          onTap: () => context.go('/projects/${widget.projectId}/plots/${plot.id}'),
                        ),
                      );
                    },
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _showGenerateDialog(BuildContext context) async {
    final controller = TextEditingController();
    final count = await showDialog<int>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Generate Plots'),
        content: TextField(
          controller: controller,
          autofocus: true,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(labelText: 'Number of plots'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          FilledButton(
            onPressed: () => Navigator.pop(context, int.tryParse(controller.text)),
            child: const Text('Generate'),
          ),
        ],
      ),
    );
    controller.dispose();
    if (count == null) return;
    await ref.read(databaseProvider).generatePlots(widget.projectId, count);
  }
}
