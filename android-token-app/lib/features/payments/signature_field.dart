import 'dart:io';
import 'dart:typed_data';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:path/path.dart' as p;
import 'package:signature/signature.dart';

import '../../shared/app_file_storage.dart';

class SignatureField extends StatefulWidget {
  const SignatureField({super.key, required this.label, required this.onSaved});

  final String label;
  final ValueChanged<String?> onSaved;

  @override
  State<SignatureField> createState() => _SignatureFieldState();
}

class _SignatureFieldState extends State<SignatureField> {
  final _controller =
      SignatureController(penStrokeWidth: 2.5, penColor: Colors.black);
  String? _path;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(widget.label, style: Theme.of(context).textTheme.titleSmall),
            const SizedBox(height: 8),
            Container(
              height: 140,
              decoration: BoxDecoration(
                  border: Border.all(color: Colors.black26),
                  color: Colors.white),
              child: Signature(
                  controller: _controller, backgroundColor: Colors.white),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: [
                OutlinedButton.icon(
                    onPressed: _saveDrawn,
                    icon: const Icon(Icons.save),
                    label: const Text('Use Drawn')),
                OutlinedButton.icon(
                    onPressed: _upload,
                    icon: const Icon(Icons.upload_file),
                    label: const Text('Upload')),
                TextButton(
                    onPressed: _controller.clear, child: const Text('Clear')),
              ],
            ),
            if (_path != null) Text('Saved: ${p.basename(_path!)}'),
          ],
        ),
      ),
    );
  }

  Future<void> _saveDrawn() async {
    if (_controller.isEmpty) return;
    final bytes = await _controller.toPngBytes();
    if (bytes == null) return;
    final path = await _writeSignature(bytes);
    setState(() => _path = path);
    widget.onSaved(path);
  }

  Future<void> _upload() async {
    final picked = await FilePicker.platform
        .pickFiles(type: FileType.image, allowMultiple: false);
    final source = picked?.files.single.path;
    if (source == null) return;
    final bytes = await File(source).readAsBytes();
    final path = await _writeSignature(bytes);
    setState(() => _path = path);
    widget.onSaved(path);
  }

  Future<String> _writeSignature(Uint8List bytes) async {
    final file = await appWritableFile(
      directoryPath: 'signatures',
      fileName: 'signature_${DateTime.now().microsecondsSinceEpoch}.png',
    );
    await file.writeAsBytes(bytes, flush: true);
    return file.path;
  }
}
