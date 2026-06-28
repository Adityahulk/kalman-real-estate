import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../data/app_database.dart';
import '../../data/providers.dart';
import '../../shared/async_value_view.dart';
import '../../shared/formatters.dart';

class ProjectDashboardScreen extends ConsumerWidget {
  const ProjectDashboardScreen({super.key, required this.projectId});

  final int projectId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final project = ref.watch(projectProvider(projectId));
    final plots = ref.watch(plotsProvider(projectId));
    final tokens = ref.watch(tokensProvider(projectId));

    return Scaffold(
      appBar: AppBar(
        title: AsyncValueView(
          value: project,
          builder: (item) => Text(item?.name ?? 'Project'),
        ),
        actions: [
          IconButton(
            tooltip: 'Exports',
            onPressed: () => context.go('/projects/$projectId/exports'),
            icon: const Icon(Icons.ios_share),
          ),
        ],
      ),
      body: AsyncValueView(
        value: project,
        builder: (item) {
          if (item == null) return const Center(child: Text('Project not found.'));
          return ListView(
            padding: const EdgeInsets.only(bottom: 24),
            children: [
              Padding(
                padding: const EdgeInsets.all(12),
                child: Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _StatCard(label: 'Launch status', value: item.launchStatus),
                    AsyncValueView(
                      value: plots,
                      builder: (rows) => _StatCard(label: 'Plots', value: rows.length.toString()),
                    ),
                    AsyncValueView(
                      value: plots,
                      builder: (rows) => _StatCard(
                        label: 'Assigned',
                        value: rows.where((plot) => plot.holderBuyerId != null).length.toString(),
                      ),
                    ),
                    AsyncValueView(
                      value: tokens,
                      builder: (rows) => _StatCard(
                        label: 'Token collected',
                        value: money(rows.fold<double>(0, (sum, token) => sum + token.amount)),
                      ),
                    ),
                  ],
                ),
              ),
              if (item.launchStatus != ProjectStatus.launched)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  child: FilledButton.icon(
                    onPressed: () => ref.read(databaseProvider).setProjectLaunchStatus(projectId, ProjectStatus.launched),
                    icon: const Icon(Icons.flag),
                    label: const Text('Mark Project Launched'),
                  ),
                ),
              _NavTile(
                icon: Icons.person_add_alt,
                title: 'Buyers & Tokens',
                subtitle: 'Add buyer, channel partner, token code, and token amount',
                onTap: () => context.go('/projects/$projectId/buyers'),
              ),
              _NavTile(
                icon: Icons.grid_view,
                title: 'Plots',
                subtitle: 'Generate plots, edit plot area, open plot detail',
                onTap: () => context.go('/projects/$projectId/plots'),
              ),
              _NavTile(
                icon: Icons.shuffle,
                title: 'Draw',
                subtitle: 'Randomly assign active tokens to available plots',
                onTap: () => context.go('/projects/$projectId/draw'),
              ),
              _NavTile(
                icon: Icons.file_download,
                title: 'Backup & Export',
                subtitle: 'JSON backup, CSV, and PDFs',
                onTap: () => context.go('/projects/$projectId/exports'),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 170,
      child: Card(
        margin: EdgeInsets.zero,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: Theme.of(context).textTheme.labelMedium),
              const SizedBox(height: 6),
              Text(value, style: Theme.of(context).textTheme.titleLarge),
            ],
          ),
        ),
      ),
    );
  }
}

class _NavTile extends StatelessWidget {
  const _NavTile({required this.icon, required this.title, required this.subtitle, required this.onTap});

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        leading: Icon(icon),
        title: Text(title),
        subtitle: Text(subtitle),
        trailing: const Icon(Icons.chevron_right),
        onTap: onTap,
      ),
    );
  }
}
