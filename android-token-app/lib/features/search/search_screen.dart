import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';

import '../../data/app_database.dart';
import '../../data/providers.dart';
import '../../shared/async_value_view.dart';
import '../../shared/formatters.dart';
import 'search_models.dart';
import 'search_report_service.dart';
import 'search_service.dart';

class SearchScreen extends ConsumerStatefulWidget {
  const SearchScreen({super.key, required this.projectId});

  final int projectId;

  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends ConsumerState<SearchScreen> {
  final _plot = TextEditingController();
  final _customer = TextEditingController();
  final _channelPartner = TextEditingController();
  final _areaMin = TextEditingController();
  final _areaMax = TextEditingController();
  final _rateMin = TextEditingController();
  final _rateMax = TextEditingController();

  SearchPaymentStatus _paymentStatus = SearchPaymentStatus.any;
  Set<String> _paymentStages = {};
  late Future<List<SearchResult>> _resultsFuture;

  @override
  void initState() {
    super.initState();
    _resultsFuture = Future.value(const []);
    WidgetsBinding.instance.addPostFrameCallback((_) => _runSearch());
  }

  @override
  void dispose() {
    for (final controller in [
      _plot,
      _customer,
      _channelPartner,
      _areaMin,
      _areaMax,
      _rateMin,
      _rateMax
    ]) {
      controller.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final projectValue = ref.watch(projectProvider(widget.projectId));
    return Scaffold(
      appBar: AppBar(title: const Text('Search & Reports')),
      body: AsyncValueView(
        value: projectValue,
        builder: (project) {
          if (project == null) {
            return const Center(child: Text('Project not found.'));
          }
          return FutureBuilder<List<SearchResult>>(
            future: _resultsFuture,
            builder: (context, snapshot) {
              final results = snapshot.data ?? const <SearchResult>[];
              final loading =
                  snapshot.connectionState == ConnectionState.waiting;
              return ListView(
                padding: const EdgeInsets.fromLTRB(12, 12, 12, 24),
                children: [
                  _filtersCard(),
                  const SizedBox(height: 8),
                  _exportRow(project, results, loading),
                  const SizedBox(height: 8),
                  Text('${results.length} result(s)',
                      style: Theme.of(context).textTheme.titleMedium),
                  if (loading)
                    const Padding(
                      padding: EdgeInsets.all(24),
                      child: Center(child: CircularProgressIndicator()),
                    )
                  else if (results.isEmpty)
                    const Padding(
                      padding: EdgeInsets.all(24),
                      child: Center(child: Text('No matching plots found.')),
                    )
                  else
                    ...results.map(_resultCard),
                ],
              );
            },
          );
        },
      ),
    );
  }

  Widget _filtersCard() {
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Filters', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 10),
            _textField(_plot, 'Plot'),
            _textField(_customer, 'Customer name'),
            _textField(_channelPartner, 'Channel partner'),
            Row(
              children: [
                Expanded(
                    child: _textField(_areaMin, 'Area min',
                        keyboardType: TextInputType.number)),
                const SizedBox(width: 8),
                Expanded(
                    child: _textField(_areaMax, 'Area max',
                        keyboardType: TextInputType.number)),
              ],
            ),
            Row(
              children: [
                Expanded(
                    child: _textField(_rateMin, 'Rate min',
                        keyboardType: TextInputType.number)),
                const SizedBox(width: 8),
                Expanded(
                    child: _textField(_rateMax, 'Rate max',
                        keyboardType: TextInputType.number)),
              ],
            ),
            const SizedBox(height: 6),
            SegmentedButton<SearchPaymentStatus>(
              segments: const [
                ButtonSegment(
                    value: SearchPaymentStatus.any, label: Text('Any')),
                ButtonSegment(
                    value: SearchPaymentStatus.received,
                    label: Text('Received')),
                ButtonSegment(
                    value: SearchPaymentStatus.pending, label: Text('Pending')),
              ],
              selected: {_paymentStatus},
              onSelectionChanged: (value) =>
                  setState(() => _paymentStatus = value.single),
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final stage in PaymentStage.all)
                  FilterChip(
                    label: Text(PaymentStage.label(stage)),
                    selected: _paymentStages.contains(stage),
                    onSelected: (selected) {
                      setState(() {
                        _paymentStages = {..._paymentStages};
                        selected
                            ? _paymentStages.add(stage)
                            : _paymentStages.remove(stage);
                      });
                    },
                  ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: FilledButton.icon(
                    onPressed: _runSearch,
                    icon: const Icon(Icons.search),
                    label: const Text('Search'),
                  ),
                ),
                const SizedBox(width: 8),
                OutlinedButton.icon(
                  onPressed: _clear,
                  icon: const Icon(Icons.clear),
                  label: const Text('Clear'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _exportRow(Project project, List<SearchResult> results, bool loading) {
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            OutlinedButton.icon(
              onPressed: loading
                  ? null
                  : () => _export(project, results, _ExportKind.xlsx),
              icon: const Icon(Icons.table_view),
              label: const Text('XLSX'),
            ),
            OutlinedButton.icon(
              onPressed: loading
                  ? null
                  : () => _export(project, results, _ExportKind.csv),
              icon: const Icon(Icons.description),
              label: const Text('CSV'),
            ),
            OutlinedButton.icon(
              onPressed: loading
                  ? null
                  : () => _export(project, results, _ExportKind.pdf),
              icon: const Icon(Icons.picture_as_pdf),
              label: const Text('PDF'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _resultCard(SearchResult result) {
    return Card(
      child: ExpansionTile(
        title: Text('Plot ${result.plotNumber} · ${result.customerName}'),
        subtitle: Text(
            '${result.channelPartner}\nReceived ${money(result.totalReceived)} · Pending ${_moneyOrDash(result.totalPending)}'),
        childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
        children: [
          _detailRow(
              'Area',
              result.areaSqYards == null
                  ? '-'
                  : '${result.areaSqYards!.toStringAsFixed(2)} sq yd'),
          _detailRow('Rate', _moneyOrDash(result.ratePerSqYard)),
          _detailRow('Total', _moneyOrDash(result.totalAmount)),
          const Divider(),
          for (final stage in result.stageDetails.where((stage) =>
              _paymentStages.isEmpty || _paymentStages.contains(stage.stage)))
            _detailRow(
              stage.label,
              'Expected ${_moneyOrDash(stage.expected)} | Received ${money(stage.received)} | Pending ${_moneyOrDash(stage.pending)} | ${stage.statusLabel}',
            ),
        ],
      ),
    );
  }

  Widget _detailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
              width: 92,
              child: Text(label,
                  style: const TextStyle(fontWeight: FontWeight.w600))),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }

  Widget _textField(TextEditingController controller, String label,
      {TextInputType? keyboardType}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: TextField(
        controller: controller,
        keyboardType: keyboardType,
        decoration: InputDecoration(labelText: label),
        onSubmitted: (_) => _runSearch(),
      ),
    );
  }

  void _runSearch() {
    setState(() {
      _resultsFuture = SearchService(ref.read(databaseProvider))
          .searchProject(widget.projectId, _filters());
    });
  }

  void _clear() {
    for (final controller in [
      _plot,
      _customer,
      _channelPartner,
      _areaMin,
      _areaMax,
      _rateMin,
      _rateMax
    ]) {
      controller.clear();
    }
    setState(() {
      _paymentStatus = SearchPaymentStatus.any;
      _paymentStages = {};
    });
    _runSearch();
  }

  Future<void> _export(
      Project project, List<SearchResult> results, _ExportKind kind) async {
    final service = SearchReportService();
    final filters = _filters();
    final Uint8List bytes = switch (kind) {
      _ExportKind.xlsx => await service.buildXlsxBytes(
          project: project, filters: filters, results: results),
      _ExportKind.csv => service.buildCsvBytes(
          project: project, filters: filters, results: results),
      _ExportKind.pdf => await service.buildPdfBytes(
          project: project, filters: filters, results: results),
    };
    final extension = kind.name;
    await Share.shareXFiles([
      XFile.fromData(
        bytes,
        name: service.fileName(project.name, extension),
        mimeType: _mimeType(kind),
      ),
    ]);
  }

  String _mimeType(_ExportKind kind) {
    return switch (kind) {
      _ExportKind.xlsx =>
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      _ExportKind.csv => 'text/csv',
      _ExportKind.pdf => 'application/pdf',
    };
  }

  SearchFilters _filters() {
    return SearchFilters(
      plotQuery: _plot.text,
      customerQuery: _customer.text,
      channelPartnerQuery: _channelPartner.text,
      areaMin: double.tryParse(_areaMin.text),
      areaMax: double.tryParse(_areaMax.text),
      rateMin: double.tryParse(_rateMin.text),
      rateMax: double.tryParse(_rateMax.text),
      paymentStatus: _paymentStatus,
      paymentStages: _paymentStages,
    );
  }

  String _moneyOrDash(double? value) => value == null ? '-' : money(value);
}

enum _ExportKind { xlsx, csv, pdf }
