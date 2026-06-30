import 'package:collection/collection.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:printing/printing.dart';

import '../../data/app_database.dart';
import '../../data/providers.dart';
import '../../shared/formatters.dart';
import '../exports/document_service.dart';
import 'signature_field.dart';

class PaymentScreen extends ConsumerStatefulWidget {
  const PaymentScreen({super.key, required this.projectId, required this.plotId});

  final int projectId;
  final int plotId;

  @override
  ConsumerState<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends ConsumerState<PaymentScreen> {
  final _amount = TextEditingController();
  final _note = TextEditingController();
  DateTime _date = DateTime.now();
  String _type = PaymentType.booking;
  String _stage = PaymentStage.booking;
  String? _holderSignature;
  String? _authorizedSignature;

  @override
  void dispose() {
    _amount.dispose();
    _note.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final project = ref.watch(projectProvider(widget.projectId)).valueOrNull;
    final plot = (ref.watch(plotsProvider(widget.projectId)).valueOrNull ?? const <Plot>[]).firstWhereOrNull((item) => item.id == widget.plotId);
    return Scaffold(
      appBar: AppBar(title: Text('Payment · Plot ${plot?.plotNumber ?? ''}')),
      body: plot == null
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(12),
              children: [
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text('Payment Acknowledgement', style: Theme.of(context).textTheme.titleMedium),
                        const SizedBox(height: 10),
                        Text('Plot/SCO/Unit No. ${plot.plotNumber}'),
                        const SizedBox(height: 10),
                        OutlinedButton.icon(
                          onPressed: _pickDate,
                          icon: const Icon(Icons.calendar_today),
                          label: Text(shortDate(_date)),
                        ),
                        const SizedBox(height: 10),
                        TextField(
                          controller: _amount,
                          keyboardType: TextInputType.number,
                          decoration: const InputDecoration(labelText: 'Amount'),
                        ),
                        const SizedBox(height: 10),
                        DropdownButtonFormField<String>(
                          initialValue: _type,
                          decoration: const InputDecoration(labelText: 'Payment type'),
                          items: const [
                            DropdownMenuItem(value: PaymentType.booking, child: Text('Booking')),
                            DropdownMenuItem(value: PaymentType.installment, child: Text('Installment')),
                            DropdownMenuItem(value: PaymentType.adjustment, child: Text('Adjustment')),
                            DropdownMenuItem(value: PaymentType.refund, child: Text('Refund')),
                          ],
                          onChanged: (value) => setState(() {
                            _type = value ?? PaymentType.booking;
                            _stage = _defaultStageForType(_type);
                          }),
                        ),
                        const SizedBox(height: 10),
                        DropdownButtonFormField<String>(
                          value: _stage,
                          decoration: const InputDecoration(labelText: 'Payment stage'),
                          items: PaymentStage.all
                              .map((stage) => DropdownMenuItem(value: stage, child: Text(PaymentStage.label(stage))))
                              .toList(),
                          onChanged: (value) => setState(() {
                            _stage = value ?? PaymentStage.booking;
                            _type = _defaultTypeForStage(_stage);
                          }),
                        ),
                        const SizedBox(height: 10),
                        TextField(
                          controller: _note,
                          decoration: const InputDecoration(labelText: 'Note optional'),
                        ),
                      ],
                    ),
                  ),
                ),
                SignatureField(label: 'Plot Holder/CP Signature', onSaved: (path) => _holderSignature = path),
                const SizedBox(height: 12),
                SignatureField(label: 'Authorized Signature', onSaved: (path) => _authorizedSignature = path),
                const SizedBox(height: 12),
                FilledButton.icon(
                  onPressed: project == null ? null : () => _save(project, plot),
                  icon: const Icon(Icons.save),
                  label: const Text('Save Payment'),
                ),
              ],
            ),
    );
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      firstDate: DateTime(2020),
      lastDate: DateTime(2100),
      initialDate: _date,
    );
    if (picked != null) setState(() => _date = picked);
  }

  Future<void> _save(Project project, Plot plot) async {
    final amount = double.tryParse(_amount.text);
    if (amount == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Enter valid amount.')));
      return;
    }
    final id = await ref.read(databaseProvider).addPayment(
          projectId: widget.projectId,
          plotId: widget.plotId,
          buyerId: plot.holderBuyerId,
          tokenId: plot.assignedTokenId,
          date: _date,
          amount: amount,
          amountInWords: amountInWords(amount.round()),
          paymentType: _type,
          paymentStage: _stage,
          holderSignaturePath: _holderSignature,
          authorizedSignaturePath: _authorizedSignature,
          note: _note.text.trim(),
        );
    final db = ref.read(databaseProvider);
    final payment = await (db.select(db.paymentEntries)..where((tbl) => tbl.id.equals(id))).getSingle();
    final file = await DocumentService().writePaymentPdf(project: project, plot: plot, payment: payment);
    await Printing.sharePdf(bytes: await file.readAsBytes(), filename: file.path.split('/').last);
    if (mounted) Navigator.pop(context);
  }

  String _defaultStageForType(String type) {
    return switch (type) {
      PaymentType.booking => PaymentStage.booking,
      PaymentType.installment => PaymentStage.installment1,
      PaymentType.adjustment => PaymentStage.adjustment,
      PaymentType.refund => PaymentStage.refund,
      _ => PaymentStage.booking,
    };
  }

  String _defaultTypeForStage(String stage) {
    return switch (stage) {
      PaymentStage.token => PaymentType.token,
      PaymentStage.booking => PaymentType.booking,
      PaymentStage.adjustment => PaymentType.adjustment,
      PaymentStage.refund => PaymentType.refund,
      _ => PaymentType.installment,
    };
  }
}
