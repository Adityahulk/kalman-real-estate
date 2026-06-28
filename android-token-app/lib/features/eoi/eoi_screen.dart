import 'package:collection/collection.dart';
import 'package:drift/drift.dart' hide Column;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:printing/printing.dart';

import '../../data/app_database.dart';
import '../../data/providers.dart';
import '../exports/document_service.dart';

class EoiScreen extends ConsumerStatefulWidget {
  const EoiScreen({super.key, required this.projectId, required this.plotId});

  final int projectId;
  final int plotId;

  @override
  ConsumerState<EoiScreen> createState() => _EoiScreenState();
}

class _EoiScreenState extends ConsumerState<EoiScreen> {
  final _buyerName = TextEditingController();
  final _guardian = TextEditingController();
  final _address = TextEditingController();
  final _contact = TextEditingController();
  final _cp = TextEditingController();
  final _area = TextEditingController();
  final _rate = TextEditingController();
  final _total = TextEditingController();
  final _ifms = TextEditingController();
  final _idc = TextEditingController();
  final _club = TextEditingController(text: 'NA');
  final _notes = TextEditingController(text: defaultEoiNotes);
  bool _loaded = false;

  @override
  void dispose() {
    for (final controller in [_buyerName, _guardian, _address, _contact, _cp, _area, _rate, _total, _ifms, _idc, _club, _notes]) {
      controller.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final project = ref.watch(projectProvider(widget.projectId)).valueOrNull;
    final plots = ref.watch(plotsProvider(widget.projectId)).valueOrNull ?? const <Plot>[];
    final buyers = ref.watch(buyersProvider(widget.projectId)).valueOrNull ?? const <Buyer>[];
    final plot = plots.firstWhereOrNull((item) => item.id == widget.plotId);
    final buyer = buyers.firstWhereOrNull((item) => item.id == plot?.holderBuyerId);
    final launched = project?.launchStatus == ProjectStatus.launched;

    if (!_loaded && plot != null) {
      _loadExisting(plot, buyer);
    }

    return Scaffold(
      appBar: AppBar(
        title: Text('EOI · Plot ${plot?.plotNumber ?? ''}'),
        actions: [
          IconButton(
            tooltip: 'Generate PDF',
            onPressed: project == null || plot == null ? null : () => _generatePdf(project, plot),
            icon: const Icon(Icons.picture_as_pdf),
          ),
        ],
      ),
      body: plot == null
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(12),
              children: [
                _section('Plot Buyer Detail', [
                  _field(_buyerName, 'Name'),
                  _field(_guardian, 'S/O,D/O,W/O'),
                  _field(_address, 'Address', maxLines: 2),
                  _field(_contact, 'Contact no.', keyboardType: TextInputType.phone),
                  _field(_cp, 'C/O (CP/Broker/Property Dealer)'),
                ]),
                _section('Plot/SCO Detail ${launched ? '' : '(enabled after launch)'}', [
                  _readonlyField('Plot no.', plot.plotNumber),
                  _field(_area, 'Area sq. yds approx.', enabled: launched, keyboardType: TextInputType.number),
                  _field(_rate, 'Rate per sq yd', enabled: launched, keyboardType: TextInputType.number),
                  _field(_total, 'Total amount', enabled: launched, keyboardType: TextInputType.number),
                  _field(_ifms, 'IFMS charges', enabled: launched, keyboardType: TextInputType.number),
                  _field(_idc, 'IDC charges', enabled: launched, keyboardType: TextInputType.number),
                  _field(_club, 'Club membership', enabled: launched),
                ]),
                _section('Important Notes', [_field(_notes, 'Notes', maxLines: 5)]),
                const SizedBox(height: 8),
                FilledButton.icon(
                  onPressed: () => _save(plot, buyer, launched),
                  icon: const Icon(Icons.save),
                  label: const Text('Save EOI'),
                ),
              ],
            ),
    );
  }

  Future<void> _loadExisting(Plot plot, Buyer? buyer) async {
    _loaded = true;
    final db = ref.read(databaseProvider);
    final existing = await (db.select(db.eoiForms)..where((tbl) => tbl.plotId.equals(widget.plotId))).getSingleOrNull();
    final sourceBuyer = buyer;
    if (!mounted) return;
    setState(() {
      _buyerName.text = existing?.buyerName ?? sourceBuyer?.name ?? '';
      _guardian.text = existing?.guardianName ?? sourceBuyer?.guardianName ?? '';
      _address.text = existing?.address ?? sourceBuyer?.address ?? '';
      _contact.text = existing?.contactNo ?? sourceBuyer?.phone ?? '';
      _cp.text = existing?.channelPartner ?? sourceBuyer?.channelPartner ?? plot.channelPartner ?? '';
      _area.text = (existing?.areaSqYards ?? plot.areaSqYards)?.toString() ?? '';
      _rate.text = existing?.ratePerSqYard?.toString() ?? '';
      _total.text = existing?.totalAmount?.toString() ?? '';
      _ifms.text = existing?.ifmsCharges?.toString() ?? '';
      _idc.text = existing?.idcCharges?.toString() ?? '';
      _club.text = existing?.clubMembership ?? 'NA';
      _notes.text = existing?.notes ?? defaultEoiNotes;
    });
  }

  Future<void> _save(Plot plot, Buyer? buyer, bool launched) async {
    await ref.read(databaseProvider).upsertEoi(
          EoiFormsCompanion.insert(
            projectId: widget.projectId,
            plotId: widget.plotId,
            buyerId: Value(buyer?.id),
            buyerName: Value(_buyerName.text.trim()),
            guardianName: Value(_guardian.text.trim()),
            address: Value(_address.text.trim()),
            contactNo: Value(_contact.text.trim()),
            channelPartner: Value(_cp.text.trim()),
            plotNumber: Value(plot.plotNumber),
            areaSqYards: Value(double.tryParse(_area.text)),
            ratePerSqYard: Value(double.tryParse(_rate.text)),
            totalAmount: Value(double.tryParse(_total.text)),
            ifmsCharges: Value(double.tryParse(_ifms.text)),
            idcCharges: Value(double.tryParse(_idc.text)),
            clubMembership: Value(_club.text.trim()),
            notes: Value(_notes.text.trim()),
            plotDetailsEnabled: Value(launched),
            updatedAt: Value(DateTime.now()),
          ),
        );
    if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('EOI saved.')));
  }

  Future<void> _generatePdf(Project project, Plot plot) async {
    final db = ref.read(databaseProvider);
    final form = await (db.select(db.eoiForms)..where((tbl) => tbl.plotId.equals(widget.plotId))).getSingleOrNull();
    if (form == null) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Save EOI before generating PDF.')));
      return;
    }
    final schedules = await (db.select(db.paymentSchedules)..where((tbl) => tbl.plotId.equals(widget.plotId))).get();
    final file = await DocumentService().writeEoiPdf(project: project, plot: plot, form: form, schedules: schedules);
    await Printing.sharePdf(bytes: await file.readAsBytes(), filename: file.path.split('/').last);
  }

  Widget _section(String title, List<Widget> children) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(title, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 10),
            ...children,
          ],
        ),
      ),
    );
  }

  Widget _field(TextEditingController controller, String label, {bool enabled = true, int maxLines = 1, TextInputType? keyboardType}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: TextField(
        controller: controller,
        enabled: enabled,
        maxLines: maxLines,
        keyboardType: keyboardType,
        decoration: InputDecoration(labelText: label),
      ),
    );
  }

  Widget _readonlyField(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: InputDecorator(
        decoration: InputDecoration(labelText: label),
        child: Text(value),
      ),
    );
  }
}
