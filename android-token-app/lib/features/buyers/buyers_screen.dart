import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/providers.dart';
import '../../shared/async_value_view.dart';
import '../../shared/formatters.dart';

class BuyersScreen extends ConsumerStatefulWidget {
  const BuyersScreen({super.key, required this.projectId});

  final int projectId;

  @override
  ConsumerState<BuyersScreen> createState() => _BuyersScreenState();
}

class _BuyersScreenState extends ConsumerState<BuyersScreen> {
  final _search = TextEditingController();

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final buyers = ref.watch(buyersProvider(widget.projectId));
    final tokens = ref.watch(tokensProvider(widget.projectId));
    return Scaffold(
      appBar: AppBar(title: const Text('Buyers & Tokens')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openBuyerDialog(context),
        icon: const Icon(Icons.add),
        label: const Text('Buyer'),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: TextField(
              controller: _search,
              decoration: const InputDecoration(
                prefixIcon: Icon(Icons.search),
                labelText: 'Search name, phone, CP, token',
              ),
              onChanged: (_) => setState(() {}),
            ),
          ),
          Expanded(
            child: AsyncValueView(
              value: buyers,
              builder: (buyerRows) => AsyncValueView(
                value: tokens,
                builder: (tokenRows) {
                  final query = _search.text.trim().toLowerCase();
                  final visible = buyerRows.where((buyer) {
                    final buyerTokens = tokenRows.where((token) => token.buyerId == buyer.id).toList();
                    final haystack = [
                      buyer.name,
                      buyer.phone ?? '',
                      buyer.channelPartner,
                      ...buyerTokens.map((token) => token.tokenCode),
                    ].join(' ').toLowerCase();
                    return query.isEmpty || haystack.contains(query);
                  }).toList();
                  if (visible.isEmpty) return const Center(child: Text('No buyers found.'));
                  return ListView.builder(
                    itemCount: visible.length,
                    itemBuilder: (context, index) {
                      final buyer = visible[index];
                      final buyerTokens = tokenRows.where((token) => token.buyerId == buyer.id).toList();
                      return Card(
                        child: ListTile(
                          title: Text(buyer.name),
                          subtitle: Text(
                            '${buyer.channelPartner}${buyer.phone == null ? '' : ' · ${buyer.phone}'}\n'
                            '${buyerTokens.length} token(s) · ${money(buyerTokens.fold<double>(0, (sum, token) => sum + token.amount))}',
                          ),
                          isThreeLine: true,
                          trailing: IconButton(
                            tooltip: 'Add token',
                            icon: const Icon(Icons.add_card),
                            onPressed: () => _openTokenDialog(context, buyer.id),
                          ),
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

  Future<void> _openBuyerDialog(BuildContext context) async {
    final result = await showDialog<_BuyerInput>(
      context: context,
      builder: (context) => const _BuyerDialog(),
    );
    if (result == null) return;
    await ref.read(databaseProvider).createBuyerWithToken(
          projectId: widget.projectId,
          name: result.name,
          channelPartner: result.channelPartner,
          tokenCode: result.tokenCode,
          amount: result.amount,
          phone: result.phone,
          guardianName: result.guardianName,
          address: result.address,
          amountInWords: amountInWords(result.amount.round()),
        );
  }

  Future<void> _openTokenDialog(BuildContext context, int buyerId) async {
    final result = await showDialog<_TokenInput>(
      context: context,
      builder: (context) => const _TokenDialog(),
    );
    if (result == null) return;
    await ref.read(databaseProvider).addTokenForBuyer(
          projectId: widget.projectId,
          buyerId: buyerId,
          tokenCode: result.tokenCode,
          amount: result.amount,
          amountInWords: amountInWords(result.amount.round()),
        );
  }
}

class _BuyerDialog extends StatefulWidget {
  const _BuyerDialog();

  @override
  State<_BuyerDialog> createState() => _BuyerDialogState();
}

class _BuyerDialogState extends State<_BuyerDialog> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _guardian = TextEditingController();
  final _address = TextEditingController();
  final _phone = TextEditingController();
  final _cp = TextEditingController();
  final _token = TextEditingController();
  final _amount = TextEditingController();

  @override
  void dispose() {
    _name.dispose();
    _guardian.dispose();
    _address.dispose();
    _phone.dispose();
    _cp.dispose();
    _token.dispose();
    _amount.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Add Buyer & Token'),
      content: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              _requiredText(_name, 'Name'),
              _optionalText(_guardian, 'S/O, D/O, W/O'),
              _optionalText(_address, 'Address'),
              _optionalText(_phone, 'Phone optional', keyboardType: TextInputType.phone),
              _requiredText(_cp, 'Channel partner'),
              _requiredText(_token, 'Token code'),
              _requiredText(_amount, 'Token amount', keyboardType: TextInputType.number),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
        FilledButton(
          onPressed: () {
            if (!_formKey.currentState!.validate()) return;
            Navigator.pop(
              context,
              _BuyerInput(
                name: _name.text,
                guardianName: _guardian.text,
                address: _address.text,
                phone: _phone.text,
                channelPartner: _cp.text,
                tokenCode: _token.text,
                amount: double.parse(_amount.text),
              ),
            );
          },
          child: const Text('Save'),
        ),
      ],
    );
  }
}

class _TokenDialog extends StatefulWidget {
  const _TokenDialog();

  @override
  State<_TokenDialog> createState() => _TokenDialogState();
}

class _TokenDialogState extends State<_TokenDialog> {
  final _formKey = GlobalKey<FormState>();
  final _token = TextEditingController();
  final _amount = TextEditingController();

  @override
  void dispose() {
    _token.dispose();
    _amount.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Add Token'),
      content: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _requiredText(_token, 'Token code'),
            _requiredText(_amount, 'Amount', keyboardType: TextInputType.number),
          ],
        ),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
        FilledButton(
          onPressed: () {
            if (!_formKey.currentState!.validate()) return;
            Navigator.pop(context, _TokenInput(tokenCode: _token.text, amount: double.parse(_amount.text)));
          },
          child: const Text('Save'),
        ),
      ],
    );
  }
}

Widget _requiredText(TextEditingController controller, String label, {TextInputType? keyboardType}) {
  return Padding(
    padding: const EdgeInsets.only(bottom: 10),
    child: TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      decoration: InputDecoration(labelText: label),
      validator: (value) => value == null || value.trim().isEmpty ? 'Required' : null,
    ),
  );
}

Widget _optionalText(TextEditingController controller, String label, {TextInputType? keyboardType}) {
  return Padding(
    padding: const EdgeInsets.only(bottom: 10),
    child: TextFormField(controller: controller, keyboardType: keyboardType, decoration: InputDecoration(labelText: label)),
  );
}

class _BuyerInput {
  const _BuyerInput({
    required this.name,
    required this.guardianName,
    required this.address,
    required this.phone,
    required this.channelPartner,
    required this.tokenCode,
    required this.amount,
  });

  final String name;
  final String guardianName;
  final String address;
  final String phone;
  final String channelPartner;
  final String tokenCode;
  final double amount;
}

class _TokenInput {
  const _TokenInput({required this.tokenCode, required this.amount});

  final String tokenCode;
  final double amount;
}
