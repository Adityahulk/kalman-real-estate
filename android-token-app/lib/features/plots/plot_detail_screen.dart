import 'package:collection/collection.dart';
import 'package:drift/drift.dart' hide Column;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../data/app_database.dart';
import '../../data/providers.dart';
import '../../shared/async_value_view.dart';
import '../../shared/formatters.dart';

class PlotDetailScreen extends ConsumerWidget {
  const PlotDetailScreen({super.key, required this.projectId, required this.plotId});

  final int projectId;
  final int plotId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final plots = ref.watch(plotsProvider(projectId));
    final buyers = ref.watch(buyersProvider(projectId));
    final tokens = ref.watch(tokensProvider(projectId));
    final payments = ref.watch(plotPaymentsProvider(plotId));
    final history = ref.watch(plotHistoryProvider(plotId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Plot Detail'),
        actions: [
          IconButton(
            tooltip: 'EOI',
            onPressed: () => context.go('/projects/$projectId/plots/$plotId/eoi'),
            icon: const Icon(Icons.description),
          ),
          IconButton(
            tooltip: 'Add payment',
            onPressed: () => context.go('/projects/$projectId/plots/$plotId/payment'),
            icon: const Icon(Icons.payments),
          ),
        ],
      ),
      body: AsyncValueView(
        value: plots,
        builder: (plotRows) {
          final plot = plotRows.where((item) => item.id == plotId).firstOrNull;
          if (plot == null) return const Center(child: Text('Plot not found.'));
          return AsyncValueView(
            value: buyers,
            builder: (buyerRows) => AsyncValueView(
              value: tokens,
              builder: (tokenRows) {
                final holder = buyerRows.where((item) => item.id == plot.holderBuyerId).firstOrNull;
                final token = tokenRows.where((item) => item.id == plot.assignedTokenId).firstOrNull;
                return ListView(
                  padding: const EdgeInsets.only(bottom: 24),
                  children: [
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Plot ${plot.plotNumber}', style: Theme.of(context).textTheme.headlineSmall),
                            const SizedBox(height: 8),
                            Text('Status: ${plot.status}'),
                            Text('Area: ${plot.areaSqYards == null ? 'Not set' : '${plot.areaSqYards} sq yd'}'),
                            Text('Holder: ${holder?.name ?? 'Not assigned'}'),
                            Text('Channel partner: ${plot.channelPartner ?? holder?.channelPartner ?? '-'}'),
                            Text('Token: ${token?.tokenCode ?? '-'}${token == null ? '' : ' · ${money(token.amount)}'}'),
                            const SizedBox(height: 12),
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: [
                                OutlinedButton.icon(
                                  onPressed: () => _editPlotArea(context, ref, plot),
                                  icon: const Icon(Icons.square_foot),
                                  label: const Text('Edit Area'),
                                ),
                                OutlinedButton.icon(
                                  onPressed: () => _assignDialog(context, ref, buyerRows, tokenRows),
                                  icon: const Icon(Icons.assignment_ind),
                                  label: Text(holder == null ? 'Assign' : 'Reassign'),
                                ),
                                OutlinedButton.icon(
                                  onPressed: holder == null ? null : () => _cancelDialog(context, ref, plot, plotRows),
                                  icon: const Icon(Icons.cancel),
                                  label: const Text('Cancel'),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                    _Section(
                      title: 'Payments',
                      child: AsyncValueView(
                        value: payments,
                        builder: (rows) => rows.isEmpty
                            ? const ListTile(title: Text('No payments yet.'))
                            : Column(
                                children: rows
                                    .map(
                                      (payment) => ListTile(
                                        title: Text('${money(payment.amount)} · ${payment.paymentType}'),
                                        subtitle: Text('${shortDate(payment.date)}${payment.note == null ? '' : ' · ${payment.note}'}'),
                                      ),
                                    )
                                    .toList(),
                              ),
                      ),
                    ),
                    _Section(
                      title: 'History',
                      child: AsyncValueView(
                        value: history,
                        builder: (rows) => rows.isEmpty
                            ? const ListTile(title: Text('No history yet.'))
                            : Column(
                                children: rows
                                    .map(
                                      (item) => ListTile(
                                        title: Text(item.actionType),
                                        subtitle: Text('${shortDate(item.createdAt)}${item.note == null ? '' : ' · ${item.note}'}'),
                                      ),
                                    )
                                    .toList(),
                              ),
                      ),
                    ),
                  ],
                );
              },
            ),
          );
        },
      ),
    );
  }

  Future<void> _editPlotArea(BuildContext context, WidgetRef ref, Plot plot) async {
    final controller = TextEditingController(text: plot.areaSqYards?.toString() ?? '');
    final area = await showDialog<double>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Edit Area'),
        content: TextField(
          controller: controller,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(labelText: 'Area in sq yards'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(context, double.tryParse(controller.text)), child: const Text('Save')),
        ],
      ),
    );
    controller.dispose();
    if (area == null) return;
    await (ref.read(databaseProvider).update(ref.read(databaseProvider).plots)..where((tbl) => tbl.id.equals(plot.id))).write(
      PlotsCompanion(areaSqYards: Value(area), updatedAt: Value(DateTime.now())),
    );
  }

  Future<void> _assignDialog(BuildContext context, WidgetRef ref, List<Buyer> buyers, List<Token> tokens) async {
    final activeTokens = tokens.where((token) => token.status == TokenStatus.active).toList();
    int? buyerId = buyers.firstOrNull?.id;
    int? tokenId = activeTokens.firstOrNull?.id;
    final result = await showDialog<({int buyerId, int tokenId})>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) {
          final buyerTokens = activeTokens.where((token) => token.buyerId == buyerId).toList();
          if (buyerTokens.isNotEmpty && !buyerTokens.any((token) => token.id == tokenId)) tokenId = buyerTokens.first.id;
          return AlertDialog(
            title: const Text('Assign Plot'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                DropdownButtonFormField<int>(
                  initialValue: buyerId,
                  decoration: const InputDecoration(labelText: 'Buyer'),
                  items: buyers.map((buyer) => DropdownMenuItem(value: buyer.id, child: Text(buyer.name))).toList(),
                  onChanged: (value) => setDialogState(() => buyerId = value),
                ),
                const SizedBox(height: 10),
                DropdownButtonFormField<int>(
                  initialValue: tokenId,
                  decoration: const InputDecoration(labelText: 'Token'),
                  items: buyerTokens
                      .map((token) => DropdownMenuItem(value: token.id, child: Text('${token.tokenCode} · ${money(token.amount)}')))
                      .toList(),
                  onChanged: (value) => setDialogState(() => tokenId = value),
                ),
              ],
            ),
            actions: [
              TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
              FilledButton(
                onPressed: buyerId == null || tokenId == null ? null : () => Navigator.pop(context, (buyerId: buyerId!, tokenId: tokenId!)),
                child: const Text('Save'),
              ),
            ],
          );
        },
      ),
    );
    if (result == null) return;
    await ref.read(databaseProvider).assignPlotManually(
          projectId: projectId,
          plotId: plotId,
          buyerId: result.buyerId,
          tokenId: result.tokenId,
        );
  }

  Future<void> _cancelDialog(BuildContext context, WidgetRef ref, Plot plot, List<Plot> allPlots) async {
    final otherPlots = allPlots.where((item) => item.id != plot.id && item.holderBuyerId == plot.holderBuyerId).toList();
    final token = await (ref.read(databaseProvider).select(ref.read(databaseProvider).tokens)..where((tbl) => tbl.id.equals(plot.assignedTokenId!))).getSingle();
    if (!context.mounted) return;
    final controllers = {
      for (final item in otherPlots) item.id: TextEditingController(text: otherPlots.isEmpty ? '' : (token.amount / otherPlots.length).toStringAsFixed(0)),
    };
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cancel Assignment'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Token amount: ${money(token.amount)}'),
              const SizedBox(height: 10),
              if (otherPlots.isEmpty)
                const Text('Buyer has no other assigned plots. Amount will be marked as refund/credit due.')
              else
                ...otherPlots.map(
                  (item) => Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: TextField(
                      controller: controllers[item.id],
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(labelText: 'Redistribute to plot ${item.plotNumber}'),
                    ),
                  ),
                ),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Confirm')),
        ],
      ),
    );
    if (confirmed != true) return;
    final distribution = {
      for (final entry in controllers.entries) entry.key: double.tryParse(entry.value.text) ?? 0,
    };
    for (final controller in controllers.values) {
      controller.dispose();
    }
    await ref.read(databaseProvider).cancelPlotAssignment(
          projectId: projectId,
          plotId: plot.id,
          redistributionByPlotId: distribution,
        );
  }
}

class _Section extends StatelessWidget {
  const _Section({required this.title, required this.child});

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 4),
            child: Text(title, style: Theme.of(context).textTheme.titleMedium),
          ),
          child,
        ],
      ),
    );
  }
}
